from typing import Any

from sqlalchemy.orm import Session

from agent_runtime.db.models import AgentRun, RunEvent


def append_event(
    session: Session,
    run: AgentRun,
    event_type: str,
    data: dict[str, Any] | None = None,
    *,
    step_id: str | None = None,
) -> RunEvent:
    event = RunEvent(
        run_id=run.id,
        event_type=event_type,
        step_id=step_id,
        trace_id=run.trace_id,
        data=data or {},
    )
    session.add(event)
    session.flush()
    return event
