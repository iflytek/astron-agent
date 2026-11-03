import json
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from astron_console.http import api_endpoint

from . import clients
from .common import (
    http_url,
    listing,
    owned,
    page,
    parsed,
    scope_for,
    serialize,
    text,
    upstream_errors,
)
from .models import McpConfig

READ = "ToolBoxController_getDetail_GET"
WRITE = "ToolBoxController_updateTool_PUT"


def data(row):
    result = serialize(row, exclude=("parameters", "sort_link"))
    result["parameters"] = {key: "******" for key in parsed(row.parameters)}
    # A shortened runtime URL can itself be a bearer credential.
    result["configured"] = bool(row.sort_link)
    return result


@api_endpoint(["GET"])
def catalog(request):
    scope_for(request, "ToolBoxController_listTools_GET")
    result = []
    for path in (Path(__file__).parent / "mcp_catalog").glob("*.json"):
        item = json.loads(path.read_text())
        result.append({"id": item["id"], **item["mcp"]})
    return result


@api_endpoint(["GET", "POST"])
@upstream_errors
def collection(request):
    if request.method == "POST":
        return save(request)
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    return page(
        listing(McpConfig.objects.filter(is_deleted=False), scope, request.GET), request.GET, data
    )


def save(request, pk=None):
    if pk is None:
        scope = scope_for(request, "ToolBoxController_createTool_POST")
        row = McpConfig(
            uid=scope.uid, space_id=scope.space_id, mcp_id=str(uuid4()), is_deleted=False
        )
    else:
        row, scope = owned(request, McpConfig, pk, WRITE)
    payload = request.payload
    row.name = text(payload, "name", required=True, limit=255)
    row.content = text(payload, "description", limit=10000)
    url = text(payload, "serverUrl", limit=1024) or row.sort_link
    if not url:
        raise ValidationError("MCP地址必填")
    http_url(url)
    env = payload.get("parameters", {})
    if not isinstance(env, dict) or not all(isinstance(v, str) for v in env.values()):
        raise ValidationError("MCP参数必须是文本键值对象")
    old = parsed(row.parameters)
    env = {k: old.get(k, "") if v == "******" else v for k, v in env.items()}
    if env:
        short = clients.call(
            "RESOURCE_MCP_SHORT_URL",
            "POST",
            "/mcp/v1/shorten",
            payload={
                "env": env,
                **({"record": payload["recordId"]} if payload.get("recordId") else {}),
            },
            headers={"x-consumer-username": settings.RESOURCE_APP_ID},
        )
        if not isinstance(short, dict) or not short.get("url"):
            raise ValidationError("MCP服务未返回地址")
        url = short["url"]
    # Confirm the actual server is reachable; core/link owns the MCP SDK and transport.
    result = clients.call(
        "RESOURCE_TOOL_URL", "POST", "/api/v1/mcp/tool_list", payload={"mcp_server_urls": [url]}
    )
    servers = result.get("servers", []) if isinstance(result, dict) else []
    if not servers or any(server.get("server_status") != 0 for server in servers):
        raise ValidationError("MCP服务连接失败")
    registered = clients.call(
        "RESOURCE_TOOL_URL",
        "POST",
        "/api/v1/mcp",
        payload={
            "app_id": settings.RESOURCE_APP_ID,
            "name": row.name,
            "description": row.content,
            "mcp_server_url": url,
            "type": "docker",
            "mcp_schema": "",
        },
    )
    if not isinstance(registered, dict) or not registered.get("id"):
        raise ValidationError("MCP注册失败")
    row.server_id = registered["id"]
    row.sort_link = url
    row.parameters = json.dumps(env)
    row.customize = bool(env)
    row.update_time = timezone.now()
    row.save()
    return data(row)


@api_endpoint(["GET", "PUT", "DELETE"])
@upstream_errors
def item(request, pk):
    if request.method == "PUT":
        return save(request, pk)
    row, _ = owned(
        request,
        McpConfig,
        pk,
        READ if request.method == "GET" else "ToolBoxController_deleteTool_DELETE",
    )
    if request.method == "DELETE":
        row.is_deleted = True
        row.save(update_fields=["is_deleted"])
        return None
    result = data(row)
    tool_list = clients.call(
        "RESOURCE_TOOL_URL",
        "POST",
        "/api/v1/mcp/tool_list",
        payload={"mcp_server_urls": [row.sort_link]},
    )
    # The upstream echoes the bearer URL; the browser only needs tool definitions.
    result["tools"] = {
        "servers": [
            {key: server[key] for key in ("server_id", "server_status", "tools") if key in server}
            for server in tool_list.get("servers", [])
        ]
    }
    return result


@api_endpoint(["POST"])
@upstream_errors
def debug(request, pk):
    row, _ = owned(request, McpConfig, pk, "ToolBoxController_debugToolV2_POST")
    args = request.payload.get("arguments", {})
    if not isinstance(args, dict):
        raise ValidationError("arguments必须是对象")
    return clients.call(
        "RESOURCE_TOOL_URL",
        "POST",
        "/api/v1/mcp/call_tool",
        payload={
            "mcp_server_url": row.sort_link,
            "tool_name": text(request.payload, "name", required=True),
            "tool_args": args,
        },
    )
