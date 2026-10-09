from celery import Celery

from agent_runtime.settings import get_settings

settings = get_settings()
celery_app = Celery(
    "agent_runtime",
    broker=settings.resolved_redis_url(),
    include=["agent_runtime.worker.tasks"],
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_ignore_result=True,
    task_soft_time_limit=settings.worker_soft_time_limit_seconds,
    task_time_limit=settings.worker_time_limit_seconds,
    broker_connection_retry_on_startup=True,
)
