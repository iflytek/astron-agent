"""Canvas projections of the authorized Console resource catalog.

Runtime endpoints and credentials stay in the resource domain. These projections
preserve the canvas response contract while selecting with the 03 scope rules.
"""

from urllib.parse import urlsplit

from django.core.exceptions import ValidationError

from astron_console.agents.resource_resolution import scoped, select, tool_query
from astron_console.http import api_endpoint
from astron_console.resources import clients
from astron_console.resources.common import (
    scope_for,
    text,
    upstream_errors,
)
from astron_console.resources.model_views import _java_llm_id
from astron_console.resources.models import McpConfig, Model

from .management_views import LIST
from .tool_catalog import canvas_tool


def avatar_endpoint(endpoint):
    """Project known public origins only; never expose private URLs or credentials."""
    hosts = {
        "api.openai.com",
        "api.anthropic.com",
        "generativelanguage.googleapis.com",
        "api.minimaxi.com",
        "open.bigmodel.cn",
        "dashscope.aliyuncs.com",
        "api.moonshot.cn",
        "ark.cn-beijing.volces.com",
        "api.deepseek.com",
        "dashscope-intl.aliyuncs.com",
        "dashscope-us.aliyuncs.com",
        "cn-hongkong.dashscope.aliyuncs.com",
        "api.minimax.io",
        "api.moonshot.ai",
        "api.z.ai",
        "ark.ap-southeast.bytepluses.com",
        "spark-api-open.xf-yun.com",
        "spark-api.xf-yun.com",
        "spark-openapi.cn-huabei-1.xf-yun.com",
        "maas-api.cn-huabei-1.xf-yun.com",
    }
    try:
        parsed_url = urlsplit(endpoint)
        return (
            f"https://{parsed_url.hostname}"
            if (parsed_url.scheme in {"http", "https"} and parsed_url.hostname in hosts)
            else ""
        )
    except ValueError:
        return ""


@api_endpoint(["GET"])
def models(request):
    scope = scope_for(request, LIST)
    rows = scoped(
        Model.objects.filter(is_deleted=False, enable=True), scope, "ModelController_list_POST"
    )
    return {
        "workflow": [
            {
                "modelList": [
                    {
                        "id": row.pk,
                        "modelId": row.pk,
                        "llmId": _java_llm_id(row.pk),
                        "name": row.name or row.domain,
                        "domain": row.domain,
                        "provider": row.provider,
                        "serviceId": row.domain,
                        "llmSource": 0,
                        "config": row.config or "[]",
                        "isThink": bool(row.is_think),
                        "multiMode": bool(row.multi_mode),
                        "icon": row.image_url or "",
                        "avatarEndpoint": avatar_endpoint(row.url),
                        "desc": row.desc or "",
                        "url": "",
                    }
                    for row in rows.order_by("id")
                ]
            }
        ]
    }


def mcp_rows(scope):
    return scoped(
        McpConfig.objects.filter(is_deleted=False), scope, "ToolBoxController_getDetail_GET"
    )


def mcp_tools(row):
    result = clients.call(
        "RESOURCE_TOOL_URL",
        "POST",
        "/api/v1/mcp/tool_list",
        payload={"mcp_server_urls": [row.sort_link]},
    )
    return [tool for server in result.get("servers", []) for tool in server.get("tools", [])]


@api_endpoint(["GET"])
@upstream_errors
def mcp_list(request):
    scope = scope_for(request, LIST)
    return [
        {
            "id": str(row.pk),
            "spark_id": str(row.pk),
            "name": row.name,
            "server_url": "",
            "brief": row.content or "",
            "logo_url": "",
            "create_time": row.create_time,
            "tools": mcp_tools(row),
        }
        for row in mcp_rows(scope).order_by("id")
    ]


@api_endpoint(["GET"])
@upstream_errors
def mcp_detail(request):
    row = select(mcp_rows(scope_for(request, LIST)), request.GET.get("serverId"), remote="mcp_id")
    return {
        "id": str(row.pk),
        "name": row.name,
        "description": row.content or "",
        "tools": mcp_tools(row),
        "server_url": "",
    }


@api_endpoint(["POST"])
@upstream_errors
def mcp_debug(request):
    scope = scope_for(request, "ToolBoxController_debugToolV2_POST")
    row = select(mcp_rows(scope), request.payload.get("mcpServerId"), remote="mcp_id")
    arguments = request.payload.get("toolArgs", {})
    if not isinstance(arguments, dict):
        raise ValidationError("toolArgs必须是对象")
    return clients.call(
        "RESOURCE_TOOL_URL",
        "POST",
        "/api/v1/mcp/call_tool",
        payload={
            "mcp_server_url": row.sort_link,
            "tool_name": text(request.payload, "toolName", required=True),
            "tool_args": arguments,
        },
    )


@api_endpoint(["GET"])
def tool_versions(request):
    query = tool_query(scope_for(request, LIST))
    if request.GET.get("toolId"):
        return [
            canvas_tool(row) for row in query.filter(tool_id=request.GET["toolId"]).order_by("-id")
        ]
    ids = request.GET.get("toolIds", "").split(",")[:100]
    latest = {}
    for row in query.filter(tool_id__in=ids, status=1).order_by("-id"):
        latest.setdefault(row.tool_id, row.version)
    return latest
