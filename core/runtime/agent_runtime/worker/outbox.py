import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from agent_runtime.db.events import append_event
from agent_runtime.db.models import AgentRun, OutboxMessage, RunStatus
from agent_runtime.db.session import SessionLocal
from agent_runtime.settings import get_settings
from agent_runtime.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


def recover_expired_runs() -> int:
    recovered = 0
    with SessionLocal.begin() as session:
        runs = session.scalars(
            select(AgentRun)
            .where(
                AgentRun.status == RunStatus.RUNNING.value,
                AgentRun.lease_expires_at < datetime.now(timezone.utc),
            )
            .with_for_update(skip_locked=True)
        ).all()
        for run in runs:
            run.status = RunStatus.RETRY_SCHEDULED.value
            run.lease_owner = None
            run.lease_expires_at = None
            append_event(
                session,
                run,
                "run.retry_scheduled",
                {"status": run.status, "reason": "worker_lease_expired"},
            )
            run.status = RunStatus.QUEUED.value
            session.add(
                OutboxMessage(
                    topic="agent_runtime.execute_run", payload={"run_id": run.id}
                )
            )
            append_event(session, run, "run.queued", {"status": run.status})
            recovered += 1
    return recovered


def recover_orphaned_queued_runs(age_seconds: int) -> int:
    """Recreate durable outbox work if a Redis broker delivery was lost."""
    recovered = 0
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
    with SessionLocal.begin() as session:
        runs = session.scalars(
            select(AgentRun)
            .where(
                AgentRun.status == RunStatus.QUEUED.value,
                AgentRun.updated_at < cutoff,
            )
            .with_for_update(skip_locked=True)
        ).all()
        for run in runs:
            pending = session.scalar(
                select(OutboxMessage.id).where(
                    OutboxMessage.status == "PENDING",
                    OutboxMessage.payload["run_id"].as_string() == run.id,
                )
            )
            if pending is not None:
                continue
            session.add(
                OutboxMessage(
                    topic="agent_runtime.execute_run", payload={"run_id": run.id}
                )
            )
            run.updated_at = datetime.now(timezone.utc)
            append_event(
                session,
                run,
                "run.redispatched",
                {"status": run.status, "reason": "broker_delivery_reconciliation"},
            )
            recovered += 1
    return recovered


def dispatch_once(limit: int = 100) -> int:
    published = 0
    with SessionLocal.begin() as session:
        messages = session.scalars(
            select(OutboxMessage)
            .where(
                OutboxMessage.status == "PENDING",
                OutboxMessage.available_at <= datetime.now(timezone.utc),
            )
            .order_by(OutboxMessage.available_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        ).all()
        for message in messages:
            try:
                celery_app.send_task(
                    message.topic,
                    args=[message.payload["run_id"]],
                    task_id=message.id,
                )
                message.status = "PUBLISHED"
                message.published_at = datetime.now(timezone.utc)
                message.last_error = None
                published += 1
            except Exception as exc:  # pylint: disable=broad-exception-caught
                message.attempts += 1
                message.last_error = str(exc)[:2000]
                delay = min(60, 2 ** min(message.attempts, 6))
                message.available_at = datetime.now(timezone.utc) + timedelta(
                    seconds=delay
                )
                logger.exception(
                    "Failed to publish runtime outbox message %s", message.id
                )
    return published


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    while True:
        recover_expired_runs()
        recover_orphaned_queued_runs(settings.queued_redispatch_seconds)
        dispatch_once()
        time.sleep(1)


if __name__ == "__main__":
    main()
