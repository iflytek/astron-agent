import logging
import secrets

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection
from django.http import Http404
from django.utils import timezone
from django.views.decorators.cache import never_cache

from astron_console.accounts.http import response
from astron_console.http import api_endpoint
from astron_console.spaces.permissions import (
    ResourceScope,
    permits,
    require_space_permission,
    scope_queryset,
)

from .clients import normalize_provider
from .common import UpstreamError, number, scope_for, serialize, text, upstream_errors
from .local_sandbox import TOKEN_HEADER, available, request_runner, resource_scope
from .models import Model, SandboxConfig, WorkflowScope

logger = logging.getLogger(__name__)
READ = "ToolBoxController_getDetail_GET"
WRITE = "ToolBoxController_updateTool_PUT"


def enabled_sandbox(scope):
    return scope_queryset(SandboxConfig.objects.filter(deleted=False, enabled=True), scope).first()


def agent_sandbox_selection(scope):
    if scope.space_id is not None and not permits(
        require_space_permission, scope.uid, scope.space_id, READ
    ):
        return {"enabled": False}
    row = enabled_sandbox(scope)
    if row is None:
        return {"enabled": False}
    return {"enabled": True, "provider": row.provider}


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
            "localAvailable": available(),
        }
    result = serialize(row, exclude=("api_key",))
    result.update(
        apiKey="********" if row.api_key else "",
        apiKeyMasked=bool(row.api_key),
        localAvailable=available(),
    )
    if row.provider == "docker":
        result["e2bAllowInternetAccess"] = row.allow_internet_access
        result["allowInternetAccess"] = False
    return result


def save(request):
    scope = scope_for(request, WRITE)
    row = scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first()
    row = row or SandboxConfig(uid=scope.uid, space_id=scope.space_id)
    payload = request.payload
    provider = payload.get("provider", row.provider)
    if provider not in ("e2b", "docker"):
        raise ValidationError("不支持的沙箱提供商")
    row.timeout_seconds = number(
        payload.get("timeoutSeconds"), 60, 600 if provider == "docker" else 3600
    )
    row.enabled = payload.get("enabled", False)
    if not isinstance(row.enabled, bool):
        raise ValidationError("enabled格式无效")
    if provider == "e2b":
        row.allow_internet_access = payload.get("allowInternetAccess", row.allow_internet_access)
        if not isinstance(row.allow_internet_access, bool):
            raise ValidationError("allowInternetAccess格式无效")
        if payload.get("apiKeyMasked") is not True:
            row.api_key = text(payload, "apiKey", limit=1024)
        if row.enabled and not row.api_key:
            raise ValidationError("启用沙箱需要 API Key")
    elif row.enabled and not available():
        raise ValidationError("本地 Docker 沙箱未配置")
    if row.provider != provider:
        row.last_test_status = row.last_test_message = row.last_test_time = None
    row.provider = provider
    row.update_time = timezone.now()
    row.save()
    return row


@api_endpoint(["GET", "PUT"])
def config(request):
    if request.method == "PUT":
        return masked(save(request))
    scope = scope_for(request, READ)
    return masked(scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first())


@never_cache
@api_endpoint(["POST"])
def reveal_credential(request):
    scope = scope_for(request, WRITE)
    row = scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first()
    if row is None or not row.api_key:
        raise Http404
    logger.info("Sandbox credential viewed uid=%s space=%s", scope.uid, scope.space_id)
    return {"value": row.api_key}


@api_endpoint(["POST"])
@upstream_errors
def test(request):
    if request.payload.get("provider") == "docker":
        scope = scope_for(request, WRITE)
        number(request.payload.get("timeoutSeconds"), 60, 600)
        if request_runner("probe").get("status") != "ok":
            raise UpstreamError("本地 Docker 沙箱测试失败")
        row = scope_queryset(SandboxConfig.objects.filter(deleted=False), scope).first()
        return {
            **masked(row),
            "provider": "docker",
            "allowInternetAccess": False,
            "lastTestStatus": "success",
            "lastTestMessage": "本地 Docker 沙箱连接成功",
            "lastTestTime": timezone.now(),
        }
    from e2b import Sandbox

    request.payload.setdefault("provider", "e2b")
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
        TOKEN_HEADER,
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
    workflow = agent = None
    if request.GET.get("flowId"):
        workflow = workflow_scope(request.GET["flowId"])
        if workflow.space_id != space_id or (space_id is None and workflow.uid != uid):
            raise PermissionDenied
    scope = ResourceScope(uid=uid, space_id=space_id, enterprise_id=None)
    if request.GET.get("agentId"):
        from astron_console.agents.definitions import get_scoped_agent

        agent = get_scoped_agent(scope, request.GET["agentId"])
    row = enabled_sandbox(scope)
    if row is None:
        raise Http404
    if row.provider == "docker":
        return no_store(docker_runtime(request, scope, agent, workflow, row))
    if row.provider != "e2b" or not row.api_key:
        raise Http404
    return no_store(
        {
            "provider": row.provider,
            "apiKey": row.api_key,
            "timeoutSeconds": row.timeout_seconds,
            "allowInternetAccess": row.allow_internet_access,
        }
    )


def docker_runtime(request, scope, agent, workflow, row):
    from astron_console.publishing.runtime_authorization import grant_for_root
    from astron_console.workflows.authorization import EXECUTE, get_workflow
    from astron_console.workflows.execution_context import checked_root, graph_nodes
    from astron_console.workflows.runtime_models import WorkflowRun

    purpose = "agent" if agent is not None else "workflow"
    if request.GET.get("purpose", purpose) != purpose or (agent is None and workflow is None):
        raise PermissionDenied
    root_id = text(request.GET, "rootId", required=True, limit=36)
    run_id = text(request.GET, "runId", required=True, limit=36)
    root = checked_root(root_id)
    if root.uid != scope.uid or root.space_id != scope.space_id or grant_for_root(root) is not None:
        raise PermissionDenied
    if workflow is None:
        if root.agent_id != agent.pk or root.agent_run_id != run_id:
            raise PermissionDenied
    else:
        node_id = text(request.GET, "nodeId", required=True, limit=255)
        get_workflow(scope, workflow.pk, EXECUTE)
        run = WorkflowRun.objects.filter(
            pk=run_id,
            context_id=root.pk,
            workflow_id=workflow.pk,
            status__in=("running", "resuming"),
            cancel_requested=False,
        ).first()
        kind = "agent" if agent is not None else "ifly-code"
        if (
            run is None
            or not node_id.startswith(f"{kind}::")
            or not any(node.get("id") == node_id for node in graph_nodes(run.graph))
            or (
                agent is not None
                and str(run.resolved_agents.get(node_id, {}).get("agentId")) != str(agent.pk)
            )
        ):
            raise PermissionDenied
    return {
        "provider": "docker",
        "timeoutSeconds": row.timeout_seconds,
        "allowInternetAccess": False,
        "sandboxScope": resource_scope(agent if agent is not None else workflow),
        "sandboxResourceId": str(agent.pk if agent is not None else workflow.flow_id),
    }
