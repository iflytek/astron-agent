"""
Database service manager module.

This module provides the core database service implementation with connection
pooling, session management, and context manager support.
"""

from typing import Any, Generator, Optional

from loguru import logger
from sqlalchemy import Engine, create_engine, text
from sqlmodel import Session  # type: ignore

from workflow.configs.app_config import DatabaseConfig
from workflow.extensions.middleware.base import Service
from workflow.extensions.middleware.utils import ServiceType


class DatabaseService(Service):
    """
    Database service implementation with connection pooling and session management.

    This service provides a high-level interface for database operations with
    automatic connection pooling, session lifecycle management, and context
    manager support for safe transaction handling.
    """

    name = ServiceType.DATABASE_SERVICE

    def __init__(
        self,
        config: DatabaseConfig,
        connect_timeout: int = 10,
        pool_size: int = 200,
        max_overflow: int = 800,
        pool_recycle: int = 3600,
    ) -> None:
        """
        Initialize the database service with connection parameters.

        :param config: DatabaseConfig instance (host, port, user, password, database).
        :param connect_timeout: Connection timeout in seconds.
        :param pool_size: Number of connections to maintain in the pool.
        :param max_overflow: Maximum number of additional connections beyond pool_size.
        :param pool_recycle: Maximum seconds before recycling a connection,
                            used to handle database server auto-closing long-running connections.
        """
        self.host = config.host
        self.port = config.port
        self.user = config.user
        self.password = config.password
        self.database = config.database
        # Store pool configuration
        self.connect_timeout = connect_timeout
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_recycle = pool_recycle

        # Initialize database and engine
        self._create_database_if_not_exists()
        self.engine = self._create_engine()

    def _build_base_url(self) -> str:
        """
        Build the base connection URL without database name.
        """
        return f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}"

    def _build_connection_url(self) -> str:
        """
        Build the complete database connection URL with database name.
        """
        return f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

    def _create_engine(self, database_url: Optional[str] = None) -> "Engine":
        """
        Create and configure the SQLAlchemy engine.

        :param database_url: Optional database URL. If not provided, uses the default connection URL
        :return: Configured SQLAlchemy engine instance
        """
        url = database_url or self._build_connection_url()
        return create_engine(
            url,
            echo=False,
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_recycle=self.pool_recycle,
        )

    def _create_database_if_not_exists(self) -> None:
        """
        Create the database if it doesn't exist.
        """
        try:
            base_url = self._build_base_url()
            engine = self._create_engine(base_url)
            with engine.connect() as conn:
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{self.database}`"))
                conn.commit()
            engine.dispose()
        except Exception as e:
            logger.warning(f"Failed to create database '{self.database}': {e}")

    def __enter__(self) -> Session:
        """
        Context manager entry point.

        Creates a new database session for use within a context block.

        :return: Database session instance
        """
        self._session = Session(self.engine)
        return self._session

    def __exit__(
        self,
        exc_type: Optional[type],
        exc_value: Optional[Exception],
        traceback: Optional[Any],
    ) -> None:
        """
        Context manager exit point.

        Handles session cleanup and transaction management. If an exception
        occurred, the session is rolled back. Otherwise, changes are committed.

        :param exc_type: Exception type if an exception occurred
        :param exc_value: Exception value if an exception occurred
        :param traceback: Exception traceback if an exception occurred
        """
        if exc_type is not None:
            logger.error(
                f"Session rollback because of exception: "
                f"{exc_type.__name__} {exc_value}"
            )
            self._session.rollback()
        else:
            self._session.commit()
        self._session.close()

    def get_session(self) -> Generator[Session, None, None]:
        """
        Get a database session as a generator.

        This method provides a session that is automatically managed
        and cleaned up when the generator is exhausted.

        :return: Generator yielding a database session
        """
        with Session(self.engine) as session:
            yield session
