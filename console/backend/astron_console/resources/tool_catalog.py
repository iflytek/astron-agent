"""Built-in capabilities are discovered from Link, then installed as scoped tools."""

from django.http import Http404

from astron_console.http import api_endpoint
from astron_console.spaces.permissions import scope_queryset

from . import clients, tools
from .common import UpstreamError, scope_for, upstream_errors
from .models import Tool


def entries():
    result = clients.call("RESOURCE_TOOL_URL", "GET", "/api/v1/tools/builtin_catalog")
    rows = result.get("tools") if isinstance(result, dict) else None
    if not isinstance(rows, list):
        raise UpstreamError("内置工具目录返回格式无效")
    return rows


@api_endpoint(["GET"])
@upstream_errors
def catalog(request):
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    installed = set(
        scope_queryset(Tool.objects.filter(deleted=False), scope, uid_field="user_id").values_list(
            "tool_tag", flat=True
        )
    )
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "version": row.get("version", "V1.0"),
            "schema": tools.scrub(row["openapi_schema"]),
            "available": bool(row.get("available", False)),
            "configured": bool(row.get("configured", False)),
            "health": row.get("health", "unknown"),
            "configurationHint": row.get("configurationHint", "实际调用取决于厂商授权"),
            "installed": "builtin:" + row["id"] in installed,
        }
        for row in entries()
    ]


@api_endpoint(["POST"])
@upstream_errors
def install(request, catalog_id):
    scope = scope_for(request, "ToolBoxController_createTool_POST")
    existing = (
        scope_queryset(
            Tool.objects.filter(deleted=False, status=1, tool_tag="builtin:" + catalog_id),
            scope,
            uid_field="user_id",
        )
        .order_by("-id")
        .first()
    )
    if existing:
        return tools.data(existing)
    row = next((row for row in entries() if row["id"] == catalog_id), None)
    if row is None:
        raise Http404
    return tools.save(
        request,
        payload={
            "name": row["name"],
            "description": row["description"],
            "schema": row["openapi_schema"],
        },
        builtin_id=catalog_id,
    )
