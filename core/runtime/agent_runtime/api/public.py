import asyncio
import json
from datetime import datetime, timezone
from typing import Annotated, AsyncGenerator

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from agent_runtime.auth import (
    ApplicationIdentity,
    require_application_identity,
    require_delegation,
)
from agent_runtime.db.events import append_event
from agent_runtime.db.models import (
    TERMINAL_RUN_STATUSES,
    AgentRelease,
    AgentRun,
    Approval,
    OutboxMessage,
    ReleaseStatus,
    RunEvent,
    RunStatus,
)
from agent_runtime.db.session import SessionLocal, get_db
from agent_runtime.errors import RuntimeApiError
from agent_runtime.schemas import (
    ApprovalDecision,
    ErrorBody,
    RunCreate,
    RunResponse,
    RunResume,
)
from agent_runtime.services.runs import create_run, get_binding, get_release
from agent_runtime.settings import Settings, get_settings

router = APIRouter(prefix="/openapi/v1", tags=["agent-runs"])


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _run_response(run: AgentRun) -> RunResponse:
    return RunResponse(
        run_id=run.id,
        status=run.status,
        release_version=run.release_version,
        trace_id=run.trace_id,
        result=run.result_data if run.status == RunStatus.SUCCEEDED.value else None,
        error=(
            ErrorBody(
                code=run.error_code or "RUN_FAILED",
                message=run.error_message or "Run failed",
                trace_id=run.trace_id,
            )
            if run.error_code
            else None
        ),
        created_at=run.created_at,
        updated_at=run.updated_at,
    )


def _owned_run(
    db: Session,
    run_id: str,
    application: ApplicationIdentity,
    token: str | None,
    scope: str,
    settings: Settings,
    *,
    allow_non_owner: bool = False,
    lock: bool = False,
) -> AgentRun:
    statement = select(AgentRun).where(
        AgentRun.id == run_id,
        AgentRun.app_id == application.app_id,
    )
    run = db.scalar(statement.with_for_update() if lock else statement)
    if run is None:
        raise RuntimeApiError(404, "RUN_NOT_FOUND", "Run not found")
    identity = require_delegation(
        token,
        app_id=application.app_id,
        space_id=run.space_id,
        required_scope=scope,
        settings=settings,
    )
    if (
        not allow_non_owner
        and identity.subject != run.end_user_id
        and "runs:read:any" not in identity.scopes
    ):
        raise RuntimeApiError(
            403, "AGENT_NOT_AUTHORIZED", "Run belongs to another end user"
        )
    return run


@router.post(
    "/agents/{agent_id}/runs",
    response_model=RunResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def post_run(
    agent_id: str,
    body: RunCreate,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    idempotency_key: Annotated[str | None, Header(min_length=1, max_length=128)] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RunResponse:
    if not idempotency_key:
        raise RuntimeApiError(400, "INPUT_INVALID", "Idempotency-Key is required")
    binding = get_binding(db, application.app_id, agent_id)
    release = get_release(
        db,
        agent_id=agent_id,
        space_id=binding.space_id,
        version=body.release_version,
    )
    identity = require_delegation(
        x_end_user_token,
        app_id=application.app_id,
        space_id=release.space_id,
        required_scope="runs:create",
        settings=settings,
    )
    try:
        run, _created = create_run(
            db,
            agent_id=agent_id,
            release=release,
            app_id=application.app_id,
            end_user_id=identity.subject,
            delegation_issuer=identity.issuer,
            delegation_jti=identity.token_id,
            conversation_id=body.conversation_id,
            input_data=body.input,
            idempotency_key=idempotency_key,
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        run, _created = create_run(
            db,
            agent_id=agent_id,
            release=release,
            app_id=application.app_id,
            end_user_id=identity.subject,
            delegation_issuer=identity.issuer,
            delegation_jti=identity.token_id,
            conversation_id=body.conversation_id,
            input_data=body.input,
            idempotency_key=idempotency_key,
        )
    return _run_response(run)


@router.get("/runs/{run_id}", response_model=RunResponse)
def get_run(
    run_id: str,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RunResponse:
    run = _owned_run(db, run_id, application, x_end_user_token, "runs:read", settings)
    return _run_response(run)


def _sse(event: RunEvent) -> str:
    payload = {
        "sequence": event.id,
        "time": event.created_at.isoformat(),
        "run_id": event.run_id,
        "step_id": event.step_id,
        "trace_id": event.trace_id,
        "type": event.event_type,
        "data": event.data,
    }
    return f"id: {event.id}\nevent: {event.event_type}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.get("/runs/{run_id}/events", response_model=None)
def get_run_events(
    request: Request,
    run_id: str,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    last_event_id: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    _owned_run(db, run_id, application, x_end_user_token, "runs:read", settings)
    try:
        cursor = max(0, int(last_event_id or "0"))
    except ValueError as exc:
        raise RuntimeApiError(
            400, "INPUT_INVALID", "Last-Event-ID must be an integer"
        ) from exc

    async def stream() -> AsyncGenerator[str, None]:
        nonlocal cursor
        while True:
            if await request.is_disconnected():
                return
            with SessionLocal() as session:
                events = session.scalars(
                    select(RunEvent)
                    .where(RunEvent.run_id == run_id, RunEvent.id > cursor)
                    .order_by(RunEvent.id)
                ).all()
                run_status = session.scalar(
                    select(AgentRun.status).where(AgentRun.id == run_id)
                )
            for event in events:
                cursor = event.id
                yield _sse(event)
            if (
                run_status in {item.value for item in TERMINAL_RUN_STATUSES}
                and not events
            ):
                return
            await asyncio.sleep(settings.event_poll_interval_seconds)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/runs/{run_id}/resume", response_model=RunResponse, status_code=202)
def resume_run(
    run_id: str,
    body: RunResume,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RunResponse:
    run = _owned_run(
        db,
        run_id,
        application,
        x_end_user_token,
        "runs:resume",
        settings,
        lock=True,
    )
    release = db.get(AgentRelease, run.release_id)
    if release is None or release.status != ReleaseStatus.PUBLISHED.value:
        raise RuntimeApiError(
            409, "RELEASE_DISABLED", "Disabled releases cannot be resumed"
        )
    if run.status not in {
        RunStatus.WAITING_INPUT.value,
        RunStatus.RETRY_SCHEDULED.value,
    }:
        raise RuntimeApiError(
            409, "RUN_NOT_RESUMABLE", "Run is not waiting for resumable input"
        )
    run.input_data = {**run.input_data, **body.input}
    run.status = RunStatus.QUEUED.value
    run.error_code = None
    run.error_message = None
    db.add(OutboxMessage(topic="agent_runtime.execute_run", payload={"run_id": run.id}))
    append_event(db, run, "run.queued", {"status": run.status, "resumed": True})
    db.commit()
    return _run_response(run)


@router.post("/runs/{run_id}/cancel", response_model=RunResponse, status_code=202)
def cancel_run(
    run_id: str,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RunResponse:
    run = _owned_run(
        db,
        run_id,
        application,
        x_end_user_token,
        "runs:cancel",
        settings,
        lock=True,
    )
    if run.status in {item.value for item in TERMINAL_RUN_STATUSES}:
        return _run_response(run)
    run.cancel_requested = True
    if run.status in {
        RunStatus.QUEUED.value,
        RunStatus.WAITING_INPUT.value,
        RunStatus.WAITING_APPROVAL.value,
        RunStatus.WAITING_EXTERNAL.value,
        RunStatus.RETRY_SCHEDULED.value,
    }:
        run.status = RunStatus.CANCELLED.value
        run.finished_at = datetime.now(timezone.utc)
        event_type = "run.cancelled"
    else:
        run.status = RunStatus.CANCEL_REQUESTED.value
        event_type = "run.cancel_requested"
    append_event(db, run, event_type, {"status": run.status})
    db.commit()
    return _run_response(run)


@router.post("/approvals/{approval_id}/decision", response_model=RunResponse)
def decide_approval(
    approval_id: str,
    body: ApprovalDecision,
    application: ApplicationIdentity = Depends(require_application_identity),
    x_end_user_token: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RunResponse:
    approval = db.scalar(
        select(Approval).where(Approval.id == approval_id).with_for_update()
    )
    if approval is None:
        raise RuntimeApiError(404, "APPROVAL_NOT_FOUND", "Approval not found")
    run = _owned_run(
        db,
        approval.run_id,
        application,
        x_end_user_token,
        "approvals:decide",
        settings,
        allow_non_owner=True,
        lock=True,
    )
    identity = require_delegation(
        x_end_user_token,
        app_id=run.app_id,
        space_id=run.space_id,
        required_scope="approvals:decide",
        settings=settings,
    )
    release = db.get(AgentRelease, run.release_id)
    if release is None or release.status != ReleaseStatus.PUBLISHED.value:
        raise RuntimeApiError(
            409, "RELEASE_DISABLED", "Disabled releases cannot be resumed"
        )
    if approval.status != "PENDING" or run.status != RunStatus.WAITING_APPROVAL.value:
        raise RuntimeApiError(409, "APPROVAL_INVALID", "Approval is no longer pending")
    if _as_utc(approval.expires_at) <= datetime.now(timezone.utc):
        approval.status = "EXPIRED"
        run.status = RunStatus.EXPIRED.value
        run.error_code = "APPROVAL_EXPIRED"
        run.error_message = "Approval expired"
        run.finished_at = datetime.now(timezone.utc)
        append_event(
            db,
            run,
            "run.failed",
            {
                "status": run.status,
                "code": run.error_code,
                "message": run.error_message,
            },
        )
        db.commit()
        raise RuntimeApiError(409, "APPROVAL_INVALID", "Approval has expired")
    allowed_roles = set(
        approval.policy.get("allowed_roles", ["business_user", "space_admin"])
    )
    raw_roles = identity.claims.get("roles", [])
    roles = {str(role) for role in raw_roles} if isinstance(raw_roles, list) else set()
    if not roles.intersection(allowed_roles):
        raise RuntimeApiError(
            403, "AGENT_NOT_AUTHORIZED", "Approver role is not allowed by policy"
        )
    if identity.subject != run.end_user_id and "space_admin" not in roles:
        raise RuntimeApiError(
            403,
            "AGENT_NOT_AUTHORIZED",
            "Only a space administrator can approve another end user's run",
        )
    approval.status = body.decision
    approval.decided_by = identity.subject
    approval.decision_reason = body.reason
    approval.decided_at = datetime.now(timezone.utc)
    event_type = (
        "approval.approved" if body.decision == "APPROVED" else "approval.rejected"
    )
    append_event(
        db,
        run,
        event_type,
        {"approval_id": approval.id, "operation_id": approval.operation_id},
    )
    if body.decision == "APPROVED" and run.status == RunStatus.WAITING_APPROVAL.value:
        run.status = RunStatus.QUEUED.value
        db.add(
            OutboxMessage(topic="agent_runtime.execute_run", payload={"run_id": run.id})
        )
        append_event(db, run, "run.queued", {"status": run.status, "resumed": True})
    elif body.decision == "REJECTED":
        run.status = RunStatus.CANCELLED.value
        run.finished_at = datetime.now(timezone.utc)
        append_event(
            db,
            run,
            "run.cancelled",
            {"status": run.status, "reason": "approval_rejected"},
        )
    db.commit()
    return _run_response(run)
