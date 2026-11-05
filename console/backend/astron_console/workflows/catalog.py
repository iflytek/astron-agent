"""Canvas projections of the authorized Console resource catalog.

Runtime endpoints and credentials stay in the resource domain. These projections
preserve the canvas response contract while selecting with the 03 scope rules.
"""

import json
import re

from django.core.exceptions import ValidationError
from django.db.models import Q

from astron_console.agents.resource_resolution import scoped, select, tool_query
from astron_console.http import api_endpoint
from astron_console.resources import clients
from astron_console.resources.common import (
    number,
    parsed,
    scope_for,
    serialize,
    text,
    upstream_errors,
)
from astron_console.resources.model_views import _java_llm_id
from astron_console.resources.models import McpConfig, Model

from .management_views import LIST
from .models import PromptTemplate
from .tool_catalog import canvas_tool


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
def prompts(request):
    scope = scope_for(request, LIST)
    # Retained global templates have no owner. User templates remain private.
    rows = PromptTemplate.objects.filter(deleted=False).filter(
        Q(uid=scope.uid) | Q(uid__in=["", "-1"]) | Q(uid__isnull=True)
    )
    if request.GET.get("search"):
        rows = rows.filter(name__icontains=request.GET["search"][:255])
    size = number(request.GET.get("pageSize"), 20, 1000)
    current = number(request.GET.get("current"), 1)
    data = []
    for row in rows.order_by("-id")[(current - 1) * size : current * size]:
        item = serialize(row, exclude=("uid", "prompt", "deleted"))
        model = parsed(row.adaptation_model)
        if isinstance(model, dict):
            model = {
                key: value
                for key, value in model.items()
                if key
                in {"id", "modelId", "llmId", "domain", "serviceId", "isThink", "provider", "name"}
            }
        else:
            model = {}
        item["adaptationModel"] = json.dumps(model, ensure_ascii=False)
        prompt = parsed(row.prompt)
        item.update(
            {key: prompt.get(key, "") for key in ("characterSettings", "thinkStep", "userQuery")}
        )
        item["inputs"] = [
            {"name": name}
            for name in dict.fromkeys(
                re.findall(r"\{\{\s*([\w]+)\s*\}\}", json.dumps(prompt, ensure_ascii=False))
            )
        ]
        data.append(item)
    return {"pageData": data, "totalCount": rows.count()}


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
