"""OpenAPI projection for canvas selectors; resource domain retains execution and secrets."""

import json

from django.core.exceptions import ValidationError
from django.db.models import Max

from astron_console.agents.resource_resolution import tool_query
from astron_console.http import api_endpoint
from astron_console.resources.common import page, scope_for
from astron_console.resources.tools import data as tool_data
from astron_console.spaces.permissions import scope_queryset


def canvas_tool(row):
    item = tool_data(row)
    item["id"] = str(row.pk)
    item["authInfo"] = json.dumps(item["authInfo"])
    schema = item["schema"]

    def resolved(value, seen=()):
        ref = value.get("$ref")
        if not ref:
            return value
        if not ref.startswith("#/") or ref in seen:
            raise ValidationError("工具Schema引用无效")
        target = schema
        try:
            for part in ref[2:].split("/"):
                target = target[part.replace("~1", "/").replace("~0", "~")]
        except (KeyError, TypeError) as exc:
            raise ValidationError("工具Schema引用不存在") from exc
        return resolved(target, (*seen, ref))

    def parameter(name, value, required=False, location="body", depth=0):
        if depth > 20:
            raise ValidationError("工具Schema嵌套过深")
        value = resolved(value)
        kind = value.get("type", "object" if "properties" in value else "string")
        result = {
            "id": name,
            "name": name,
            "type": kind,
            "required": required,
            "description": value.get("description", ""),
            "open": value.get("x-open", True),
            "from": value.get("x-from", 2),
            "location": location,
            "default": value.get("default", ""),
        }
        if kind == "object":
            result["children"] = [
                parameter(key, prop, key in value.get("required", []), location, depth + 1)
                for key, prop in value.get("properties", {}).items()
            ]
        elif kind == "array":
            result["children"] = [
                parameter("items", value.get("items", {}), False, location, depth + 1)
            ]
        return result

    for methods in schema.get("paths", {}).values():
        for verb, operation in methods.items():
            if verb.lower() not in {"get", "post", "put", "patch", "delete", "head", "options"}:
                continue
            if operation.get("operationId") != row.operation_id:
                continue
            inputs = [
                parameter(p["name"], p.get("schema", {}), p.get("required", False), p["in"])
                for p in [
                    resolved(p)
                    for p in methods.get("parameters", []) + operation.get("parameters", [])
                ]
            ]
            body = (
                resolved(operation.get("requestBody", {}))
                .get("content", {})
                .get("application/json", {})
                .get("schema", {})
            )
            body = resolved(body)
            inputs += [
                parameter(key, value, key in body.get("required", []))
                for key, value in body.get("properties", {}).items()
            ]
            responses = operation.get("responses", {})
            response = resolved(
                next((v for key, v in responses.items() if str(key).startswith("2")), {})
            )
            output = resolved(
                response.get("content", {}).get("application/json", {}).get("schema", {})
            )
            outputs = [parameter(key, value) for key, value in output.get("properties", {}).items()]
            item["webSchema"] = json.dumps(
                {"toolRequestInput": inputs, "toolRequestOutput": outputs}
            )
            return item
    return item


@api_endpoint(["GET"])
def listing(request):
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    query = tool_query(scope).filter(status=1)
    if request.GET.get("market") == "true":
        query = query.filter(is_public=True)
    else:
        query = scope_queryset(query, scope, uid_field="user_id")
    if request.GET.get("content"):
        query = query.filter(name__icontains=request.GET["content"][:255])
    latest = query.values("tool_id").annotate(latest=Max("id")).values("latest")
    return page(query.filter(pk__in=latest).order_by("-id"), request.GET, canvas_tool)
