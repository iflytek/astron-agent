"""Discover built-in capabilities and install them as scoped tools."""

import logging

from django.db import transaction
from django.http import Http404

from astron_console.http import api_endpoint
from astron_console.spaces.permissions import scope_queryset

from . import clients, tavily, tools
from .common import UpstreamError, scope_for, upstream_errors
from .models import Tool

logger = logging.getLogger(__name__)


def link_entries():
    result = clients.call("RESOURCE_TOOL_URL", "GET", "/api/v1/tools/builtin_catalog")
    rows = result.get("tools") if isinstance(result, dict) else None
    if not isinstance(rows, list):
        raise UpstreamError("内置工具目录返回格式无效")
    return rows


@api_endpoint(["GET"])
@upstream_errors
def catalog(request):
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    try:
        rows = link_entries()
    except UpstreamError:
        logger.warning("Link catalog unavailable; serving Console-managed built-in tools")
        rows = []
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
        for row in [*rows, tavily.catalog_entry()]
    ]


@api_endpoint(["POST"])
@upstream_errors
def install(request, catalog_id):
    scope = scope_for(request, "ToolBoxController_createTool_POST")
    if catalog_id == tavily.CATALOG_ID:
        return install_tavily(request, scope)
    rows = Tool.objects.filter(deleted=False, status=1, tool_tag="builtin:" + catalog_id)
    existing = scope_queryset(rows, scope, uid_field="user_id").order_by("-id").first()
    if existing:
        return tools.data(existing)
    row = next((row for row in link_entries() if row["id"] == catalog_id), None)
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


@transaction.atomic
def install_tavily(request, scope):
    tavily.lock_scope(scope)
    rows = Tool.objects.filter(deleted=False, tool_tag=tavily.TAG)
    existing = scope_queryset(rows, scope, uid_field="user_id").order_by("-id").first()
    if existing:
        return tools.data(existing)
    return tools.save(
        request,
        payload={
            "name": tavily.NAME,
            "description": tavily.DESCRIPTION,
            "schema": tavily.schema(),
            "draft": True,
        },
        builtin_id=tavily.CATALOG_ID,
    )
