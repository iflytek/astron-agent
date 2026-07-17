"""Abstract base class for database adapters."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class DatabaseAdapter(ABC):
    """Abstract base class defining the interface for database adapters.

    All database-specific operations are encapsulated behind this interface,
    allowing the application to support multiple database backends
    (PostgreSQL, MySQL, etc.) through the Strategy pattern.
    """

    @abstractmethod
    def get_db_type(self) -> str:
        """Return the database type identifier (e.g., 'postgresql', 'mysql')."""

    @abstractmethod
    def get_sqlglot_dialect(self) -> str:
        """Return the sqlglot dialect string for SQL parsing/generation."""

    @abstractmethod
    def build_async_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        """Build the async database connection URL."""

    @abstractmethod
    def build_sync_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        """Build the sync database connection URL (for Alembic migrations)."""

    @abstractmethod
    def get_engine_connect_args(self) -> dict:
        """Return engine-specific connect_args for create_async_engine."""

    @abstractmethod
    async def create_database_if_not_exists(self, base_url: str, db_name: str) -> None:
        """Create the target database if it does not exist."""

    @abstractmethod
    async def create_admin_schema(self, database_url: str) -> None:
        """Create the admin schema/database (sparkdb_manager)."""

    @abstractmethod
    def safe_create_schema_sql(self, schema_name: str) -> Any:
        """Return SQL to safely create a schema/database."""

    @abstractmethod
    def safe_drop_schema_sql(self, schema_name: str) -> Any:
        """Return SQL to safely drop a schema/database."""

    @abstractmethod
    def list_tables_sql(self) -> str:
        """Return SQL to list tables in a schema. Uses :schema as parameter."""

    @abstractmethod
    def get_column_types_sql(self) -> str:
        """Return SQL to get column types. Uses :table_name and :table_schema as parameters."""

    @abstractmethod
    def get_reserved_keywords(self) -> List[str]:
        """Return list of reserved keywords for this database."""

    @abstractmethod
    def get_dangerous_functions(self) -> List[str]:
        """Return list of dangerous functions to block."""

    @abstractmethod
    def is_retryable_cache_error(self, exception: Exception) -> bool:
        """Check if the exception is a retryable cache error."""

    @abstractmethod
    async def clear_statement_cache(self, session: Any) -> None:
        """Clear the statement cache for the given session."""

    @abstractmethod
    async def restore_search_path(self, session: Any) -> None:
        """Restore search_path after cache clearing."""

    @abstractmethod
    def set_search_path_sql(self, schema_name: str) -> str:
        """Return SQL to set the active schema/search path."""

    @abstractmethod
    def get_alembic_version_table_schema(self) -> Optional[str]:
        """Return the schema for the Alembic version table."""

    @abstractmethod
    def get_alembic_include_schemas(self) -> bool:
        """Return whether Alembic should include schemas."""

    @abstractmethod
    def get_model_table_args(self) -> Dict[str, Any]:
        """Return __table_args__ for SQLModel models."""

    @abstractmethod
    def get_env_prefix(self) -> str:
        """Return the environment variable prefix (e.g., 'PGSQL', 'MYSQL')."""

    @abstractmethod
    def get_default_port(self) -> int:
        """Return the default port for this database."""
