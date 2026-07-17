"""
Database service factory module for creating and configuring DatabaseService instances.
"""

import os
from typing import Optional

from memory.database.repository.middleware.adapters import get_adapter
from memory.database.repository.middleware.database.db_manager import DatabaseService
from memory.database.repository.middleware.factory import ServiceFactory


class DatabaseServiceFactory(ServiceFactory):  # pylint: disable=too-few-public-methods
    """
    Factory class for creating DatabaseService instances
    with environment-based configuration.

    Inherits from ServiceFactory to provide
    database service creation capabilities.
    """

    def __init__(self) -> None:
        """Initialize the factory with DatabaseService as the target service class."""
        super().__init__(DatabaseService)

    async def create(self, database_url: Optional[str] = None) -> DatabaseService:
        """Create a new DatabaseService instance.

        Args:
            database_url: Optional direct database URL.
            If not provided, will be constructed
            from environment variables using the configured adapter.

        Returns:
            DatabaseService: Configured database service instance
        """
        adapter = get_adapter()

        if database_url is None:
            prefix = adapter.get_env_prefix()
            user = os.getenv(f"{prefix}_USER")
            password = os.getenv(f"{prefix}_PASSWORD")
            database = os.getenv(f"{prefix}_DATABASE")
            host = os.getenv(f"{prefix}_HOST")
            port = int(os.getenv(f"{prefix}_PORT", str(adapter.get_default_port())))
            database_url = adapter.build_async_url(user, password, host, port, database)
        return await DatabaseService.create(database_url=database_url, adapter=adapter)
