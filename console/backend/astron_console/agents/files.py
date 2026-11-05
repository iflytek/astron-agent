"""Authorized chat inputs and sandbox outputs in the existing object store."""

import io
import logging
from pathlib import PurePosixPath

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt

from astron_console.accounts.models import User
from astron_console.http import api_endpoint
from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError
from astron_console.resources.common import UpstreamError, upstream_errors
from astron_console.resources.sandbox import service_auth
from astron_console.spaces.permissions import ResourceScope

from .conversation_models import AgentFile, AgentRun, new_id
from .definitions import get_agent, get_scoped_agent

logger = logging.getLogger(__name__)
MAX_SIZE = 20 * 1024 * 1024
MAX_TEXT = 100000


def file_data(row):
    return {
        "id": row.pk,
        "name": row.name,
        "size": row.size,
        "direction": row.direction,
        "downloadUrl": f"/console-api/agents/{row.agent_id}/files/{row.pk}",
    }


def extract(upload):
    suffix = PurePosixPath(upload.name).suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json"}:
        try:
            text = upload.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ValidationError("文本文件必须使用UTF-8编码") from None
    elif suffix == ".pdf":
        from pypdf import PdfReader

        try:
            reader = PdfReader(upload)
            if reader.is_encrypted:
                raise ValidationError("暂不支持加密PDF")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except ValidationError:
            raise
        except Exception:
            raise ValidationError("PDF解析失败") from None
    elif suffix == ".docx":
        from docx import Document

        try:
            doc = Document(upload)
            text = "\n".join(
                [p.text for p in doc.paragraphs]
                + ["\t".join(c.text for c in r.cells) for t in doc.tables for r in t.rows]
            )
        except Exception:
            raise ValidationError("Word文档解析失败") from None
    else:
        raise ValidationError("支持txt、md、csv、json、pdf和docx文件")
    if not text.strip():
        raise ValidationError("文件未提取到文本，扫描文档请先进行OCR")
    if len(text) > MAX_TEXT:
        raise ValidationError("文件文本超过100000字符，请拆分后上传")
    upload.seek(0)
    return text


def store_file(upload, agent, scope, *, direction="input", run_id=None):
    if not upload or not upload.size or upload.size > MAX_SIZE:
        raise ValidationError("文件不能为空或超过20MB")
    name = PurePosixPath(upload.name.replace("\\", "/")).name
    if not name or len(name) > 255:
        raise ValidationError("文件名无效")
    content = extract(upload) if direction == "input" else ""
    identifier = new_id()
    bucket = storage.bucket() if direction == "input" else settings.SKILL_SANDBOX_ARTIFACT_BUCKET
    key = f"agent-files/{agent.pk}/{identifier}/{name}"
    storage.put(key, upload, upload.size, upload.content_type or "application/octet-stream", bucket)
    try:
        return AgentFile.objects.create(
            id=identifier,
            agent_id=agent.pk,
            uid=scope.uid,
            space_id=scope.space_id,
            name=name,
            size=upload.size,
            object_key=key,
            bucket=bucket,
            text=content,
            content_type=upload.content_type or "application/octet-stream",
            direction=direction,
            run_id=run_id,
        )
    except Exception:
        storage.remove(key, bucket)
        raise


@api_endpoint(["POST"])
@upstream_errors
def upload(request, agent_id):
    agent, scope = get_agent(request, agent_id)
    if not agent.support_upload:
        raise ValidationError("此Agent未启用文件输入")
    try:
        row = store_file(request.FILES.get("file"), agent, scope)
    except ResourceServiceError:
        raise UpstreamError("文件存储失败，请重试") from None
    logger.info("Agent input uploaded agent=%s file=%s uid=%s", agent.pk, row.pk, scope.uid)
    return file_data(row)


@api_endpoint(["GET"])
@upstream_errors
def download(request, agent_id, file_id):
    _, scope = get_agent(request, agent_id)
    row = AgentFile.objects.filter(
        pk=file_id, agent_id=agent_id, uid=scope.uid, space_id=scope.space_id
    ).first()
    if row is None:
        raise Http404
    try:
        body = storage.read(row.object_key, row.bucket)
    except ResourceServiceError:
        raise UpstreamError("文件读取失败") from None
    return FileResponse(
        io.BytesIO(body), as_attachment=True, filename=row.name, content_type=row.content_type
    )


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@upstream_errors
def internal_upload(request):
    service_auth(request, "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN", "X-Skill-Sandbox-Artifact-Token")
    values = request.payload
    run = (
        AgentRun.objects.select_related("session")
        .filter(pk=values.get("runId"), status="running")
        .first()
    )
    if not run:
        raise PermissionDenied
    session = run.session
    if (
        str(session.agent_id) != str(values.get("agentId"))
        or values.get("sessionId", session.pk) != session.pk
        or run.cancel_requested
        or session.deleted
    ):
        raise PermissionDenied
    from astron_console.publishing.public_files import upload_identity

    published = upload_identity(run, values)
    if published:
        _, scope, agent = published
    else:
        if session.uid != values.get("uid") or str(session.space_id or "") != str(
            values.get("spaceId") or ""
        ):
            raise PermissionDenied
        user = User.objects.filter(pk=session.uid, is_active=True).first()
        if not user or not user.account_enabled:
            raise PermissionDenied
        scope = ResourceScope(session.uid, session.space_id, None)
        agent = get_scoped_agent(scope, session.agent_id)
    skill_id = str(values.get("skillId", ""))
    if skill_id not in {str(x) for x in run.definition.get("skills", [])}:
        raise PermissionDenied
    upload_file = request.FILES.get("file")
    if (
        not upload_file
        or PurePosixPath(upload_file.name).suffix.lstrip(".").lower()
        not in settings.SKILL_SANDBOX_ARTIFACT_ALLOWED_EXTENSIONS
    ):
        raise ValidationError("不支持的产物文件类型")
    try:
        row = store_file(upload_file, agent, scope, direction="output", run_id=run.pk)
    except ResourceServiceError:
        raise UpstreamError("产物存储失败") from None
    if published:
        from astron_console.publishing.public_files import file_data as published_file_data

        data = published_file_data(row)
    else:
        data = file_data(row)
    return {
        **data,
        "artifactId": row.pk,
        "fileName": row.name,
        "fileSize": row.size,
        "file_name": row.name,
        "file_size": row.size,
        "download_url": data["downloadUrl"],
    }
