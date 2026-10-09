from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from agent_runtime.auth import require_internal_key
from agent_runtime.db.events import append_event
from agent_runtime.db.models import (
    AgentRelease,
    AgentRun,
    AppAgentBinding,
    ReleaseStatus,
    RunStatus,
)
from agent_runtime.db.session import get_db
from agent_runtime.errors import RuntimeApiError
from agent_runtime.schemas import (
    BindingCreate,
    BindingResponse,
    ReleaseCreate,
    ReleaseResponse,
)
from agent_runtime.settings import Settings, get_settings

router = APIRouter(
    prefix="/internal/v1",
    tags=["runtime-management"],
    dependencies=[Depends(require_internal_key)],
)

_FORBIDDEN_SNAPSHOT_KEYS = {
    "api_key",
    "apikey",
    "api_secret",
    "apisecret",
    "access_key",
    "accesskey",
    "secret_key",
    "secretkey",
    "client_secret",
    "clientsecret",
    "private_key",
    "privatekey",
    "authorization",
    "password",
    "token",
}
_ALLOWED_RUNTIME_TOOLS = {"commerce_material_draft_save"}
_ALLOWED_APPROVER_ROLES = {"business_user", "space_admin"}


def _lock_resource(db: Session, resource: str) -> None:
    """Serialize PostgreSQL management changes that enforce cross-row invariants."""
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:resource, 0))"),
            {"resource": resource},
        )


def _assert_no_embedded_secrets(value: object, path: str = "snapshot") -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = str(key).lower().replace("-", "_")
            if normalized in _FORBIDDEN_SNAPSHOT_KEYS and item:
                raise RuntimeApiError(
                    422,
                    "INPUT_INVALID",
                    f"Credentials must be referenced, not embedded ({path}.{key})",
                )
            _assert_no_embedded_secrets(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _assert_no_embedded_secrets(item, f"{path}[{index}]")


def _validate_approval_policy(step: dict[str, object], tool_name: str) -> None:
    if step.get("requires_approval") is False:
        raise RuntimeApiError(
            422,
            "INPUT_INVALID",
            f"Approval cannot be disabled for governed tool: {tool_name}",
        )
    policy = step.get("approval_policy")
    if policy is None:
        return
    if not isinstance(policy, dict):
        raise RuntimeApiError(422, "INPUT_INVALID", "Invalid approval policy")
    roles = policy.get("allowed_roles")
    if (
        not isinstance(roles, list)
        or not roles
        or not {str(role) for role in roles}.issubset(_ALLOWED_APPROVER_ROLES)
    ):
        raise RuntimeApiError(
            422,
            "INPUT_INVALID",
            "Approval roles must be business_user and/or space_admin",
        )


def _validate_runtime_tools(snapshot: dict[str, object]) -> None:
    agent_request = snapshot.get("agent_request")
    if isinstance(agent_request, dict):
        plugin = agent_request.get("plugin")
        if isinstance(plugin, dict) and any(plugin.get(key) for key in plugin):
            raise RuntimeApiError(
                422,
                "INPUT_INVALID",
                "Published agents must invoke tools through governed runtime plan steps",
            )
    plan = snapshot.get("plan")
    if not isinstance(plan, list):
        return
    for step in plan:
        if not isinstance(step, dict) or not step.get("tool"):
            continue
        tool_name = str(step["tool"])
        if tool_name not in _ALLOWED_RUNTIME_TOOLS:
            raise RuntimeApiError(
                422,
                "INPUT_INVALID",
                f"Tool is not allowed in the MVP runtime: {tool_name}",
            )
        _validate_approval_policy(step, tool_name)


def _validate_mode_snapshot(mode: str, snapshot: dict[str, object]) -> None:
    if mode == "workflow":
        workflow = snapshot.get("workflow")
        if (
            not isinstance(workflow, dict)
            or not isinstance(workflow.get("flow_id"), str)
            or not str(workflow["flow_id"]).strip()
        ):
            raise RuntimeApiError(
                422,
                "INPUT_INVALID",
                "Workflow releases require a non-empty workflow.flow_id",
            )
        return
    agent_request = snapshot.get("agent_request")
    has_agent_request = isinstance(agent_request, dict) and isinstance(
        agent_request.get("model_config"), dict
    )
    if mode == "plan_execute":
        plan = snapshot.get("plan")
        tool_only_plan = (
            isinstance(plan, list)
            and bool(plan)
            and all(isinstance(step, dict) and step.get("tool") for step in plan)
        )
        if has_agent_request or tool_only_plan:
            return
    elif has_agent_request:
        return
    if not has_agent_request:
        raise RuntimeApiError(
            422,
            "INPUT_INVALID",
            f"{mode} releases require agent_request.model_config",
        )


def _validate_model_credential_ref(
    snapshot: dict[str, object], release_space_id: str
) -> None:
    agent_request = snapshot.get("agent_request")
    if not isinstance(agent_request, dict):
        return
    model_config = agent_request.get("model_config")
    if not isinstance(model_config, dict):
        return
    credential_ref = model_config.get("credential_ref")
    if credential_ref is None:
        return
    if (
        not isinstance(credential_ref, dict)
        or credential_ref.get("type") != "console_model"
        or credential_ref.get("model_id") is None
        or not credential_ref.get("owner_uid")
        or str(credential_ref.get("space_id")) != release_space_id
    ):
        raise RuntimeApiError(
            422,
            "INPUT_INVALID",
            "Model credential reference must belong to the release space",
        )


@router.post("/agent-releases", response_model=ReleaseResponse, status_code=201)
def create_release(
    body: ReleaseCreate,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ReleaseResponse:
    _assert_no_embedded_secrets(body.snapshot)
    _validate_mode_snapshot(body.mode, body.snapshot)
    _validate_runtime_tools(body.snapshot)
    _validate_model_credential_ref(body.snapshot, body.space_id)
    _lock_resource(db, f"agent-release:{body.agent_id}")
    existing_spaces = set(
        db.scalars(
            select(AgentRelease.space_id).where(AgentRelease.agent_id == body.agent_id)
        ).all()
    )
    if existing_spaces and existing_spaces != {body.space_id}:
        raise RuntimeApiError(
            409,
            "AGENT_NOT_AUTHORIZED",
            "An agent release cannot be shared across spaces",
        )
    if db.scalar(
        select(AgentRelease.id).where(
            AgentRelease.agent_id == body.agent_id,
            AgentRelease.version == body.version,
        )
    ):
        raise RuntimeApiError(
            409, "VERSION_UNAVAILABLE", "Release version already exists"
        )
    if body.is_default:
        db.execute(
            update(AgentRelease)
            .where(AgentRelease.agent_id == body.agent_id)
            .values(is_default=False)
        )
    release_data = body.model_dump()
    release_data["snapshot"] = {
        **body.snapshot,
        "_runtime": {"version": settings.code_version},
    }
    release = AgentRelease(**release_data)
    db.add(release)
    db.commit()
    return ReleaseResponse(
        release_id=release.id,
        agent_id=release.agent_id,
        space_id=release.space_id,
        version=release.version,
        mode=release.mode,
        status=release.status,
        is_default=release.is_default,
    )


@router.post("/app-bindings", response_model=BindingResponse, status_code=201)
def create_binding(
    body: BindingCreate, db: Session = Depends(get_db)
) -> BindingResponse:
    _lock_resource(db, f"app-binding:{body.app_id}:{body.agent_id}")
    release = db.scalar(
        select(AgentRelease.id).where(
            AgentRelease.agent_id == body.agent_id,
            AgentRelease.space_id == body.space_id,
            AgentRelease.status == ReleaseStatus.PUBLISHED.value,
        )
    )
    if release is None:
        raise RuntimeApiError(
            409, "VERSION_UNAVAILABLE", "No release exists in the binding space"
        )
    existing = db.scalar(
        select(AppAgentBinding).where(
            AppAgentBinding.app_id == body.app_id,
            AppAgentBinding.agent_id == body.agent_id,
        )
    )
    if existing:
        if existing.space_id != body.space_id:
            raise RuntimeApiError(
                409, "AGENT_NOT_AUTHORIZED", "Binding cannot cross spaces"
            )
        existing.enabled = body.enabled
        binding = existing
    else:
        binding = AppAgentBinding(**body.model_dump())
        db.add(binding)
    db.commit()
    return BindingResponse(
        binding_id=binding.id,
        app_id=binding.app_id,
        agent_id=binding.agent_id,
        space_id=binding.space_id,
        enabled=binding.enabled,
    )


@router.post("/agent-releases/{release_id}/disable", response_model=ReleaseResponse)
def disable_release(release_id: str, db: Session = Depends(get_db)) -> ReleaseResponse:
    release = db.scalar(
        select(AgentRelease).where(AgentRelease.id == release_id).with_for_update()
    )
    if release is None:
        raise RuntimeApiError(404, "VERSION_UNAVAILABLE", "Release not found")
    release.status = ReleaseStatus.DISABLED.value
    release.is_default = False
    release.disabled_at = datetime.now(timezone.utc)
    waiting_statuses = {
        RunStatus.WAITING_INPUT.value,
        RunStatus.WAITING_APPROVAL.value,
        RunStatus.WAITING_EXTERNAL.value,
        RunStatus.RETRY_SCHEDULED.value,
    }
    runs = db.scalars(
        select(AgentRun).where(
            AgentRun.release_id == release.id,
            AgentRun.status.in_(waiting_statuses),
        )
    ).all()
    for run in runs:
        run.status = RunStatus.CANCELLED_BY_RELEASE.value
        run.finished_at = datetime.now(timezone.utc)
        append_event(
            db,
            run,
            "run.cancelled",
            {"status": run.status, "reason": "release_disabled"},
        )
    db.commit()
    return ReleaseResponse(
        release_id=release.id,
        agent_id=release.agent_id,
        space_id=release.space_id,
        version=release.version,
        mode=release.mode,
        status=release.status,
        is_default=release.is_default,
    )
