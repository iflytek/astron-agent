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
from astron_console.spaces.permissions import permits, require_space_permission

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
    # End the upstream wait before the Console gateway's 30-second deadline.
    timeout = 15 if operation == "delete" else 85
    try:
        with httpx.Client(
            timeout=httpx.Timeout(timeout, connect=5), follow_redirects=False, trust_env=False
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


def validate_file_path(path, *, required=False):
    if (
        not isinstance(path, str)
        or (required and not path)
        or len(path) > 1024
        or "\\" in path
        or "\x00" in path
        or (path and any(part in {"", ".", ".."} for part in path.split("/")))
    ):
        raise ValidationError("文件路径无效")


def delete_resource_file(request, resource, kind, scope):
    from .sandbox import enabled_sandbox

    config = enabled_sandbox(scope)
    if config is None or config.provider != "docker":
        raise ValidationError("启用本地 Docker 沙箱后才能删除文件")
    path = request.payload.get("path")
    validate_file_path(path, required=True)
    request_runner("delete", kind=kind, **sandbox_identity(resource), path=path)
    logger.info("Sandbox file removed kind=%s id=%s uid=%s", kind, resource.pk, scope.uid)
    return {"deleted": True}


def resource_files(request, resource, kind, scope, *, download=False, write_permission):
    from . import e2b_files
    from .sandbox import enabled_sandbox

    def inactive_listing(provider):
        if download:
            raise Http404
        result = response(
            {"provider": provider, "directory": None, "entries": [], "truncated": False}
        )
        result["Cache-Control"] = "private, no-store"
        return result

    config = enabled_sandbox(scope)
    provider = config.provider if config else None
    path = request.GET.get("path", "")
    after = request.GET.get("after")
    validate_file_path(path, required=download)
    if (
        any(ord(char) < 32 for char in path)
        or (not download and path)
        or (after is not None and (download or len(after) > (8192 if provider == "e2b" else 1024)))
    ):
        raise ValidationError("文件路径无效")
    if provider == "e2b":
        if download:
            file_ref = request.GET.get("fileRef", "")
            if not config.api_key or not file_ref or len(file_ref) > 8192:
                raise Http404
            contents = e2b_files.download_file(resource, kind, config, path, file_ref)
        else:
            data = (
                e2b_files.list_files(resource, kind, config, after)
                if config.api_key
                else {"entries": [], "truncated": False}
            )
        current = enabled_sandbox(scope)
        if not current or current.provider != "e2b" or current.api_key != config.api_key:
            return inactive_listing(current.provider if current else None)
        if download:
            return download_response(contents, path)
        result = response({"provider": "e2b", "directory": e2b_files.WORKSPACES[kind], **data})
        result["Cache-Control"] = "private, no-store"
        return result
    if provider != "docker":
        return inactive_listing(provider)
    if download and request.GET.get("fileRef"):
        raise Http404
    data = request_runner(
        "read" if download else "list-tree",
        kind=kind,
        **sandbox_identity(resource),
        **({"path": path} if download else {"after": after}),
    )
    current = enabled_sandbox(scope)
    provider = current.provider if current else None
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
                "canDelete": scope.space_id is None
                or permits(require_space_permission, scope.uid, scope.space_id, write_permission),
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
    return download_response(content, path)


def download_response(content, path):
    result = FileResponse(
        io.BytesIO(content),
        as_attachment=True,
        filename=PurePosixPath(path).name,
        content_type="application/octet-stream",
    )
    result["Cache-Control"] = "private, no-store"
    result["X-Content-Type-Options"] = "nosniff"
    return result
