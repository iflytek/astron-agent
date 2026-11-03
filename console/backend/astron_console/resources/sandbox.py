import logging
import secrets

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection
from django.http import Http404
from django.utils import timezone

from astron_console.accounts.http import response
from astron_console.http import api_endpoint
from astron_console.spaces.permissions import (
    ResourceScope,
    require_space_permission,
    scope_queryset,
)

from .clients import normalize_provider
from .common import UpstreamError, number, scope_for, serialize, text, upstream_errors
from .models import Model, SandboxConfig, WorkflowScope

logger = logging.getLogger(__name__)
READ = "ToolBoxController_getDetail_GET"
WRITE = "ToolBoxController_updateTool_PUT"


def service_auth(request, setting, header):
    configured = getattr(settings, setting, "")
    candidate = request.headers.get(header, "")
    if (
        not configured
        or not candidate
        or not secrets.compare_digest(configured.encode(), candidate.encode())
    ):
        raise PermissionDenied


def workflow_scope(flow_id):
    if "workflow" not in connection.introspection.table_names():
        raise Http404
    if not isinstance(flow_id, str) or not flow_id.strip():
        raise ValidationError("flowId必填")
    rows = list(WorkflowScope.objects.filter(flow_id=flow_id.strip(), deleted=False)[:2])
    if len(rows) != 1:
        raise Http404
    return rows[0]


def no_store(data):
    result = response(data)
    result["Cache-Control"] = "no-store"
    return result


@api_endpoint(["GET"], authenticated=False)
def model_runtime(request):
    service_auth(request, "WORKFLOW_INTERNAL_API_KEY", "X-Workflow-Internal-Key")
    workflow = workflow_scope(request.GET.get("flowId"))
    query = Model.objects.filter(
        id=number(request.GET.get("modelId")),
        is_deleted=False,
        enable=True,
        space_id=workflow.space_id,
    )
    if workflow.space_id is None:
        query = query.filter(uid=workflow.uid)
    model = query.first()
    if model is None:
        raise Http404
    return no_store(
        {
            "modelId": model.pk,
            "provider": normalize_provider(model.provider),
            "api": model.url,
            "domain": model.domain,
            "apiKey": model.api_key,
        }
    )


def masked(row):
    if row is None:
        return {
            "provider": "e2b",
            "enabled": False,
            "apiKey": "",
            "apiKeyMasked": False,
            "timeoutSeconds": 60,
            "allowInternetAccess": False,
        }
    result = serialize(row, exclude=("api_key",))
    result.update(apiKey="********" if row.api_key else "", apiKeyMasked=bool(row.api_key))
    return result


def save(request):
    scope = scope_for(request, WRITE)
    row = scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first()
    row = row or SandboxConfig(uid=scope.uid, space_id=scope.space_id)
    payload = request.payload
    if payload.get("provider", "e2b") != "e2b":
        raise ValidationError("沙箱仅支持e2b")
    row.timeout_seconds = number(payload.get("timeoutSeconds"), 60, 3600)
    for field, key in [("enabled", "enabled"), ("allow_internet_access", "allowInternetAccess")]:
        value = payload.get(key, False)
        if not isinstance(value, bool):
            raise ValidationError(f"{key}格式无效")
        setattr(row, field, value)
    if payload.get("apiKeyMasked") is not True:
        row.api_key = text(payload, "apiKey", limit=1024)
    if row.enabled and not row.api_key:
        raise ValidationError("启用沙箱需要 API Key")
    row.update_time = timezone.now()
    row.save()
    return row


@api_endpoint(["GET", "PUT"])
def config(request):
    if request.method == "PUT":
        return masked(save(request))
    scope = scope_for(request, READ)
    return masked(scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first())


@api_endpoint(["POST"])
@upstream_errors
def test(request):
    from e2b import Sandbox

    row = save(request)
    if not row.api_key:
        raise ValidationError("API Key必填")
    sandbox = None
    try:
        sandbox = Sandbox.create(
            api_key=row.api_key, timeout=60, allow_internet_access=row.allow_internet_access
        )
        if not sandbox.is_running():
            raise UpstreamError("沙箱连接测试失败")
        row.last_test_status = "success"
        row.last_test_message = "已创建并连接 E2B 沙箱"
    except Exception as exc:
        logger.warning("Sandbox test failed type=%s", type(exc).__name__)
        row.last_test_status = "failed"
        row.last_test_message = "E2B连接失败，请检查凭据和网络"
    finally:
        if sandbox is not None:
            try:
                sandbox.kill()
            except Exception:
                row.last_test_status = "failed"
                row.last_test_message = "测试沙箱终止失败，将在60秒超时后回收"
        row.last_test_time = timezone.now()
        row.save()
    if row.last_test_status != "success":
        raise UpstreamError(row.last_test_message)
    return masked(row)


@api_endpoint(["GET"], authenticated=False)
def runtime(request):
    service_auth(
        request,
        "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN",
        "X-Skill-Sandbox-Runtime-Credential-Token",
    )
    uid = text(request.GET, "uid", required=True, limit=128)
    raw = request.GET.get("spaceId")
    space_id = number(raw) if raw is not None else None
    # Authentication record is authoritative; deleted/frozen accounts cannot receive credentials.
    from astron_console.accounts.models import User, UserProfile

    if (
        not User.objects.filter(pk=uid, is_active=True).exists()
        or not UserProfile.objects.filter(uid=uid, deleted=0, account_status=1).exists()
    ):
        raise PermissionDenied
    if space_id is not None:
        require_space_permission(uid, space_id, READ)
    if request.GET.get("flowId"):
        workflow = workflow_scope(request.GET["flowId"])
        if workflow.space_id != space_id or (space_id is None and workflow.uid != uid):
            raise PermissionDenied
    scope = ResourceScope(uid=uid, space_id=space_id, enterprise_id=None)
    row = scope_queryset(SandboxConfig.objects.filter(deleted=False, enabled=True), scope).first()
    if row is None or not row.api_key:
        raise Http404
    return no_store(
        {
            "provider": "e2b",
            "apiKey": row.api_key,
            "timeoutSeconds": row.timeout_seconds,
            "allowInternetAccess": row.allow_internet_access,
        }
    )
