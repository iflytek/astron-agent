"""Console access to resource directories in the shared Docker sandbox."""

import base64
import hashlib
import io
import json
from pathlib import PurePosixPath

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import FileResponse, Http404

from astron_console.accounts.http import response

from .common import UpstreamError

TOKEN_HEADER = "X-Skill-Sandbox-Runtime-Credential-Token"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
MAX_RESPONSE_BYTES = 4 * ((MAX_DOWNLOAD_BYTES + 2) // 3) + 4096


def available():
    return bool(settings.LOCAL_SANDBOX_URL and settings.SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN)


def resource_scope(resource):
    if resource.space_id is not None:
        return f"space-{resource.space_id}"
    return "user-" + hashlib.sha256(str(resource.uid).encode()).hexdigest()


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


def resource_files(request, resource, kind, resource_id, *, download=False):
    path = request.GET.get("path", "")
    after = request.GET.get("after")
    if (
        len(path) > 1024
        or "\\" in path
        or any(ord(char) < 32 for char in path)
        or (path and any(part in {"", ".", ".."} for part in path.split("/")))
        or (download and not path)
        or (after is not None and (download or len(after) > 345))
    ):
        raise ValidationError("文件路径无效")
    data = request_runner(
        "read" if download else "list",
        kind=kind,
        scope=resource_scope(resource),
        resourceId=str(resource_id),
        path=path,
        **({"after": after} if after is not None else {}),
    )
    if not download:
        entries, truncated, cursor = (
            data.get("entries"),
            data.get("truncated"),
            data.get("nextCursor"),
        )
        if (
            not isinstance(entries, list)
            or not isinstance(truncated, bool)
            or (cursor is not None and (not isinstance(cursor, str) or len(cursor) > 345))
        ):
            raise UpstreamError("本地 Docker 沙箱文件响应无效")
        result = response({"entries": entries, "truncated": truncated, "nextCursor": cursor})
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
