import json
import logging
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from astron_console.http import api_endpoint

from . import clients
from .common import (
    UpstreamError,
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
logger = logging.getLogger(__name__)


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
    old = parsed(row.parameters)
    env = payload.get("parameters", old)
    if not isinstance(env, dict) or not all(isinstance(v, str) for v in env.values()):
        raise ValidationError("MCP参数必须是文本键值对象")
    env = {k: old.get(k, "") if v == "******" else v for k, v in env.items()}
    if env and (env != old or not row.sort_link or payload.get("recordId")):
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
    # Console resolves authorized connections by URL. Re-registering a separate
    # Link identity on every edit creates unconsumed, orphaned registry entries.
    row.mcp_id = row.mcp_id or str(uuid4())
    row.sort_link = url
    row.parameters = json.dumps(env)
    row.customize = bool(env)
    row.update_time = timezone.now()
    row.save()
    logger.info("MCP connection saved id=%s", row.pk)
    return data(row)


def discovery_result(servers):
    connected = bool(servers) and all(server.get("server_status") == 0 for server in servers)
    return {
        "connectionStatus": "connected" if connected else "error",
        "connectionMessage": "连接成功" if connected else "服务发现失败，请检查连接或稍后重试",
        "tools": {
            "servers": [
                {
                    key: server[key]
                    for key in ("server_id", "server_status", "tools")
                    if key in server
                }
                for server in servers
            ]
        },
    }


def discover_many(rows):
    """Batch discovery keeps one failed server isolated and runtime URLs private."""
    rows = list(rows)
    if not rows:
        return {}
    urls = []
    for row in rows:
        try:
            if row.sort_link:
                urls.append(http_url(row.sort_link))
        except ValidationError:
            pass
    if not urls:
        return {row.pk: discovery_result([]) for row in rows}
    try:
        result = clients.call(
            "RESOURCE_TOOL_URL",
            "POST",
            "/api/v1/mcp/tool_list",
            payload={"mcp_server_urls": list(dict.fromkeys(urls))},
        )
        servers = result.get("servers", []) if isinstance(result, dict) else []
        return {
            row.pk: discovery_result(
                [
                    server
                    for server in servers
                    if server.get("server_url") == row.sort_link
                    or (
                        len(urls) == 1 and row.sort_link == urls[0] and not server.get("server_url")
                    )
                ]
            )
            for row in rows
        }
    except UpstreamError:
        logger.warning("MCP discovery failed count=%s", len(rows))
        return {
            row.pk: {
                "connectionStatus": "error",
                "connectionMessage": "服务暂时无法连接，请重试",
                "tools": {"servers": []},
            }
            for row in rows
        }


def discover(row):
    return discover_many([row])[row.pk]


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
        from .references import ensure_definition_unreferenced

        ensure_definition_unreferenced("mcp", {row.pk, row.mcp_id, row.server_id, row.sort_link})
        row.is_deleted = True
        row.save(update_fields=["is_deleted"])
        logger.info("MCP connection deleted id=%s", row.pk)
        return None
    result = data(row)
    result.update(discover(row))
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
