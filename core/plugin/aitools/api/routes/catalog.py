"""Publish active public tool schemas and credential state without credentials."""

from typing import Any

from fastapi import APIRouter, Request
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.platform_account_config import get_iflytek_open_platform_credentials

catalog_router = APIRouter()
_TOOL_NAMES = {
    "smarttts": "超拟人语音合成",
    "image_generate": "文生图",
    "image_understanding": "图片理解",
    "ocr": "OCR 文字识别",
}


@catalog_router.get("/aitools/v1/catalog", include_in_schema=False)
def builtin_catalog(request: Request) -> dict[str, Any]:
    """Configuration is a prerequisite, never a claim of vendor health."""
    try:
        get_iflytek_open_platform_credentials()
        configured = True
    except ServiceException:
        configured = False
    document = request.app.openapi()
    tools = []
    for path, methods in document.get("paths", {}).items():
        operation = methods.get("post", {})
        if operation.get("deprecated") or "public_cn" not in operation.get("tags", []):
            continue
        slug = path.rsplit("/", 1)[-1]
        tools.append(
            {
                "id": f"aitools.{slug}",
                "name": _TOOL_NAMES.get(slug, operation.get("summary", slug)),
                "description": operation.get("description", ""),
                "path": path,
            }
        )
    return {
        "configured": configured,
        "health": "unknown",
        "configurationHint": (
            "平台账号已配置；实际可用性请通过测试调用确认"
            if configured
            else "请先在平台账号中配置讯飞开放平台 AppID、APIKey 和 APISecret"
        ),
        "tools": tools,
        "openapi": document,
    }
