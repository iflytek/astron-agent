import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from agent_runtime.db.events import append_event
from agent_runtime.db.models import (
    AgentRelease,
    AgentRun,
    AppAgentBinding,
    OutboxMessage,
    ReleaseStatus,
    RunStatus,
)
from agent_runtime.errors import RuntimeApiError


def canonical_hash(value: Any) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def get_binding(session: Session, app_id: str, agent_id: str) -> AppAgentBinding:
    binding = session.scalar(
        select(AppAgentBinding).where(
            AppAgentBinding.app_id == app_id,
            AppAgentBinding.agent_id == agent_id,
            AppAgentBinding.enabled.is_(True),
        )
    )
    if binding is None:
        raise RuntimeApiError(
            403, "AGENT_NOT_AUTHORIZED", "Application is not bound to this agent"
        )
    return binding


def get_release(
    session: Session,
    *,
    agent_id: str,
    space_id: str,
    version: str | None,
) -> AgentRelease:
    conditions = [
        AgentRelease.agent_id == agent_id,
        AgentRelease.space_id == space_id,
        AgentRelease.status == ReleaseStatus.PUBLISHED.value,
    ]
    if version:
        conditions.append(AgentRelease.version == version)
    else:
        conditions.append(AgentRelease.is_default.is_(True))
    release = session.scalar(select(AgentRelease).where(*conditions))
    if release is None:
        raise RuntimeApiError(
            404, "VERSION_UNAVAILABLE", "Published agent release not found"
        )
    return release


def request_hash(
    *,
    agent_id: str,
    release_version: str,
    conversation_id: str | None,
    input_data: dict[str, Any],
    end_user_id: str,
) -> str:
    return canonical_hash(
        {
            "agent_id": agent_id,
            "release_version": release_version,
            "conversation_id": conversation_id,
            "input": input_data,
            "end_user_id": end_user_id,
        }
    )


def enqueue_run(session: Session, run: AgentRun) -> None:
    session.add(
        OutboxMessage(
            topic="agent_runtime.execute_run",
            payload={"run_id": run.id},
        )
    )


def create_run(
    session: Session,
    *,
    agent_id: str,
    release: AgentRelease,
    app_id: str,
    end_user_id: str,
    delegation_issuer: str,
    delegation_jti: str,
    conversation_id: str | None,
    input_data: dict[str, Any],
    idempotency_key: str,
) -> tuple[AgentRun, bool]:
    digest = request_hash(
        agent_id=agent_id,
        release_version=release.version,
        conversation_id=conversation_id,
        input_data=input_data,
        end_user_id=end_user_id,
    )
    existing = session.scalar(
        select(AgentRun).where(
            AgentRun.app_id == app_id,
            AgentRun.idempotency_key == idempotency_key,
        )
    )
    if existing:
        if existing.request_hash != digest:
            raise RuntimeApiError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "Idempotency-Key was already used with a different request",
            )
        return existing, False

    replayed = session.scalar(
        select(AgentRun).where(
            AgentRun.delegation_issuer == delegation_issuer,
            AgentRun.delegation_jti == delegation_jti,
        )
    )
    if replayed:
        raise RuntimeApiError(
            409,
            "DELEGATION_REPLAYED",
            "Delegation token was already used to create another run",
        )

    run = AgentRun(
        agent_id=agent_id,
        release_id=release.id,
        release_version=release.version,
        mode=release.mode,
        app_id=app_id,
        space_id=release.space_id,
        end_user_id=end_user_id,
        delegation_issuer=delegation_issuer,
        delegation_jti=delegation_jti,
        conversation_id=conversation_id,
        input_data=input_data,
        idempotency_key=idempotency_key,
        request_hash=digest,
    )
    session.add(run)
    session.flush()
    append_event(
        session,
        run,
        "run.queued",
        {"status": RunStatus.QUEUED.value, "release_version": release.version},
    )
    enqueue_run(session, run)
    return run, True
