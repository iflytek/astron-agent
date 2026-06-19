"""MySQL database adapter implementation."""

from typing import Any, Dict, List, Optional

from loguru import logger
from memory.database.repository.middleware.adapters.base import DatabaseAdapter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import quoted_name

# MySQL reserved keywords
_MYSQL_RESERVED_KEYWORDS = [
    "all",
    "alter",
    "and",
    "as",
    "asc",
    "between",
    "binary",
    "both",
    "by",
    "case",
    "cast",
    "check",
    "collate",
    "column",
    "constraint",
    "create",
    "cross",
    "current_date",
    "current_time",
    "current_timestamp",
    "current_user",
    "database",
    "databases",
    "default",
    "delete",
    "desc",
    "distinct",
    "div",
    "drop",
    "else",
    "end",
    "except",
    "exists",
    "false",
    "fetch",
    "for",
    "foreign",
    "from",
    "full",
    "grant",
    "group",
    "having",
    "in",
    "index",
    "inner",
    "insert",
    "intersect",
    "into",
    "is",
    "join",
    "key",
    "leading",
    "left",
    "like",
    "limit",
    "localtime",
    "localtimestamp",
    "natural",
    "not",
    "null",
    "offset",
    "on",
    "or",
    "order",
    "outer",
    "primary",
    "references",
    "regexp",
    "right",
    "select",
    "session_user",
    "set",
    "some",
    "table",
    "then",
    "to",
    "trailing",
    "true",
    "union",
    "unique",
    "update",
    "usage",
    "user",
    "using",
    "values",
    "when",
    "where",
    "window",
    "with",
]

# MySQL dangerous functions
_MYSQL_DANGEROUS_FUNCTIONS = [
    "current_user",
    "current_database",
    "current_role",
    "session_user",
    "system_user",
    "user",
    "version",
    "database",
    "schema",
    "connection_id",
    "last_insert_id",
    "row_count",
    "found_rows",
    "benchmark",
    "sleep",
    "load_file",
    "into outfile",
    "into dumpfile",
]


class MySQLAdapter(DatabaseAdapter):
    """MySQL-specific database adapter implementation.

    MySQL does not have a separate Schema concept; Database = Schema.
    Therefore:
    - PostgreSQL's CREATE SCHEMA -> MySQL's CREATE DATABASE
    - PostgreSQL's SET search_path -> MySQL's USE `database`
    - PostgreSQL's plpgsql blocks -> MySQL's Python-level loops
    """

    def get_db_type(self) -> str:
        return "mysql"

    def get_sqlglot_dialect(self) -> str:
        return "mysql"

    def build_async_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        return f"mysql+aiomysql://{user}:{password}@{host}:{port}/{database}"

    def build_sync_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

    def get_engine_connect_args(self) -> dict:
        return {}

    async def create_database_if_not_exists(self, base_url: str, db_name: str) -> None:
        safe_db_name = self._validate_mysql_identifier(db_name)
        engine = create_async_engine(
            f"{base_url}/information_schema", isolation_level="AUTOCOMMIT"
        )
        try:
            async with engine.connect() as conn:
                result = await conn.execute(
                    text(
                        "SELECT 1 FROM information_schema.SCHEMATA "
                        "WHERE SCHEMA_NAME = :db_name"
                    ),
                    {"db_name": db_name},
                )
                exists = result.scalar()
                if not exists:
                    await conn.execute(
                        text(
                            f"CREATE DATABASE `{safe_db_name}` "
                            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                        )
                    )
                    logger.info(f"Database '{safe_db_name}' created successfully")
        except RuntimeError as e:
            logger.error(f"Failed to create database '{safe_db_name}': {e}")
        finally:
            await engine.dispose()

    async def create_admin_schema(self, database_url: str) -> None:
        # For MySQL, admin schema = admin database (sparkdb_manager)
        # Extract base_url to connect to information_schema
        base_url, _ = database_url.rsplit("/", 1)
        engine = create_async_engine(
            f"{base_url}/information_schema", isolation_level="AUTOCOMMIT"
        )
        try:
            async with engine.connect() as conn:
                await conn.execute(
                    text(
                        "CREATE DATABASE IF NOT EXISTS `sparkdb_manager` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                )
                logger.info("Database 'sparkdb_manager' ensured")
        except RuntimeError as e:
            logger.error(f"Failed to create database 'sparkdb_manager': {e}")
        finally:
            await engine.dispose()

    def safe_create_schema_sql(self, schema_name: str) -> Any:
        safe_name = quoted_name(
            self._validate_mysql_identifier(schema_name), quote=True
        )
        return text(
            f"CREATE DATABASE IF NOT EXISTS `{safe_name}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )

    def safe_drop_schema_sql(self, schema_name: str) -> Any:
        safe_name = quoted_name(
            self._validate_mysql_identifier(schema_name), quote=True
        )
        return text(f"DROP DATABASE IF EXISTS `{safe_name}`")

    def list_tables_sql(self) -> str:
        return (
            "SELECT TABLE_NAME FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = :schema AND TABLE_TYPE = 'BASE TABLE'"
        )

    def get_column_types_sql(self) -> str:
        return (
            "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE "
            "FROM information_schema.COLUMNS "
            "WHERE TABLE_NAME = :table_name AND TABLE_SCHEMA = :table_schema"
        )

    def get_reserved_keywords(self) -> List[str]:
        return _MYSQL_RESERVED_KEYWORDS

    def get_dangerous_functions(self) -> List[str]:
        return _MYSQL_DANGEROUS_FUNCTIONS

    def is_retryable_cache_error(self, exception: Exception) -> bool:
        # MySQL does not have the InvalidCachedStatementError issue
        return False

    async def clear_statement_cache(self, session: Any) -> None:
        # No-op for MySQL
        pass

    async def restore_search_path(self, session: Any) -> None:
        current_schema = getattr(session, "_current_schema", None)
        if current_schema:
            try:
                safe_name = self._validate_mysql_identifier(current_schema)
                await session.execute(text(f"USE `{safe_name}`"))
                logger.debug(
                    f"Restored active database to {safe_name} after cache clearing"
                )
            except Exception as restore_error:
                logger.warning(
                    f"Failed to restore active database to {current_schema} "
                    f"after cache clearing: {restore_error}"
                )

    def set_search_path_sql(self, schema_name: str) -> str:
        safe_name = quoted_name(
            self._validate_mysql_identifier(schema_name), quote=True
        )
        return f"USE `{safe_name}`"

    def get_alembic_version_table_schema(self) -> Optional[str]:
        # MySQL: version table lives in the sparkdb_manager database directly
        return None

    def get_alembic_include_schemas(self) -> bool:
        return False

    def get_model_table_args(self) -> Dict[str, Any]:
        # MySQL: no schema qualifier needed since we USE the database directly
        return {}

    def get_env_prefix(self) -> str:
        return "MYSQL"

    def get_default_port(self) -> int:
        return 3306

    def _validate_mysql_identifier(self, identifier: str) -> str:
        if not identifier:
            raise ValueError("MySQL identifier must not be empty")
        for char in identifier:
            if not (char.isascii() and (char.isalnum() or char == "_")):
                raise ValueError(f"Invalid MySQL identifier: {identifier}")
        return identifier
