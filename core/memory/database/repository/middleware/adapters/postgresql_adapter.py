"""PostgreSQL database adapter implementation."""

from typing import Any, Dict, List, Optional

from loguru import logger
from memory.database.repository.middleware.adapters.base import DatabaseAdapter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import quoted_name

# PostgreSQL reserved keywords
_PGSQL_RESERVED_KEYWORDS = [
    "all",
    "analyse",
    "analyze",
    "and",
    "any",
    "array",
    "as",
    "asc",
    "asymmetric",
    "authorization",
    "binary",
    "both",
    "case",
    "cast",
    "check",
    "collate",
    "collation",
    "column",
    "concurrently",
    "constraint",
    "create",
    "cross",
    "current_catalog",
    "current_date",
    "current_role",
    "current_schema",
    "current_time",
    "current_timestamp",
    "current_user",
    "default",
    "deferrable",
    "desc",
    "distinct",
    "do",
    "else",
    "end",
    "except",
    "false",
    "fetch",
    "for",
    "foreign",
    "freeze",
    "from",
    "full",
    "grant",
    "group",
    "having",
    "ilike",
    "in",
    "initially",
    "inner",
    "intersect",
    "into",
    "is",
    "isnull",
    "join",
    "lateral",
    "leading",
    "left",
    "like",
    "limit",
    "localtime",
    "localtimestamp",
    "natural",
    "not",
    "notnull",
    "null",
    "offset",
    "on",
    "only",
    "or",
    "order",
    "outer",
    "overlaps",
    "placing",
    "primary",
    "references",
    "returning",
    "right",
    "select",
    "session_user",
    "similar",
    "some",
    "symmetric",
    "table",
    "tablesample",
    "then",
    "to",
    "trailing",
    "true",
    "union",
    "unique",
    "user",
    "using",
    "variadic",
    "verbose",
    "when",
    "where",
    "window",
    "with",
]

# PostgreSQL dangerous functions
_PGSQL_DANGEROUS_FUNCTIONS = [
    "current_catalog",
    "current_database",
    "current_role",
    "current_schema",
    "current_schema",
    "current_schemas",
    "current_user",
    "inet_client_addr",
    "inet_client_port",
    "inet_server_addr",
    "inet_server_port",
    "pg_backend_pid",
    "pg_blocking_pids",
    "pg_conf_load_time",
    "pg_current_logfile",
    "pg_my_temp_schema",
    "pg_is_other_temp_schema",
    "pg_listening_channels",
    "pg_postmaster_start_time",
    "pg_safe_snapshot_blocking_pids",
    "session_user",
    "user",
    "version",
    "pg_current_xact_id",
    "pg_current_xact_id_if_assigned",
    "pg_current_snapshot",
    "txid_current",
    "txid_current_if_assigned",
    "txid_current_snapshot",
    "pg_control_checkpoint",
    "pg_control_system",
    "pg_control_init",
    "pg_control_recovery",
    "current_setting",
    "set_config",
    "pg_cancel_backend",
    "pg_terminate_backend",
    "pg_last_wal_receive_lsn",
    "pg_last_wal_replay_lsn",
    "pg_last_xact_replay_timestamp",
    "pg_is_wal_replay_paused",
    "pg_get_wal_replay_pause_state",
    "pg_export_snapshot",
    "pg_advisory_lock",
    "pg_try_advisory_lock",
]


class PostgreSQLAdapter(DatabaseAdapter):
    """PostgreSQL-specific database adapter implementation."""

    def get_db_type(self) -> str:
        return "postgresql"

    def get_sqlglot_dialect(self) -> str:
        return "postgres"

    def build_async_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}"

    def build_sync_url(
        self, user: str, password: str, host: str, port: int, database: str
    ) -> str:
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"

    def get_engine_connect_args(self) -> dict:
        return {"statement_cache_size": 0}

    async def create_database_if_not_exists(self, base_url: str, db_name: str) -> None:
        engine = create_async_engine(
            f"{base_url}/postgres", isolation_level="AUTOCOMMIT"
        )
        try:
            async with engine.connect() as conn:
                result = await conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                    {"db_name": db_name},
                )
                exists = result.scalar()
                if not exists:
                    await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                    logger.info(f"Database '{db_name}' created successfully")
        except RuntimeError as e:
            logger.error(f"Failed to create database '{db_name}': {e}")
        finally:
            await engine.dispose()

    async def create_admin_schema(self, database_url: str) -> None:
        _, db_name = database_url.rsplit("/", 1)
        schema_engine = create_async_engine(database_url, isolation_level="AUTOCOMMIT")
        try:
            async with schema_engine.connect() as conn:
                await conn.execute(text("CREATE SCHEMA IF NOT EXISTS sparkdb_manager"))
                logger.info(
                    "Schema 'sparkdb_manager' ensured in database '%s'", db_name
                )
        except RuntimeError as e:
            logger.error(
                f"Failed to create schema 'sparkdb_manager' in '{db_name}': {e}"
            )
        finally:
            await schema_engine.dispose()

    def safe_create_schema_sql(self, schema_name: str) -> Any:
        safe_name = quoted_name(schema_name, quote=True)
        return text(f'CREATE SCHEMA IF NOT EXISTS "{safe_name}"')

    def safe_drop_schema_sql(self, schema_name: str) -> Any:
        safe_name = quoted_name(schema_name, quote=True)
        return text(f'DROP SCHEMA IF EXISTS "{safe_name}" CASCADE')

    def list_tables_sql(self) -> str:
        return "SELECT tablename FROM pg_tables WHERE schemaname = :schema"

    def get_column_types_sql(self) -> str:
        return (
            "SELECT column_name, data_type, udt_name "
            "FROM information_schema.columns "
            "WHERE table_name = :table_name AND table_schema = :table_schema"
        )

    def get_reserved_keywords(self) -> List[str]:
        return _PGSQL_RESERVED_KEYWORDS

    def get_dangerous_functions(self) -> List[str]:
        return _PGSQL_DANGEROUS_FUNCTIONS

    def is_retryable_cache_error(self, exception: Exception) -> bool:
        try:
            from asyncpg.exceptions import InvalidCachedStatementError

            if isinstance(exception, InvalidCachedStatementError):
                return True
        except ImportError:
            pass

        from sqlalchemy.exc import NotSupportedError

        if isinstance(exception, NotSupportedError):
            error_str = str(exception).lower()
            if (
                "invalidcachedstatementerror" in error_str
                or "cached statement plan is invalid" in error_str
            ):
                return True

        original_error = getattr(exception, "__cause__", None) or getattr(
            exception, "__context__", None
        )
        if original_error:
            try:
                from asyncpg.exceptions import InvalidCachedStatementError

                if isinstance(original_error, InvalidCachedStatementError):
                    return True
            except ImportError:
                pass

        return False

    async def clear_statement_cache(self, session: Any) -> None:
        if hasattr(session, "execute"):
            try:
                await session.execute(text("DISCARD PLANS"))
                logger.debug("Cleared prepared statement cache using DISCARD PLANS")
                return
            except Exception as e:
                logger.warning(
                    f"Failed to execute DISCARD PLANS: {e}, trying fallback method"
                )

        if hasattr(session, "invalidate"):
            try:
                await session.invalidate()
                logger.debug("Invalidated session connection as fallback")
            except Exception as e:
                logger.warning(f"Failed to invalidate session: {e}")

    async def restore_search_path(self, session: Any) -> None:
        current_schema = getattr(session, "_current_schema", None)
        if current_schema:
            try:
                safe_name = quoted_name(current_schema, quote=True)
                await session.execute(text(f'SET search_path = "{safe_name}"'))
                logger.debug(
                    f"Restored search_path to {current_schema} after cache clearing"
                )
            except Exception as restore_error:
                logger.warning(
                    f"Failed to restore search_path to {current_schema} "
                    f"after cache clearing: {restore_error}"
                )

    def set_search_path_sql(self, schema_name: str) -> str:
        safe_name = quoted_name(schema_name, quote=True)
        return f'SET search_path = "{safe_name}"'

    def get_alembic_version_table_schema(self) -> Optional[str]:
        return "sparkdb_manager"

    def get_alembic_include_schemas(self) -> bool:
        return True

    def get_model_table_args(self) -> Dict[str, Any]:
        return {"schema": "sparkdb_manager"}

    def get_env_prefix(self) -> str:
        return "PGSQL"

    def get_default_port(self) -> int:
        return 5432
