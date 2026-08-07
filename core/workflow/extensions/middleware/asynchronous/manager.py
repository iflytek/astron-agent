from typing import Any, Callable

from celery import Celery
from celery.result import AsyncResult

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.middleware.asynchronous.base import AsyncTaskService
from workflow.extensions.middleware.asynchronous.celery_app import app
from workflow.extensions.middleware.base import Service


class CeleryTaskProcessor(AsyncTaskService, Service):
    """Celery-based implementation of the AsyncTaskService."""

    def __init__(self) -> None:
        self.app: Celery = app

    def launch_task(self, task_func: Callable, *args: Any, **kwargs: Any) -> str:
        """Launch a celery task and return the task id."""
        if not hasattr(task_func, "delay"):
            msg = f"Task function {task_func} does not have a delay method"
            raise ValueError(msg)
        result: AsyncResult = task_func.delay(*args, **kwargs)
        return result.id

    def cancel_task(self, cancel_func: Callable[[Any], None], **kwargs: Any) -> None:
        try:
            cancel_func(self.app, **kwargs)
        except Exception as e:
            raise CustomException(
                CodeEnum.ASYNC_TASK_CANCEL_ERROR,
                err_msg="Failed to cancel async task",
                cause_error=str(e),
            ) from e
