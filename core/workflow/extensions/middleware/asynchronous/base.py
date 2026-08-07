import abc
from typing import Any, Callable

from workflow.extensions.middleware.base import ServiceType


class AsyncTaskService(abc.ABC):
    """Abstract base class for processing asynchronous tasks."""

    name = ServiceType.ASYNC_TASK_SERVICE

    @abc.abstractmethod
    def launch_task(self, task_func: Callable, *args: Any, **kwargs: Any) -> str:
        """Launch a celery task and return the task id."""

    @abc.abstractmethod
    def cancel_task(self, cancel_func: Callable[[Any], None], **kwargs: Any) -> None:
        """Cancel an asynchronous task."""
