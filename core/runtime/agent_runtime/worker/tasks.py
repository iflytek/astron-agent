import asyncio
import logging
import socket
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from agent_runtime.db.events import append_event
from agent_runtime.db.models import AgentRelease, AgentRun, ReleaseStatus, RunStatus
from agent_runtime.db.session import SessionLocal
from agent_runtime.errors import RunPaused
from agent_runtime.services.adapters import RunNotResumableError, execute_release
from agent_runtime.settings import get_settings
from agent_runtime.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


def _claim_run(run_id: str, lease_owner: str, lease_seconds: int) -> str | None:
    with SessionLocal.begin() as session:
        run = session.scalar(
            select(AgentRun).where(AgentRun.id == run_id).with_for_update()
        )
        if run is None or run.status != RunStatus.QUEUED.value:
            return None
        release = session.get(AgentRelease, run.release_id)
        if release is None or release.status != ReleaseStatus.PUBLISHED.value:
            run.status = RunStatus.CANCELLED_BY_RELEASE.value
            run.finished_at = datetime.now(timezone.utc)
            append_event(
                session,
                run,
                "run.cancelled",
                {"status": run.status, "reason": "release_disabled"},
            )
            return None
        if run.cancel_requested:
            run.status = RunStatus.CANCELLED.value
            run.finished_at = datetime.now(timezone.utc)
            append_event(session, run, "run.cancelled", {"status": run.status})
            return None
        run.status = RunStatus.RUNNING.value
        run.started_at = run.started_at or datetime.now(timezone.utc)
        run.attempt += 1
        run.lease_owner = lease_owner
        run.lease_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=lease_seconds
        )
        append_event(
            session,
            run,
            "run.started",
            {"status": run.status, "attempt": run.attempt},
        )
        return release.id


def _complete_run(run_id: str, result: dict[str, object]) -> None:
    with SessionLocal.begin() as session:
        run = session.scalar(
            select(AgentRun).where(AgentRun.id == run_id).with_for_update()
        )
        if run is None:
            return
        data: dict[str, object]
        if run.cancel_requested or run.status == RunStatus.CANCEL_REQUESTED.value:
            run.status = RunStatus.CANCELLED.value
            event_type = "run.cancelled"
            data = {
                "status": run.status,
                "warning": "External side effects may already have completed",
            }
        else:
            run.status = RunStatus.SUCCEEDED.value
            run.result_data = result
            event_type = "run.completed"
            data = {"status": run.status, "result": result}
        run.finished_at = datetime.now(timezone.utc)
        run.lease_owner = None
        run.lease_expires_at = None
        append_event(session, run, event_type, data)


def _fail_run(run_id: str, exc: Exception) -> None:
    logger.exception(
        "Run execution failed", extra={"run_id": run_id, "error": str(exc)}
    )
    with SessionLocal.begin() as session:
        run = session.scalar(
            select(AgentRun).where(AgentRun.id == run_id).with_for_update()
        )
        if run is None:
            return
        run.status = RunStatus.FAILED.value
        not_resumable = isinstance(exc, RunNotResumableError)
        run.error_code = (
            "RUN_NOT_RESUMABLE" if not_resumable else "RUN_EXECUTION_FAILED"
        )
        # Keep downstream response bodies, URLs, and credential-provider details
        # out of the public run API. The full exception is retained in logs.
        run.error_message = (
            "Run cannot be resumed by this Runtime version"
            if not_resumable
            else "Run execution failed"
        )
        run.finished_at = datetime.now(timezone.utc)
        run.lease_owner = None
        run.lease_expires_at = None
        append_event(
            session,
            run,
            "run.failed",
            {
                "status": run.status,
                "code": run.error_code,
                "message": run.error_message,
            },
        )


@celery_app.task(
    bind=True,
    name="agent_runtime.execute_run",
    autoretry_for=(),
)
def execute_run(self: object, run_id: str) -> None:
    settings = get_settings()
    request = getattr(self, "request", None)
    task_id = getattr(request, "id", None) or "direct"
    lease_owner = f"{socket.gethostname()}:{task_id}"
    release_id = _claim_run(
        run_id, lease_owner, settings.worker_time_limit_seconds + 60
    )
    if release_id is None:
        return

    try:
        with SessionLocal() as session:
            run_for_execution = session.get(AgentRun, run_id)
            release_for_execution = session.get(AgentRelease, release_id)
            if run_for_execution is None or release_for_execution is None:
                return
            result = asyncio.run(
                execute_release(release_for_execution, run_for_execution, settings)
            )
        _complete_run(run_id, result)
    except RunPaused:
        logger.info("Runtime run %s entered a durable wait state", run_id)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("Runtime execution failed for run %s", run_id)
        _fail_run(run_id, exc)
