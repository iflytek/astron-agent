import os

from workflow.extensions.middleware.asynchronous.base import AsyncTaskService
from workflow.extensions.middleware.asynchronous.manager import CeleryTaskProcessor
from workflow.extensions.middleware.base import ServiceType
from workflow.extensions.middleware.factory import ServiceFactory


class AsyncServiceFactory(ServiceFactory):
    """Factory class for creating asynchronous task service instances."""

    name = ServiceType.ASYNC_TASK_SERVICE

    def __init__(self) -> None:
        super().__init__(AsyncTaskService)
        self.client: AsyncTaskService | None = None

    def create(self) -> AsyncTaskService:
        """Create and configure an asynchronous task service instance."""
        async_type = os.getenv("ASYNC_TYPE", "celery")
        if async_type == "celery":
            self.client = CeleryTaskProcessor()

        assert self.client is not None
        return self.client
