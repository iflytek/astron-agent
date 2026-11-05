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
from datetime import timedelta
from pathlib import PurePosixPath
from urllib.parse import quote

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.db.models import Sum
from django.http import Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

from astron_console.http import api_endpoint
from astron_console.spaces.permissions import (
    ResourceScope,
    resolve_scope,
    scope_queryset,
    space_membership,
)

from . import clients, storage
from .artifact_queries import exclude_public_artifacts
from .common import dump, filename, number, payload, save, text
from .models import Artifact, SkillFile, WorkflowIdentity

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


def skill_entry(request, id):
    row = (
        scope_queryset(SkillFile.objects.filter(deleted=False), skill_scope(request))
        .filter(pk=number(id))
        .first()
    )
    if not row:
        raise Http404()
    return row


def parent_skill(request, id):
    parent = number(id, 0, minimum=0)
    if parent and skill_entry(request, parent).entry_type != "folder":
        raise ValidationError("父节点不是目录")
    return parent


def unique_skill(request, parent, name, exclude=None):
    query = scope_queryset(
        SkillFile.objects.filter(parent_id=parent, name=name, deleted=False), skill_scope(request)
    )
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


def write_skill(row, content):
    if not isinstance(content, str):
        raise ValidationError("内容必须是文本")
    encoded = content.encode("utf-8")
    if len(encoded) > 5 * 1024 * 1024:
        raise ValidationError("Skill文件超过5MB")
    old = row.object_key
    scope = (
        "space-" + str(row.space_id)
        if row.space_id
        else "user-" + hashlib.sha256(row.uid.encode()).hexdigest()[:24]
    )
    key = "skill-files/" + scope + "/" + uuid.uuid4().hex + "/" + row.name
    storage.put(key, io.BytesIO(encoded), len(encoded), "text/plain; charset=utf-8")
    row.object_key = key
    row.file_size = len(encoded)
    row.content_type = "text/plain; charset=utf-8"
    row.file_ext = row.name.rsplit(".", 1)[-1].lower()
    if row.name == "SKILL.md":
        row.skill_name = "SKILL"
        row.skill_description = ""
        if content.startswith("---\n"):
            front = content.split("---", 2)[1]
            for key_name, target in [("name", "skill_name"), ("description", "skill_description")]:
                found = re.search(r"^" + key_name + r":\s*(.+)$", front, re.M)
                if found:
                    setattr(row, target, found[1].strip(" \"'"))
    try:
        save(row)
    except Exception:
        storage.remove(key)
        raise
    if old and old != key:
        storage.remove(old)
    return row


def skill_dump(row, content=False):
    result = dump(row)
    result["skillEntry"] = row.name == "SKILL.md" and row.entry_type == "file"
    if row.entry_type == "file":
        result["downloadUrl"] = storage.download(row.object_key, name=row.name)
        if content:
            try:
                result["content"] = storage.read(row.object_key).decode("utf-8")
            except UnicodeDecodeError:
                raise ValidationError("Skill文件不是UTF-8文本") from None
    else:
        result["children"] = []
    return result


def new_skill(request, parent, name, content=None):
    name = filename(name) if content is None else skill_name(name)
    unique_skill(request, parent, name)
    scope = skill_scope(request)
    row = SkillFile(
        uid=scope.uid,
        space_id=scope.space_id,
        parent_id=parent,
        name=name,
        entry_type="folder" if content is None else "file",
    )
    return save(row) if content is None else write_skill(row, content)


def delete_skill(row, entries, seen=None):
    seen = seen or set()
    if row.pk in seen:
        raise ValidationError("目录关系无效")
    seen.add(row.pk)
    for child in entries:
        if child.parent_id == row.pk:
            delete_skill(child, entries, seen)
    if row.object_key:
        storage.remove(row.object_key)
    row.deleted = True
    save(row)


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


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@clients.service_errors
def skills(request, action="delete"):
    p = payload(request)
    scope = skill_scope(request)
    if action in ("tree", "importable"):
        entries = list(
            scope_queryset(SkillFile.objects.filter(deleted=False), scope).order_by(
                "sort_order", "id"
            )
        )
        lookup = {r.pk: r for r in entries}
        if action == "tree":
            return skill_tree(entries, p.get("keyword", ""))
        result = []
        for row in entries:
            if row.name != "SKILL.md" or row.entry_type != "file":
                continue
            if (
                p.get("keyword")
                and p["keyword"].lower()
                not in ((row.skill_name or "") + " " + (row.skill_description or "")).lower()
            ):
                continue
            resources = []
            for item in entries:
                if item.entry_type != "file" or item.pk == row.pk:
                    continue
                path = [item.name]
                parent = item.parent_id
                seen = set()
                while parent != row.parent_id and parent in lookup and parent not in seen:
                    seen.add(parent)
                    path.insert(0, lookup[parent].name)
                    parent = lookup[parent].parent_id
                if parent == row.parent_id:
                    resources.append(
                        {
                            "path": "/".join(path),
                            "name": item.name,
                            "downloadUrl": storage.download(item.object_key, name=item.name),
                            "fileExt": item.file_ext,
                            "fileSize": item.file_size,
                        }
                    )
            result.append(
                {
                    "id": row.pk,
                    "parentId": row.parent_id,
                    "folderName": lookup[row.parent_id].name if row.parent_id in lookup else "",
                    "fileName": row.name,
                    "name": row.skill_name or row.name,
                    "description": row.skill_description or "",
                    "downloadUrl": storage.download(row.object_key, name=row.name),
                    "resources": resources,
                    "updateTime": row.update_time,
                }
            )
        return result
    if action == "content" and request.method == "GET":
        return skill_dump(skill_entry(request, p.get("id")), True)
    if request.method == "GET":
        raise ValidationError("修改需要POST、PUT或DELETE")
    if action in ("folder", "file"):
        return skill_dump(
            new_skill(
                request,
                parent_skill(request, p.get("parentId")),
                p.get("name"),
                None if action == "folder" else p.get("content", ""),
            ),
            action == "file",
        )
    if action in ("upload", "upload-directory"):
        uploaded = request.FILES.getlist("files")
        if not uploaded or len(uploaded) > 100:
            raise ValidationError("请选择1到100个文件")
        paths = request.POST.getlist("paths")
        if request.POST.get("pathsJson"):
            try:
                paths = json.loads(request.POST["pathsJson"])
            except ValueError:
                raise ValidationError("无效上传路径") from None
        if not isinstance(paths, list) or any(not isinstance(path, str) for path in paths):
            raise ValidationError("无效上传路径")
        if len(paths) == 1 and paths[0].startswith("["):
            try:
                paths = json.loads(paths[0])
            except ValueError:
                raise ValidationError("无效上传路径") from None
        if not isinstance(paths, list) or any(not isinstance(path, str) for path in paths):
            raise ValidationError("无效上传路径")
        if action == "upload-directory" and len(paths) != len(uploaded):
            raise ValidationError("路径与文件数量不一致")
        result = []
        for index, file in enumerate(uploaded):
            if file.size > 5 * 1024 * 1024:
                raise ValidationError("Skill文件超过5MB")
            try:
                content = file.read().decode("utf-8")
            except UnicodeDecodeError:
                raise ValidationError("Skill仅支持UTF-8文本") from None
            parent = parent_skill(request, p.get("parentId"))
            name = file.name
            if action == "upload-directory":
                parts = paths[index].split("/")
                if any(not x or x in (".", "..") or "\\" in x for x in parts):
                    raise ValidationError("无效目录路径")
                name = parts[-1]
                for part in parts[:-1]:
                    existing = scope_queryset(
                        SkillFile.objects.filter(parent_id=parent, name=part, deleted=False), scope
                    ).first()
                    if existing and existing.entry_type != "folder":
                        raise ValidationError("路径被文件占用")
                    parent = (existing or new_skill(request, parent, part)).pk
            result.append(skill_dump(new_skill(request, parent, name, content)))
        return (
            {
                "tree": skill_tree(
                    list(
                        scope_queryset(SkillFile.objects.filter(deleted=False), scope).order_by(
                            "sort_order", "id"
                        )
                    )
                ),
                "uploadedNodes": result,
                "skippedFiles": [],
            }
            if action == "upload-directory"
            else result
        )
    row = skill_entry(request, p.get("id"))
    if action == "content":
        if row.entry_type != "file":
            raise ValidationError("不能写入目录内容")
        return skill_dump(write_skill(row, p.get("content", "")), True)
    if action == "rename":
        name = filename(p.get("name")) if row.entry_type == "folder" else skill_name(p.get("name"))
        unique_skill(request, row.parent_id, name, row.pk)
        row.name = name
        save(row)
    elif action == "move":
        parent = parent_skill(request, p.get("targetParentId"))
        cursor = parent
        seen = set()
        while cursor:
            if cursor == row.pk or cursor in seen:
                raise ValidationError("不能移动到自身或子目录")
            seen.add(cursor)
            cursor = skill_entry(request, cursor).parent_id
        unique_skill(request, parent, row.name, row.pk)
        row.parent_id = parent
        row.sort_order = number(p.get("sortOrder"), 0, minimum=0)
        save(row)
    elif action == "delete":
        delete_skill(row, list(scope_queryset(SkillFile.objects.filter(deleted=False), scope)))
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


def artifact_dump(row, download=False):
    result = {
        k: v
        for k, v in dump(row).items()
        if k not in ("objectKey", "bucketName", "uid", "spaceId", "deleted")
    }
    from astron_console.publishing.public_files import workflow_grant

    if workflow_grant(row.run_id) is not None:
        result["downloadUrl"] = f"/console-api/published/workflow-artifacts/{row.pk}"
        return result
    if download:
        bucket, key = artifact_location(row)
        result["downloadUrl"] = storage.download(
            key,
            bucket,
            getattr(settings, "SKILL_SANDBOX_ARTIFACT_DOWNLOAD_EXPIRY_SECONDS", 300),
            row.file_name,
        )
    return result


@api_endpoint(["GET", "DELETE"])
@clients.service_errors
def artifacts(request, artifact_id=None, workflow_id=None, action=None):
    scope = resolve_scope(request)
    if workflow_id:
        artifact_workflow(scope, workflow_id)
        return [
            artifact_dump(r)
            for r in scope_queryset(
                exclude_public_artifacts(
                    Artifact.objects.filter(workflow_id=workflow_id, deleted=False)
                ),
                scope,
            ).order_by("-id")
        ]
    row = scope_queryset(
        exclude_public_artifacts(Artifact.objects.filter(pk=artifact_id, deleted=False)),
        scope,
    ).first()
    if not row:
        raise Http404()
    artifact_workflow(scope, row.workflow_id)
    if request.method == "DELETE":
        bucket, key = artifact_location(row)
        storage.remove(key, bucket)
        row.deleted = True
        row.object_key = None
        save(row)
        return None
    return artifact_dump(row, True)


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
def upload_artifact(request):
    configured = getattr(settings, "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN", "")
    candidate = request.headers.get("X-Skill-Sandbox-Artifact-Token", "")
    if len(configured) < 32 or not hmac.compare_digest(configured.encode(), candidate.encode()):
        raise PermissionDenied()
    p = request.POST
    uid = text(p.get("uid"), 128)
    scope = ResourceScope(uid, number(p.get("spaceId")) if p.get("spaceId") else None, None)
    from astron_console.publishing.public_files import workflow_upload_identity

    published = workflow_upload_identity(p)
    if published:
        grant, scope, published_run = published
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
        if published and workflow.pk != published_run.workflow_id:
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
                    space_id=grant.caller_space_id if published else scope.space_id,
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
    logger.info("Stored artifact id=%s workflow=%s size=%s", row.pk, workflow.pk, file.size)
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
    if name.rsplit(".", 1)[-1].lower() not in ("png", "jpg", "jpeg"):
        raise Http404()
    result = HttpResponseRedirect(
        storage.download("images/" + owner + "/" + upload_id + "/" + name)
    )
    result["Cache-Control"] = "private, no-store"
    return result
