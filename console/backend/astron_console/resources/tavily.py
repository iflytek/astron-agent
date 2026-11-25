"""Fixed Tavily Search tool template and authenticated Core Agent test call."""

import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from astron_console.spaces.models import Space

from . import clients
from .common import UpstreamError

CATALOG_ID = "tavily.search"
TAG = f"builtin:{CATALOG_ID}"
TOOL_ID_PREFIX = "tavily@"
NAME = "Tavily 网页搜索"
DESCRIPTION = "搜索实时网页和新闻，返回标题、摘要和原文链接。"
SEARCH_ERRORS = {
    "搜索参数无效",
    "Web search quota is exhausted",
    "Web search credentials were rejected",
    "Web search timed out",
    "Web search is temporarily unavailable",
    "Invalid web search response",
}


def lock_scope(scope):
    """Serialize Tavily installation and version changes within one resource scope."""
    if scope.space_id is None:
        get_user_model().objects.select_for_update().only("pk").get(pk=scope.uid)
    else:
        Space.objects.select_for_update().only("pk").get(pk=scope.space_id)


def schema(token=""):
    return {
        "openapi": "3.0.3",
        "info": {"title": NAME, "version": "1.0.0"},
        "servers": [{"url": "https://api.tavily.com"}],
        "paths": {
            "/search": {
                "post": {
                    "operationId": "web_search",
                    "description": DESCRIPTION,
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {"type": "string", "description": "搜索词"},
                                        "topic": {"type": "string", "enum": ["general", "news"]},
                                        "max_results": {
                                            "type": "integer",
                                            "minimum": 1,
                                            "maximum": 10,
                                        },
                                        "time_range": {
                                            "type": "string",
                                            "enum": ["day", "week", "month", "year"],
                                        },
                                        "start_date": {
                                            "type": "string",
                                            "description": "YYYY-MM-DD",
                                        },
                                        "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                                    },
                                    "required": ["query"],
                                }
                            }
                        },
                    },
                    "responses": {"200": {"description": "搜索结果"}},
                }
            }
        },
        "components": {
            "securitySchemes": {
                "Tavily": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "Authorization",
                    "x-value": token,
                }
            }
        },
        "security": [{"Tavily": []}],
    }


def catalog_entry():
    return {
        "id": CATALOG_ID,
        "name": NAME,
        "description": DESCRIPTION,
        "openapi_schema": schema(),
        "available": True,
        "configurationHint": "添加到当前空间后，在工具鉴权中填写 Tavily API Key 并发布。",
    }


def key_from_schema(document, *, required=True):
    token = document
    for field in ("components", "securitySchemes", "Tavily"):
        if not isinstance(token, dict):
            raise ValidationError("Tavily 鉴权配置格式无效")
        token = token.get(field, {})
    if not isinstance(token, dict):
        raise ValidationError("Tavily 鉴权配置格式无效")
    raw = token.get("x-value") or ""
    if raw and not isinstance(raw, str):
        raise ValidationError("Tavily API Key 格式无效")
    key = raw.strip().removeprefix("Bearer ").strip()
    if required and not key:
        raise ValidationError("请在工具鉴权中填写 Tavily API Key")
    if key and (len(key) > 256 or any(character.isspace() for character in key)):
        raise ValidationError("Tavily API Key 格式无效")
    return key


def debug(arguments, document):
    if not isinstance(arguments, dict):
        raise ValidationError("body 必须是对象")
    key = settings.WORKFLOW_INTERNAL_API_KEY
    if not key:
        raise UpstreamError("Agent 内部身份未配置")
    result = clients.call(
        "AGENT_URL",
        "POST",
        "/agent/v1/tools/tavily/search",
        payload={"api_key": key_from_schema(document), "arguments": arguments},
        headers={"X-Workflow-Internal-Key": key},
    )
    if not isinstance(result, dict) or type(result.get("code")) is not int:
        raise UpstreamError("Agent 搜索工具返回格式无效")
    if result["code"]:
        message = result.get("message")
        if isinstance(message, str) and message in SEARCH_ERRORS:
            raise UpstreamError(message)
        raise UpstreamError("Agent 搜索工具返回失败")
    data = result.get("data")
    if not isinstance(data, dict) or not isinstance(data.get("results"), list):
        raise UpstreamError("Agent 搜索工具返回格式无效")
    return {"text": {"text": json.dumps(data, ensure_ascii=False)}}
