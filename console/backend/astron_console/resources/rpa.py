from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint

from . import clients
from .common import listing, number, owned, parsed, scope_for, serialize, text, upstream_errors
from .models import RpaAssistant, RpaField, RpaPlatform

READ = "ToolBoxController_getDetail_GET"
WRITE = "ToolBoxController_updateTool_PUT"


def data(row):
    result = serialize(row)
    result["fields"] = {
        f.field_key: "******" if f.field_value else ""
        for f in RpaField.objects.filter(assistant_id=row.pk)
    }
    return result


def robot_list(fields):
    token = fields.get("apiKey") or fields.get("apiToken") or fields.get("token")
    if not token:
        raise ValidationError("RPA API Key必填")
    result = clients.call(
        "RESOURCE_RPA_URL",
        "GET",
        "/api/rpa-openapi/workflows/get",
        params={"pageNo": 1, "pageSize": 1000},
        headers={"Authorization": "Bearer " + token},
        success=("0000",),
    )
    if not isinstance(result, dict):
        raise ValidationError("RPA响应格式错误")
    for robot in result.get("records", []):
        for parameter in robot.get("parameters", []):
            parameter["type"] = {"Float": "number", "Int": "integer"}.get(
                parameter.get("varType"), "string"
            )
    return result


@api_endpoint(["GET"])
def sources(request):
    scope_for(request, READ)
    return [serialize(row) for row in RpaPlatform.objects.filter(is_deleted=0)]


@api_endpoint(["GET"])
def items(request):
    scope = scope_for(request, "ToolBoxController_listTools_GET")
    query = listing(
        RpaAssistant.objects.all(),
        scope,
        request.GET,
        uid_field="user_id",
        name_field="assistant_name",
    )
    return [data(row) for row in query]


@api_endpoint(["POST", "GET", "PUT", "DELETE"])
@upstream_errors
def item(request, pk=None):
    if pk is not None:
        permission = READ if request.method == "GET" else WRITE
        row, scope = owned(request, RpaAssistant, pk, permission, uid_field="user_id", deleted=None)
    else:
        scope = scope_for(request, "ToolBoxController_createTool_POST")
        row = RpaAssistant(
            user_id=scope.uid, space_id=scope.space_id, user_name=request.user.username
        )
    if request.method == "GET":
        result = data(row)
        fields = dict(
            RpaField.objects.filter(assistant_id=row.pk).values_list("field_key", "field_value")
        )
        result["robots"] = robot_list(fields).get("records", [])
        return result
    if request.method == "DELETE":
        with transaction.atomic():
            RpaField.objects.filter(assistant_id=row.pk).delete()
            row.delete()
        return None
    payload = request.payload
    platform = RpaPlatform.objects.filter(
        id=number(payload.get("platformId", row.platform_id)), is_deleted=0
    ).first()
    if platform is None:
        raise Http404
    specs = parsed(platform.value, [])
    if not isinstance(specs, list):
        raise ValidationError("RPA平台配置无效")
    previous = (
        dict(RpaField.objects.filter(assistant_id=row.pk).values_list("field_key", "field_value"))
        if row.pk
        else {}
    )
    fields = payload.get("fields", {})
    if not isinstance(fields, dict):
        raise ValidationError("RPA字段无效")
    merged = {}
    for spec in specs:
        key = spec["name"]
        value = fields.get(key, previous.get(key, ""))
        if value == "******":
            value = previous.get(key, "")
        if (
            not isinstance(value, str)
            or len(value) > 8192
            or (spec.get("required") and not value.strip())
        ):
            raise ValidationError(f"{key}无效")
        merged[key] = value
    remote = robot_list(merged)
    row.platform_id = platform.pk
    row.assistant_name = text(payload, "assistantName", required=True, limit=128)
    if (
        RpaAssistant.objects.filter(user_id=scope.uid, assistant_name=row.assistant_name)
        .exclude(pk=row.pk)
        .exists()
    ):
        raise ValidationError("RPA名称已存在")
    row.remarks = text(payload, "remarks", limit=1000)
    row.icon = text(payload, "icon", limit=100)
    row.robot_count = remote.get("total", len(remote.get("records", [])))
    row.update_time = timezone.now()
    with transaction.atomic():
        row.save()
        for key, value in merged.items():
            RpaField.objects.update_or_create(
                assistant_id=row.pk,
                field_key=key,
                defaults={"field_value": value, "update_time": timezone.now()},
            )
    return data(row)


@api_endpoint(["POST"])
@upstream_errors
def debug(request):
    import json

    import httpx
    from django.conf import settings
    from django.http import StreamingHttpResponse

    from .common import UpstreamError, http_url

    row, _ = owned(
        request,
        RpaAssistant,
        request.payload.get("assistantId"),
        "ToolBoxController_debugToolV2_POST",
        uid_field="user_id",
        deleted=None,
    )
    fields = dict(
        RpaField.objects.filter(assistant_id=row.pk).values_list("field_key", "field_value")
    )
    token = fields.get("apiKey") or fields.get("apiToken") or fields.get("token")
    if not token:
        raise ValidationError("RPA凭据未配置")
    base = getattr(settings, "RESOURCE_RPA_EXEC_URL", "").rstrip("/")
    if not base:
        raise UpstreamError("RPA执行服务未配置")
    http_url(base)
    params = request.payload.get("params", {})
    if not isinstance(params, dict):
        raise ValidationError("RPA参数必须是对象")
    payload = {
        "project_id": text(request.payload, "projectId", required=True),
        "exec_position": text(request.payload, "execPosition") or "EXECUTOR",
        "params": params,
    }
    if request.payload.get("version") is not None:
        payload["version"] = number(request.payload["version"])

    async def stream():
        try:
            async with httpx.AsyncClient(timeout=1800, follow_redirects=False) as client:
                async with client.stream(
                    "POST", base + "/rpa/v1/exec", json=payload, headers={"Authorization": token}
                ) as upstream:
                    upstream.raise_for_status()
                    async for chunk in upstream.aiter_bytes():
                        yield chunk
        except httpx.HTTPError:
            yield (
                "event: error\ndata: "
                + json.dumps({"message": "RPA执行服务请求失败"}, ensure_ascii=False)
                + "\n\n"
            ).encode()

    result = StreamingHttpResponse(stream(), content_type="text/event-stream")
    result["Cache-Control"] = "no-store"
    result["X-Accel-Buffering"] = "no"
    return result
