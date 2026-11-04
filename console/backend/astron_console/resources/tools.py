import base64
import json
import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.db.models import Max, Q
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.spaces.models import GroupVisibility
from astron_console.spaces.permissions import require_resource_access, scope_queryset

from . import clients
from .common import (
    UpstreamError,
    http_url,
    number,
    owned,
    page,
    parsed,
    scope_for,
    serialize,
    text,
    upstream_errors,
)
from .models import Tool, ToolFavorite, ToolFeedback, ToolHistory

logger = logging.getLogger(__name__)
READ = "ToolBoxController_getDetail_GET"
WRITE = "ToolBoxController_updateTool_PUT"


def scrub(value):
    if isinstance(value, dict):
        return {
            k: ("******" if v else "")
            if not isinstance(v, (dict, list))
            and k.lower()
            in {
                "x-value",
                "servicetoken",
                "apikey",
                "apitoken",
                "password",
                "authorization",
                "token",
                "secret",
                "api_key",
                "api_token",
                "access_token",
                "client_secret",
            }
            else scrub(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [scrub(v) for v in value]
    return value


def preserve_masked(value, old):
    if value == "******":
        return old
    if isinstance(value, dict):
        return {
            k: preserve_masked(v, old.get(k) if isinstance(old, dict) else None)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [
            preserve_masked(v, old[i] if isinstance(old, list) and i < len(old) else None)
            for i, v in enumerate(value)
        ]
    return value


def data(row):
    result = serialize(row, exclude=("auth_info", "schema", "temporary_data"))
    result["schema"] = scrub(stored_schema(row))
    result["authInfo"] = scrub(parsed(row.auth_info))
    result["temporaryData"] = scrub(parsed(row.temporary_data))
    return result


def stored_schema(row):
    """Expose retained service credentials through the editable OpenAPI definition."""
    schema = parsed(row.schema)
    auth = parsed(row.auth_info)
    if not schema.get("components", {}).get("securitySchemes") and auth.get("serviceToken"):
        location = (auth.get("location") or "").lower()
        name = auth.get("parameterName")
        if name and location in {"header", "query"}:
            schema.setdefault("components", {})["securitySchemes"] = {
                name: {
                    "type": "apiKey",
                    "in": location,
                    "name": name,
                    "x-value": auth["serviceToken"],
                }
            }
            schema["security"] = [{name: []}]
    return schema


def schema_auth(schema):
    """The first operation is the tool's persisted debug operation."""
    for methods in schema.get("paths", {}).values():
        for method, operation in methods.items():
            if method.lower() not in {"get", "post", "put", "delete", "patch", "head", "options"}:
                continue
            requirements = operation.get("security", schema.get("security", []))
            schemes = schema.get("components", {}).get("securitySchemes", {})
            for requirement in requirements:
                credentials = []
                for key in requirement:
                    scheme = schemes.get(key, {})
                    if scheme.get("type") == "apiKey" and scheme.get("in") in {"header", "query"}:
                        if not scheme.get("name") or not scheme.get("x-value"):
                            raise ValidationError("工具鉴权字段和凭据必填")
                        credentials.append(
                            {
                                "location": scheme["in"],
                                "parameterName": scheme["name"],
                                "serviceToken": scheme["x-value"],
                            }
                        )
                    else:
                        raise ValidationError("工具仅支持 header/query API Key 鉴权")
                return credentials
            return []
    return []


def readable(request, pk, permission=READ):
    scope = scope_for(request, permission)
    row = Tool.objects.filter(pk=number(pk), deleted=False).first()
    if row is None:
        raise Http404
    shared = GroupVisibility.objects.filter(
        type=2, user_id=scope.uid, relation_id=str(row.pk), space_id=scope.space_id
    ).exists()
    if row.is_public or shared:
        return row, scope
    require_resource_access(
        scope, owner_uid=row.user_id, space_id=row.space_id, permission_key=permission
    )
    return row, scope


@api_endpoint(["GET", "POST"])
@upstream_errors
def collection(request):
    if request.method == "POST":
        return save(request)
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    query = Tool.objects.filter(deleted=False)
    if request.GET.get("market") == "true":
        query = query.filter(is_public=True, status=1)
    else:
        query = scope_queryset(query, scope, uid_field="user_id")
    if request.GET.get("name"):
        query = query.filter(name__icontains=text(request.GET, "name"))
    if request.GET.get("favorites") == "true":
        ids = ToolFavorite.objects.filter(user_id=scope.uid, is_deleted=0).values_list(
            "plugin_tool_id", flat=True
        )
        query = query.filter(tool_id__in=ids)
    latest = (
        query.exclude(tool_id__isnull=True)
        .exclude(tool_id="")
        .values("tool_id")
        .annotate(latest=Max("id"))
        .values("latest")
    )
    query = query.filter(Q(pk__in=latest) | Q(tool_id__isnull=True) | Q(tool_id=""))
    return page(query.order_by("-id"), request.GET, data)


def normalize_schema(value, old=None):
    value = parsed(value)
    if not isinstance(value, dict) or not value.get("paths") or not value.get("openapi"):
        raise ValidationError("必须提供含 paths 的 OpenAPI 3 文档")
    value = preserve_masked(value, old or {})
    servers = value.get("servers")
    if not isinstance(servers, list) or not servers:
        raise ValidationError("OpenAPI servers 必填")
    for server in servers:
        http_url(server.get("url", ""))
    operations = []
    for path, methods in value["paths"].items():
        if not path.startswith("/") or not isinstance(methods, dict):
            raise ValidationError("OpenAPI paths 无效")
        for method, operation in methods.items():
            if method.lower() in {"get", "post", "put", "delete", "patch", "head", "options"}:
                if not isinstance(operation, dict) or not operation.get("operationId"):
                    raise ValidationError("每个操作需要 operationId")
                operations.append((path, method, operation["operationId"]))
    if not operations:
        raise ValidationError("OpenAPI 未定义操作")
    return value, operations


def save(request, pk=None):
    payload = request.payload
    if pk is not None:
        row, scope = owned(request, Tool, pk, WRITE, uid_field="user_id", deleted="deleted")
    else:
        scope = scope_for(request, "ToolBoxController_createTool_POST")
        row = Tool(
            user_id=scope.uid,
            space_id=scope.space_id,
            app_id=settings.RESOURCE_APP_ID,
            deleted=False,
        )
    schema, operations = normalize_schema(payload.get("schema"), stored_schema(row))
    credentials = schema_auth(schema)
    row.name = text(payload, "name", required=True, limit=64)
    row.description = text(payload, "description", required=True, limit=255)
    version = text(payload, "version", limit=100) or row.version or "V1.0"
    if payload.get("draft") is True:
        row.temporary_data = json.dumps(
            {
                "name": row.name,
                "description": row.description,
                "schema": schema,
                "version": version,
            },
            ensure_ascii=False,
        )
        if not row.pk:
            row.schema = json.dumps(schema, ensure_ascii=False)
            row.version = version
            row.status = 0
        row.save()
        return data(row)
    if row.tool_id:
        if version == row.version:
            import re

            match = re.fullmatch(r"V(\d+)\.(\d+)", version)
            if not match:
                raise ValidationError("请为新版指定不同的版本号")
            version = f"V{int(match.group(1)) + 1}.{match.group(2)}"
        if Tool.objects.filter(tool_id=row.tool_id, version=version, deleted=False).exists():
            raise ValidationError("工具版本已存在")
    info = {
        "name": row.name,
        "description": row.description,
        "schema_type": 0,
        "openapi_schema": base64.b64encode(
            json.dumps(schema, ensure_ascii=False).encode()
        ).decode(),
    }
    if row.tool_id:
        info["id"] = row.tool_id
        info["version"] = version
    result = clients.call(
        "RESOURCE_TOOL_URL",
        "PUT" if row.tool_id else "POST",
        "/api/v1/tools/versions",
        payload={
            "header": {"app_id": row.app_id or settings.RESOURCE_APP_ID},
            "payload": {"tools": [info]},
        },
    )
    if row.tool_id:
        # Core PUT acknowledges the requested version with data.result, not tools[].
        # Keep the remote identity and add a local row so old workflow references survive.
        row.pk = None
        row.create_time = timezone.now()
    else:
        created = result.get("tools") if isinstance(result, dict) else None
        if (
            not isinstance(created, list)
            or len(created) != 1
            or not isinstance(created[0], dict)
            or any(
                not isinstance(created[0].get(key), str) or not created[0][key].strip()
                for key in ("id", "version")
            )
        ):
            raise UpstreamError("工具服务未返回工具ID和版本")
        row.tool_id = created[0]["id"]
        # CreateInfo has no version field; the creation response is authoritative.
        version = created[0]["version"]
    row.version = version
    row.schema = json.dumps(schema, ensure_ascii=False)
    row.auth_info = json.dumps(credentials[0] if credentials else {})
    row.auth_type = 2 if credentials else 0
    row.end_point = schema["servers"][0]["url"].rstrip("/") + operations[0][0]
    row.method = operations[0][1]
    row.operation_id = operations[0][2]
    row.temporary_data = ""
    row.status = 1
    row.update_time = timezone.now()
    row.save()
    logger.info("Tool synchronized id=%s remote=%s version=%s", row.id, row.tool_id, row.version)
    return data(row)


@api_endpoint(["GET", "PUT", "DELETE"])
@upstream_errors
def item(request, pk):
    if request.method == "GET":
        return data(readable(request, pk)[0])
    if request.method == "PUT":
        return save(request, pk)
    row, _ = owned(
        request,
        Tool,
        pk,
        "ToolBoxController_deleteTool_DELETE",
        uid_field="user_id",
        deleted="deleted",
    )
    if row.tool_id:
        tables = connection.introspection.table_names()
        for table in ("flow_tool_rel", "bot_tool_rel"):
            if table in tables:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"SELECT 1 FROM {table} WHERE tool_id = %s LIMIT 1", [row.tool_id]
                    )
                    if cursor.fetchone():
                        raise ValidationError("工具仍被 Agent 或工作流引用，无法删除")
        clients.call(
            "RESOURCE_TOOL_URL",
            "DELETE",
            "/api/v1/tools/versions",
            params={"app_id": row.app_id, "tool_ids": [row.tool_id]},
        )
        Tool.objects.filter(tool_id=row.tool_id).update(deleted=True, update_time=timezone.now())
    else:
        row.deleted = True
        row.save(update_fields=["deleted"])

    return None


@api_endpoint(["POST"])
@upstream_errors
def debug(request, pk):
    row, scope = readable(request, pk, "ToolBoxController_debugToolV2_POST")
    schema = stored_schema(row)
    # Always execute the authorized persisted definition, not a client-supplied official URL.
    payload = {
        "server": row.end_point,
        "method": (row.method or "GET").upper(),
        "openapi_schema": json.dumps(schema),
    }
    for key in ("path", "query", "header", "body"):
        if key == "body" and key not in request.payload:
            continue
        value = request.payload.get(key, {})
        if not isinstance(value, dict):
            raise ValidationError(f"{key}必须是对象")
        payload[key] = value
    for auth in schema_auth(schema):
        payload[auth["location"]][auth["parameterName"]] = auth["serviceToken"]
    result = clients.call("RESOURCE_TOOL_URL", "POST", "/api/v1/tools/tool_debug", payload=payload)
    ToolHistory.objects.create(tool_id=row.tool_id or str(row.pk), uid=scope.uid, type=1)
    return result


@api_endpoint(["POST"])
def favorite(request, pk):
    row, scope = readable(request, pk, "ToolBoxController_favorite_GET")
    if not row.tool_id or row.status != 1:
        raise ValidationError("草稿不能收藏")
    value = request.payload.get("favorite")
    if not isinstance(value, bool):
        raise ValidationError("favorite必须是布尔值")
    with transaction.atomic():
        item = (
            ToolFavorite.objects.select_for_update()
            .filter(user_id=scope.uid, plugin_tool_id=row.tool_id)
            .first()
        )
        if not item:
            item = ToolFavorite(user_id=scope.uid, tool_id=row.pk, plugin_tool_id=row.tool_id)
        item.is_deleted = 0 if value else 1
        item.save()
        row.favorite_count = ToolFavorite.objects.filter(
            plugin_tool_id=row.tool_id, is_deleted=0
        ).count()
        row.save(update_fields=["favorite_count"])
    return value


@api_endpoint(["POST"])
def publish(request, pk):
    row, _ = owned(request, Tool, pk, WRITE, uid_field="user_id", deleted="deleted")
    if row.status != 1:
        raise ValidationError("草稿不能发布到工具市场")
    value = request.payload.get("public")
    if not isinstance(value, bool):
        raise ValidationError("public必须是布尔值")
    row.is_public = value
    row.save(update_fields=["is_public"])
    return data(row)


@api_endpoint(["GET"])
@upstream_errors
def versions(request, pk):
    row, _ = readable(request, pk)
    if not row.tool_id:
        return [data(row)]
    return [
        data(version)
        for version in Tool.objects.filter(
            tool_id=row.tool_id, user_id=row.user_id, space_id=row.space_id, deleted=False
        ).order_by("-id")
    ]


@api_endpoint(["POST"])
def feedback(request, pk):
    row, scope = readable(request, pk)
    ToolFeedback.objects.create(
        user_id=scope.uid,
        tool_id=row.tool_id,
        name=row.name,
        remark=text(request.payload, "remark", required=True, limit=1000),
    )
    return None
