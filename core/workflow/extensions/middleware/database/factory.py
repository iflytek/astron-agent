"""
Database service factory module.

This module provides a factory class for creating database service instances
with configurable connection parameters.
"""

from workflow.configs import workflow_config
from workflow.extensions.middleware.database.manager import DatabaseService
from workflow.extensions.middleware.factory import ServiceFactory


class DatabaseServiceFactory(ServiceFactory):
    """
    Factory class for creating DatabaseService instances.

    This factory handles the creation of database service instances with
    automatic configuration from environment variables when no explicit
    database URL is provided.
    """

    def __init__(self) -> None:
        """
        Initialize the DatabaseServiceFactory.

        Sets up the factory to create DatabaseService instances.
        """
        super().__init__(DatabaseService)

    def create(self) -> DatabaseService:
        """
        Create a new DatabaseService instance.

        The method constructs the database URL from environment variables
        (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB).

        :return: A configured DatabaseService instance
        """
        return DatabaseService(config=workflow_config.database_config)
