"""Skill files and private sandbox artifacts with independent service authentication."""

import hashlib
import hmac
import io
import json
import logging
import mimetypes
import re
import uuid
import zipfile
from contextlib import contextmanager
from datetime import timedelta
from itertools import pairwise
from pathlib import PurePosixPath
from urllib.parse import quote

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.db.models import Q, Sum
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from astron_console.accounts.models import User
from astron_console.http import api_endpoint
from astron_console.spaces.models import Space
from astron_console.spaces.permissions import (
    ResourceScope,
    resolve_scope,
    scope_queryset,
    space_membership,
)
from astron_console.spaces.permissions import (
    identifier as scope_identifier,
)

from . import clients, storage
from .artifact_queries import exclude_public_artifacts
from .common import dump, filename, number, payload, save, text
from .models import Artifact, SkillFile, WorkflowIdentity
from .skill_packages import (
    MAX_SKILL_FILE_BYTES,
    MAX_SKILL_RESOURCES,
    SKILL_ENTRY_NAME,
    SkillPackages,
    is_skill_entry,
    validate_attachment_limits,
    validate_skill_file_size,
)

logger = logging.getLogger(__name__)
SKILL_EXTENSIONS = {
    "md",
    "txt",
    "json",
    "yaml",
    "yml",
    "toml",
    "ini",
    "cfg",
    "xml",
    "csv",
    "py",
    "js",
    "ts",
    "sh",
    "sql",
    "html",
    "css",
    "r",
    "rb",
    "go",
    "java",
    "c",
    "h",
    "cpp",
    "rs",
}


def skill_scope(request):
    scope = resolve_scope(request)
    if scope.space_id:
        space_membership(scope.uid, scope.space_id)
    return scope


def skill_entry(query, id):
    row = query.filter(pk=number(id)).first()
    if not row:
        raise Http404()
    return row


def parent_skill(query, id):
    parent = number(id, 0, minimum=0)
    if parent and skill_entry(query, parent).entry_type != "folder":
        raise ValidationError("父节点不是目录")
    return parent


def skill_siblings(query, parent):
    if not parent:
        return query.filter(Q(parent_id=0) | Q(parent_id__isnull=True))
    return query.filter(parent_id=parent)


def unique_skill(query, parent, name, exclude=None):
    query = skill_siblings(query, parent).filter(name=name)
    if exclude:
        query = query.exclude(pk=exclude)
    if query.exists():
        raise ValidationError("同一目录存在重名文件")


def skill_name(name):
    name = filename(name)
    if name.rsplit(".", 1)[-1].lower() not in SKILL_EXTENSIONS and name not in {
        "Dockerfile",
        "Makefile",
        ".gitignore",
    }:
        raise ValidationError("不支持的Skill文件类型")
    return name


def skill_content_bytes(content):
    if not isinstance(content, str):
        raise ValidationError("内容必须是文本")
    encoded = content.encode("utf-8")
    validate_skill_file_size(len(encoded))
    return encoded


def skill_content_text(value):
    validate_skill_file_size(len(value))
    try:
        return value.decode("utf-8")
    except UnicodeDecodeError:
        raise ValidationError("Skill文件不是UTF-8文本") from None


def read_skill(row):
    validate_skill_file_size(row.file_size or 0)
    return skill_content_text(storage.read(row.object_key))


def update_skill_metadata(row, content):
    row.skill_name = ""
    row.skill_description = ""
    if not is_skill_entry(row):
        return
    row.skill_name = "SKILL"
    front = re.match(r"\A---[ \t]*\r?\n(.*?)^---[ \t]*(?:\r?\n|\Z)", content, re.M | re.S)
    if front:
        for key, field in (("name", "skill_name"), ("description", "skill_description")):
            value = re.search(rf"^{key}:[ \t]*(.+)$", front[1], re.M)
            if value:
                setattr(row, field, value[1].strip(" \t\r\"'"))


def remove_skill_object(key):
    try:
        storage.remove(key)
    except clients.ResourceServiceError:
        logger.exception("Skill object cleanup failed key=%s", key)


@contextmanager
def skill_transaction(scope, query):
    new_keys = []
    try:
        with transaction.atomic():
            # Serialize mutations even when the scope has no Skill rows yet.
            if scope.space_id:
                Space.objects.select_for_update().only("pk").get(pk=scope.space_id)
            else:
                User.objects.select_for_update().only("pk").get(pk=scope.uid)
            before = SkillPackages(query.all()).attachment_usage()
            yield new_keys
            after = SkillPackages(query.all()).attachment_usage()
            for skill_id, (count, size) in after.items():
                # Existing oversized packages may be repaired in several edits.
                validate_attachment_limits(count, size, previous=before.get(skill_id, (0, 0)))
    except Exception:
        for key in new_keys:
            remove_skill_object(key)
        raise


def write_skill(row, content, new_keys):
    encoded = skill_content_bytes(content)
    update_skill_metadata(row, content)
    old = row.object_key
    scope = (
        "space-" + str(row.space_id)
        if row.space_id
        else "user-" + hashlib.sha256(row.uid.encode()).hexdigest()[:24]
    )
    key = "skill-files/" + scope + "/" + uuid.uuid4().hex + "/" + row.name
    new_keys.append(key)
    storage.put(key, io.BytesIO(encoded), len(encoded), "text/plain; charset=utf-8")
    row.object_key = key
    row.file_size = len(encoded)
    row.content_type = "text/plain; charset=utf-8"
    row.file_ext = row.name.rsplit(".", 1)[-1].lower()
    save(row)
    if old and old != key:
        transaction.on_commit(lambda: remove_skill_object(old))
    return row


def skill_dump(row, content=None):
    result = dump(row)
    result["skillEntry"] = is_skill_entry(row)
    if row.entry_type == "file":
        result["downloadUrl"] = storage.download(row.object_key, name=row.name)
        if content is not None:
            result["content"] = content
    else:
        result["children"] = []
    return result


def new_skill(query, scope, parent, name, new_keys, content=None):
    unique_skill(query, parent, name)
    row = SkillFile(
        uid=scope.uid,
        space_id=scope.space_id,
        parent_id=parent,
        name=name,
        entry_type="folder" if content is None else "file",
    )
    return save(row) if content is None else write_skill(row, content, new_keys)


def delete_skill(row, entries, seen=None):
    seen = seen or set()
    if row.pk in seen:
        raise ValidationError("目录关系无效")
    seen.add(row.pk)
    for child in entries:
        if child.parent_id == row.pk:
            delete_skill(child, entries, seen)
    row.deleted = True
    save(row)
    if row.object_key:
        key = row.object_key
        transaction.on_commit(lambda: remove_skill_object(key))


def skill_tree(entries, keyword=""):
    lookup = {r.pk: r for r in entries}
    included = {r.pk for r in entries if not keyword or keyword.lower() in (r.name or "").lower()}
    for identifier in list(included):
        parent = lookup[identifier].parent_id
        seen = set()
        while parent in lookup and parent not in seen:
            seen.add(parent)
            included.add(parent)
            parent = lookup[parent].parent_id
    nodes = {r.pk: skill_dump(r) for r in entries if r.pk in included}
    roots = []
    for r in entries:
        if r.pk not in nodes:
            continue
        if r.parent_id in nodes:
            nodes[r.parent_id].setdefault("children", []).append(nodes[r.pk])
        else:
            roots.append(nodes[r.pk])
    return roots


def importable_skills(entries, keyword):
    lookup = {row.pk: row for row in entries}
    packages = SkillPackages(entries)
    result = []
    for row in entries:
        if not is_skill_entry(row) or not row.object_key:
            continue
        if (
            keyword
            and keyword.lower()
            not in ((row.skill_name or "") + " " + (row.skill_description or "")).lower()
        ):
            continue
        result.append(
            {
                "id": row.pk,
                "parentId": row.parent_id,
                "folderName": lookup[row.parent_id].name if row.parent_id in lookup else "",
                "fileName": row.name,
                "name": row.skill_name or row.name,
                "description": row.skill_description or "",
                "downloadUrl": storage.download(row.object_key, name=row.name),
                "resources": [
                    {
                        "path": path,
                        "name": item.name,
                        "downloadUrl": storage.download(item.object_key, name=item.name),
                        "fileExt": item.file_ext or "",
                        "fileSize": item.file_size or 0,
                    }
                    for path, item in packages.resources(row)
                ],
                "updateTime": row.update_time,
            }
        )
    return result


def skill_upload_plan(request, directory):
    uploaded = request.FILES.getlist("files")
    if not uploaded or len(uploaded) > MAX_SKILL_RESOURCES:
        raise ValidationError("请选择1到100个文件")
    paths = [file.name for file in uploaded]
    if directory:
        paths = request.POST.getlist("paths")
        raw_paths = request.POST.get("pathsJson")
        if not raw_paths and len(paths) == 1 and paths[0].startswith("["):
            raw_paths = paths[0]
        if raw_paths:
            try:
                paths = json.loads(raw_paths)
            except ValueError:
                raise ValidationError("无效上传路径") from None
        if not isinstance(paths, list) or any(not isinstance(path, str) for path in paths):
            raise ValidationError("无效上传路径")
        if len(paths) != len(uploaded):
            raise ValidationError("路径与文件数量不一致")
    plan = {}
    for file, path in zip(uploaded, paths, strict=True):
        validate_skill_file_size(file.size)
        segments = path.split("/")
        parts = (*map(filename, segments[:-1]), skill_name(segments[-1]))
        if parts in plan:
            raise ValidationError("同一目录存在重名文件")
        skill_content_text(file.read(MAX_SKILL_FILE_BYTES + 1))
        file.seek(0)
        plan[parts] = file
    if any(following[: len(parts)] == parts for parts, following in pairwise(sorted(plan))):
        raise ValidationError("路径被文件占用")
    return plan


def upload_skill_files(query, scope, parent, plan, new_keys):
    result = []
    for parts, file in plan.items():
        directory_id = parent
        for folder in parts[:-1]:
            entry = skill_siblings(query, directory_id).filter(name=folder).first()
            if entry and entry.entry_type != "folder":
                raise ValidationError("路径被文件占用")
            if entry is None:
                entry = new_skill(query, scope, directory_id, folder, new_keys)
            directory_id = entry.pk
        content = skill_content_text(file.read(MAX_SKILL_FILE_BYTES + 1))
        row = new_skill(query, scope, directory_id, parts[-1], new_keys, content)
        result.append(skill_dump(row))
    return result


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@clients.service_errors
def skills(request, action="delete"):
    p = payload(request)
    scope = skill_scope(request)
    query = scope_queryset(SkillFile.objects.filter(deleted=False), scope)
    if action == "tree":
        return skill_tree(list(query.order_by("sort_order", "id")), p.get("keyword", ""))
    if action == "importable":
        return importable_skills(list(query.order_by("sort_order", "id")), p.get("keyword", ""))
    if request.method == "GET":
        if action != "content":
            raise ValidationError("修改需要POST、PUT或DELETE")
        row = skill_entry(query, p.get("id"))
        return skill_dump(row, read_skill(row) if row.entry_type == "file" else None)
    if action in ("upload", "upload-directory"):
        directory = action == "upload-directory"
        plan = skill_upload_plan(request, directory)
        with skill_transaction(scope, query) as new_keys:
            parent = parent_skill(query, p.get("parentId"))
            result = upload_skill_files(query, scope, parent, plan, new_keys)
            if directory:
                return {
                    "tree": skill_tree(list(query.order_by("sort_order", "id"))),
                    "uploadedNodes": result,
                    "skippedFiles": [],
                }
            return result
    with skill_transaction(scope, query) as new_keys:
        return mutate_skill(query, scope, p, action, new_keys)


def mutate_skill(query, scope, params, action, new_keys):
    if action in ("folder", "file"):
        parent = parent_skill(query, params.get("parentId"))
        if action == "folder":
            name = filename(params.get("name"))
            return skill_dump(new_skill(query, scope, parent, name, new_keys))
        name = skill_name(params.get("name"))
        content = params.get("content", "")
        return skill_dump(new_skill(query, scope, parent, name, new_keys, content), content)
    row = skill_entry(query, params.get("id"))
    if action == "content":
        if row.entry_type != "file":
            raise ValidationError("不能写入目录内容")
        content = params.get("content", "")
        return skill_dump(write_skill(row, content, new_keys), content)
    if action == "rename":
        rename = filename if row.entry_type == "folder" else skill_name
        name = rename(params.get("name"))
        unique_skill(query, row.parent_id, name, row.pk)
        row.name = name
        if row.entry_type == "file":
            row.file_ext = name.rsplit(".", 1)[-1].lower()
            update_skill_metadata(row, read_skill(row) if name == SKILL_ENTRY_NAME else "")
        save(row)
    elif action == "move":
        parent = parent_skill(query, params.get("targetParentId"))
        cursor = parent
        seen = set()
        while cursor:
            if cursor == row.pk or cursor in seen:
                raise ValidationError("不能移动到自身或子目录")
            seen.add(cursor)
            cursor = skill_entry(query, cursor).parent_id
        unique_skill(query, parent, row.name, row.pk)
        row.parent_id = parent
        row.sort_order = number(params.get("sortOrder"), 0, minimum=0)
        save(row)
    elif action == "delete":
        delete_skill(row, list(query))
        return None
    else:
        raise Http404()
    return skill_dump(row)


def artifact_workflow(scope, workflow_id=None, flow_id=None, lock=False):
    if "workflow" not in connection.introspection.table_names():
        raise Http404()
    if workflow_id in (None, "") and not flow_id:
        raise ValidationError("缺少工作流标识")
    query = WorkflowIdentity.objects.filter(deleted=False)
    if lock:
        query = query.select_for_update()
    if workflow_id not in (None, ""):
        query = query.filter(pk=number(workflow_id))
    if flow_id:
        query = query.filter(flow_id=text(flow_id, 255))
    row = query.first()
    if not row:
        raise Http404()
    if row.space_id is None:
        if scope.space_id is not None or row.uid != scope.uid:
            raise PermissionDenied()
    elif row.space_id != scope.space_id:
        raise PermissionDenied()
    else:
        space_membership(scope.uid, scope.space_id)
    return row


def artifact_location(row):
    key = row.object_key or ""
    if (
        not key.startswith(f"workflow/artifacts/{row.workflow_id}/")
        or "\\" in key
        or any(x in ("", ".", "..") for x in key.split("/"))
    ):
        raise Http404()
    private = getattr(settings, "SKILL_SANDBOX_ARTIFACT_BUCKET", "workflow-artifacts")
    if row.bucket_name and row.bucket_name != private:
        raise Http404()
    return row.bucket_name or storage.bucket(), key


def artifact_dump(row):
    result = {
        k: v
        for k, v in dump(row).items()
        if k not in ("objectKey", "bucketName", "uid", "spaceId", "deleted")
    }
    from astron_console.publishing.public_files import workflow_grant

    if workflow_grant(row.run_id) is not None:
        result["downloadUrl"] = f"/console-api/published/workflow-artifacts/{row.pk}"
    else:
        result["downloadUrl"] = private_artifact_url(row)
    return result


def private_artifact_url(row):
    url = f"/console-api/workflow/artifacts/{row.pk}/content"
    if row.space_id is not None:
        url += f"?spaceId={row.space_id}"
    return url


def private_artifact(scope, artifact_id):
    row = scope_queryset(
        exclude_public_artifacts(Artifact.objects.filter(pk=artifact_id, deleted=False)),
        scope,
    ).first()
    if not row:
        raise Http404()
    artifact_workflow(scope, row.workflow_id)
    return row


@api_endpoint(["GET"])
@clients.service_errors
def artifact_content(request, artifact_id):
    scope = resolve_scope(request)
    # A browser download navigation carries the session cookie, but no space-id
    # header. The URL selects a scope only; membership is checked on every read.
    space_id = scope_identifier(request.GET.get("spaceId"), required="spaceId" in request.GET)
    if space_id is not None:
        if scope.space_id is not None and scope.space_id != space_id:
            raise PermissionDenied()
        space, _ = space_membership(scope.uid, space_id)
        if scope.enterprise_id is not None and scope.enterprise_id != space.enterprise_id:
            raise PermissionDenied()
        scope = ResourceScope(scope.uid, space_id, space.enterprise_id)
    row = private_artifact(scope, artifact_id)
    bucket, key = artifact_location(row)
    body = storage.read(key, bucket)
    result = FileResponse(
        io.BytesIO(body), as_attachment=True, filename=row.file_name, content_type=row.content_type
    )
    result["Cache-Control"] = "private, no-store"
    result["X-Content-Type-Options"] = "nosniff"
    logger.info(
        "Downloaded workflow artifact id=%s workflow=%s size=%s",
        row.pk,
        row.workflow_id,
        len(body),
    )
    return result


def validate_artifact(file):
    if file is None or not 0 < file.size <= getattr(
        settings, "SKILL_SANDBOX_ARTIFACT_MAX_FILE_SIZE", 20 * 1024 * 1024
    ):
        raise ValidationError("产物大小不符合限制")
    name = filename(file.name)
    ext = name.rsplit(".", 1)[-1].lower()
    if ext not in getattr(
        settings,
        "SKILL_SANDBOX_ARTIFACT_ALLOWED_EXTENSIONS",
        [
            "txt",
            "md",
            "csv",
            "json",
            "pdf",
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "zip",
        ],
    ):
        raise ValidationError("不支持的产物类型")
    prefix = file.read(16)
    file.seek(0)
    signatures = {
        "pdf": b"%PDF-",
        "png": b"\x89PNG\r\n\x1a\n",
        "jpg": b"\xff\xd8\xff",
        "jpeg": b"\xff\xd8\xff",
        "gif": b"GIF",
        "doc": b"\xd0\xcf\x11\xe0",
        "xls": b"\xd0\xcf\x11\xe0",
        "ppt": b"\xd0\xcf\x11\xe0",
    }
    if ext in signatures and not prefix.startswith(signatures[ext]):
        raise ValidationError("文件内容与类型不匹配")
    if ext in ("txt", "md", "csv", "json"):
        try:
            file.read().decode("utf-8")
        except UnicodeDecodeError:
            raise ValidationError("文本产物必须为UTF-8") from None
        finally:
            file.seek(0)
    if ext in ("docx", "xlsx", "pptx", "zip"):
        try:
            with zipfile.ZipFile(file) as archive:
                entries = archive.infolist()
                if len(entries) > 512 or sum(x.file_size for x in entries) > 64 * 1024 * 1024:
                    raise ValidationError("压缩文件展开大小超过限制")
                if any(
                    "vbaproject" in x.filename.lower()
                    or x.filename.startswith("/")
                    or ".." in PurePosixPath(x.filename).parts
                    for x in entries
                ):
                    raise ValidationError("产物压缩内容不安全")
                if ext != "zip" and "[Content_Types].xml" not in archive.namelist():
                    raise ValidationError("Office格式错误")
        except zipfile.BadZipFile:
            raise ValidationError("压缩格式错误") from None
        finally:
            file.seek(0)
    return name, mimetypes.guess_type(name)[0] or "application/octet-stream"


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@clients.service_errors
def upload_artifact(request, console=False):
    configured = getattr(settings, "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN", "")
    candidate = request.headers.get("X-Skill-Sandbox-Artifact-Token", "")
    if len(configured) < 32 or not hmac.compare_digest(configured.encode(), candidate.encode()):
        raise PermissionDenied()
    p = request.POST
    from astron_console.publishing.public_files import workflow_upload_identity

    execution = workflow_upload_identity(p, console=console)
    grant = None
    if execution:
        grant, scope, run = execution
        uid = grant.caller_uid if grant else run.uid
    else:
        uid = text(p.get("uid"), 128)
        scope = ResourceScope(uid, number(p.get("spaceId")) if p.get("spaceId") else None, None)
    file = request.FILES.get("file")
    name, content_type = validate_artifact(file)
    metadata = {
        key: text(p.get(key, ""), 128, required=False) for key in ("runId", "nodeId", "skillId")
    }
    source = p.get("source", "skill_sandbox")
    if source not in ("skill_sandbox", "code_sandbox"):
        raise ValidationError("无效产物来源")
    bucket = getattr(settings, "SKILL_SANDBOX_ARTIFACT_BUCKET", "workflow-artifacts")
    with transaction.atomic():
        workflow = artifact_workflow(scope, p.get("workflowId"), p.get("flowId"), True)
        if execution and workflow.pk != run.workflow_id:
            raise PermissionDenied
        active = Artifact.objects.filter(workflow_id=workflow.pk, deleted=False)
        if active.count() >= getattr(
            settings, "SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_FILES_PER_WORKFLOW", 1000
        ) or (active.aggregate(total=Sum("file_size"))["total"] or 0) + file.size > getattr(
            settings, "SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_TOTAL_SIZE_PER_WORKFLOW", 1024**3
        ):
            raise ValidationError("产物配额已满")
        key = f"workflow/artifacts/{workflow.pk}/{uuid.uuid4().hex}/{name}"
        storage.put(key, file, file.size, content_type, bucket)
        try:
            row = save(
                Artifact(
                    uid=uid,
                    space_id=grant.caller_space_id if grant else scope.space_id,
                    workflow_id=workflow.pk,
                    run_id=metadata["runId"],
                    node_id=metadata["nodeId"],
                    skill_id=metadata["skillId"],
                    file_name=name,
                    object_key=key,
                    bucket_name=bucket,
                    content_type=content_type,
                    file_size=file.size,
                    source=source,
                )
            )
        except Exception:
            storage.remove(key, bucket)
            raise
    logger.info(
        "Stored artifact id=%s workflow=%s size=%s runtime=%s run=%s",
        row.pk,
        workflow.pk,
        file.size,
        "console" if console else "legacy",
        row.run_id,
    )
    return artifact_dump(row)


@api_endpoint(["GET"])
@clients.service_errors
def presign(request):
    scope = resolve_scope(request)
    name = filename(request.GET.get("objectKey"))
    key = (
        "uploads/"
        + hashlib.sha256(scope.uid.encode()).hexdigest()[:24]
        + "/"
        + uuid.uuid4().hex
        + "/"
        + name
    )
    url = storage.client(True).presigned_put_object(
        storage.bucket(),
        key,
        expires=timedelta(seconds=getattr(settings, "OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE", 600)),
    )
    return {"url": url, "bucket": storage.bucket(), "objectKey": key}


@api_endpoint(["POST"])
@clients.service_errors
def image_upload(request):
    scope = resolve_scope(request)
    file = request.FILES.get("file")
    if file is None or not 0 < file.size <= 10 * 1024 * 1024:
        raise ValidationError("请选择不超过10MB的图片")
    name = filename(file.name)
    ext = name.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg"):
        raise ValidationError("仅支持PNG/JPEG")
    prefix = file.read(8)
    file.seek(0)
    if not (prefix.startswith(b"\x89PNG\r\n\x1a\n") or prefix.startswith(b"\xff\xd8\xff")):
        raise ValidationError("图片格式错误")
    owner = (
        ("space-" + str(scope.space_id))
        if scope.space_id
        else ("user-" + hashlib.sha256(scope.uid.encode()).hexdigest()[:24])
    )
    key = "images/" + owner + "/" + uuid.uuid4().hex + "/" + name
    storage.put(key, file, file.size, "image/png" if ext == "png" else "image/jpeg")
    return {
        "s3Key": key,
        "downloadLink": settings.CONSOLE_PUBLIC_ORIGIN
        + "/console-api/image/content/"
        + quote(key.removeprefix("images/"), safe="/"),
    }


@api_endpoint(["GET"])
@clients.service_errors
def image_content(request, owner, upload_id, name):
    if not re.fullmatch(r"[a-f0-9]{32}", upload_id):
        raise Http404()
    if owner.startswith("space-"):
        space_membership(str(request.user.pk), number(owner.removeprefix("space-")))
    elif owner != "user-" + hashlib.sha256(str(request.user.pk).encode()).hexdigest()[:24]:
        raise PermissionDenied()
    name = filename(name)
    ext = name.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg"):
        raise Http404()
    # Keep authenticated image reads same-origin; public storage endpoints may
    # be private-network addresses. Uploads on this path are limited to 10MB.
    content = storage.read("images/" + owner + "/" + upload_id + "/" + name)
    result = HttpResponse(content, content_type="image/png" if ext == "png" else "image/jpeg")
    result["Cache-Control"] = "private, no-store"
    result["X-Content-Type-Options"] = "nosniff"
    return result
