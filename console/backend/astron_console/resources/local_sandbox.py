"""Console access to resource directories in the shared Docker sandbox."""

import base64
import hashlib
import io
import json
import logging
from pathlib import PurePosixPath

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import FileResponse, Http404

from astron_console.accounts.http import response

from .common import UpstreamError

logger = logging.getLogger(__name__)

TOKEN_HEADER = "X-Skill-Sandbox-Runtime-Credential-Token"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
MAX_RESPONSE_BYTES = 4 * ((MAX_DOWNLOAD_BYTES + 2) // 3) + 4096


def available():
    return bool(settings.LOCAL_SANDBOX_URL and settings.SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN)


def default_sandbox_directory(resource, kind):
    scope = (
        f"space-{resource.space_id}"
        if resource.space_id is not None
        else "user-" + hashlib.sha256(str(resource.uid).encode()).hexdigest()
    )
    resource_id = str(resource.pk) if kind == "agent" else f"~{resource.pk}"
    return f"/workspace/{kind}s/{scope}/{resource_id}"


def sandbox_identity(resource):
    _, _, _, scope, resource_id = resource.sandbox_directory.split("/")
    return {"scope": scope, "resourceId": resource_id}


def purge_deleted_resources():
    from astron_console.agents.models import Agent
    from astron_console.workflows.models import Workflow

    if not available():
        return
    for model, kind, deleted in (
        (Agent, "agent", {"is_delete": 1}),
        (Workflow, "workflow", {"deleted": True}),
    ):
        pending = model.objects.filter(sandbox_cleanup_pending=True, **deleted).order_by("pk")
        for resource in pending.only("sandbox_directory").iterator(chunk_size=100):
            try:
                request_runner("purge", kind=kind, **sandbox_identity(resource))
            except (Http404, ValidationError, UpstreamError):
                logger.warning("Sandbox directory cleanup pending kind=%s id=%s", kind, resource.pk)
                continue
            pending.filter(pk=resource.pk).update(sandbox_cleanup_pending=False)
            logger.info("Sandbox directory removed kind=%s id=%s", kind, resource.pk)


def request_runner(operation, **fields):
    if not available():
        raise UpstreamError("本地 Docker 沙箱未配置")
    url = settings.LOCAL_SANDBOX_URL.rstrip("/") + "/v1/sandbox"
    try:
        with httpx.Client(
            timeout=httpx.Timeout(85, connect=5), follow_redirects=False, trust_env=False
        ) as client:
            with client.stream(
                "POST",
                url,
                headers={TOKEN_HEADER: settings.SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN},
                json={"operation": operation, **fields},
            ) as result:
                if result.status_code == 404 and operation != "probe":
                    raise Http404
                if result.status_code == 400 and operation != "probe":
                    raise ValidationError("文件路径无效")
                if result.status_code == 413 and operation != "probe":
                    raise ValidationError("文件超过下载大小限制")
                result.raise_for_status()
                body = bytearray()
                limit = MAX_RESPONSE_BYTES if operation == "read" else 2 * 1024 * 1024
                for chunk in result.iter_bytes(chunk_size=65536):
                    if len(body) + len(chunk) > limit:
                        raise ValueError
                    body.extend(chunk)
        data = json.loads(body)
        if not isinstance(data, dict):
            raise ValueError
        return data
    except (httpx.HTTPError, ValueError):
        raise UpstreamError("本地 Docker 沙箱连接失败，请稍后重试") from None


def resource_files(request, resource, kind, scope, *, download=False):
    from .sandbox import enabled_sandbox

    def active_provider():
        config = enabled_sandbox(scope)
        return config.provider if config else None

    def inactive_listing(provider):
        if download:
            raise Http404
        result = response(
            {"provider": provider, "directory": None, "entries": [], "truncated": False}
        )
        result["Cache-Control"] = "private, no-store"
        return result

    provider = active_provider()
    path = request.GET.get("path", "")
    after = request.GET.get("after")
    if (
        len(path) > 1024
        or "\\" in path
        or any(ord(char) < 32 for char in path)
        or (path and any(part in {"", ".", ".."} for part in path.split("/")))
        or (download and not path)
        or (not download and path)
        or (after is not None and (download or len(after) > 1024))
    ):
        raise ValidationError("文件路径无效")
    if provider != "docker":
        return inactive_listing(provider)
    data = request_runner(
        "read" if download else "list-tree",
        kind=kind,
        **sandbox_identity(resource),
        **({"path": path} if download else {"after": after}),
    )
    provider = active_provider()
    if provider != "docker":
        return inactive_listing(provider)
    if not download:
        entries, truncated, cursor = (
            data.get("entries"),
            data.get("truncated"),
            data.get("nextCursor"),
        )
        if (
            not isinstance(entries, list)
            or not isinstance(truncated, bool)
            or (cursor is not None and (not isinstance(cursor, str) or len(cursor) > 1024))
        ):
            raise UpstreamError("本地 Docker 沙箱文件响应无效")
        result = response(
            {
                "provider": provider,
                "directory": resource.sandbox_directory,
                "entries": entries,
                "truncated": truncated,
                "nextCursor": cursor,
            }
        )
        result["Cache-Control"] = "private, no-store"
        return result
    try:
        content = base64.b64decode(data["content"], validate=True)
    except (KeyError, ValueError, TypeError):
        raise UpstreamError("本地 Docker 沙箱文件响应无效") from None
    if len(content) > MAX_DOWNLOAD_BYTES:
        raise ValidationError("文件超过下载大小限制")
    result = FileResponse(
        io.BytesIO(content),
        as_attachment=True,
        filename=PurePosixPath(path).name,
        content_type="application/octet-stream",
    )
    result["Cache-Control"] = "private, no-store"
    result["X-Content-Type-Options"] = "nosniff"
    return result
