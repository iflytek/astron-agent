"""Unit tests for database adapter layer (ABC, PostgreSQL, MySQL, registry)."""

import os
from unittest.mock import AsyncMock, patch

import pytest
from memory.database.repository.middleware.adapters.base import DatabaseAdapter
from memory.database.repository.middleware.adapters.mysql_adapter import MySQLAdapter
from memory.database.repository.middleware.adapters.postgresql_adapter import (
    PostgreSQLAdapter,
)
from memory.database.repository.middleware.adapters.registry import (
    get_adapter,
    reset_adapter,
)

# ---------------------------------------------------------------------------
# A. DatabaseAdapter ABC
# ---------------------------------------------------------------------------


class TestDatabaseAdapterABC:
    """Tests for the DatabaseAdapter abstract base class."""

    def test_cannot_instantiate_directly(self) -> None:
        """DatabaseAdapter cannot be instantiated because it is abstract."""
        with pytest.raises(TypeError):
            DatabaseAdapter()  # type: ignore[abstract]

    def test_has_all_expected_abstract_methods(self) -> None:
        """DatabaseAdapter defines all 22 expected abstract methods."""
        expected = {
            "get_db_type",
            "get_sqlglot_dialect",
            "build_async_url",
            "build_sync_url",
            "get_engine_connect_args",
            "create_database_if_not_exists",
            "create_admin_schema",
            "safe_create_schema_sql",
            "safe_drop_schema_sql",
            "list_tables_sql",
            "get_column_types_sql",
            "get_reserved_keywords",
            "get_dangerous_functions",
            "is_retryable_cache_error",
            "clear_statement_cache",
            "restore_search_path",
            "set_search_path_sql",
            "get_alembic_version_table_schema",
            "get_alembic_include_schemas",
            "get_model_table_args",
            "get_env_prefix",
            "get_default_port",
        }
        actual = set(DatabaseAdapter.__abstractmethods__)
        assert actual == expected

    def test_both_adapters_are_subclasses(self) -> None:
        """PostgreSQLAdapter and MySQLAdapter are subclasses of DatabaseAdapter."""
        assert issubclass(PostgreSQLAdapter, DatabaseAdapter)
        assert issubclass(MySQLAdapter, DatabaseAdapter)


# ---------------------------------------------------------------------------
# B. PostgreSQLAdapter
# ---------------------------------------------------------------------------


class TestPostgreSQLAdapter:
    """Tests for the PostgreSQL adapter implementation."""

    def setup_method(self) -> None:
        """Create a fresh adapter for each test."""
        self.adapter = PostgreSQLAdapter()

    def test_get_db_type(self) -> None:
        """get_db_type returns 'postgresql'."""
        assert self.adapter.get_db_type() == "postgresql"

    def test_get_sqlglot_dialect(self) -> None:
        """get_sqlglot_dialect returns 'postgres'."""
        assert self.adapter.get_sqlglot_dialect() == "postgres"

    def test_build_async_url(self) -> None:
        """build_async_url returns 'postgresql+asyncpg://...' format."""
        url = self.adapter.build_async_url("u", "p", "h", 5432, "db")
        assert url == "postgresql+asyncpg://u:p@h:5432/db"

    def test_build_sync_url(self) -> None:
        """build_sync_url returns 'postgresql+psycopg2://...' format."""
        url = self.adapter.build_sync_url("u", "p", "h", 5432, "db")
        assert url == "postgresql+psycopg2://u:p@h:5432/db"

    def test_get_engine_connect_args(self) -> None:
        """get_engine_connect_args returns statement_cache_size=0."""
        assert self.adapter.get_engine_connect_args() == {"statement_cache_size": 0}

    def test_safe_create_schema_sql(self) -> None:
        """safe_create_schema_sql contains CREATE SCHEMA IF NOT EXISTS."""
        result = self.adapter.safe_create_schema_sql("my_schema")
        assert "CREATE SCHEMA IF NOT EXISTS" in str(result.text)

    def test_safe_drop_schema_sql(self) -> None:
        """safe_drop_schema_sql contains DROP SCHEMA IF EXISTS ... CASCADE."""
        result = self.adapter.safe_drop_schema_sql("my_schema")
        sql_text = str(result.text)
        assert "DROP SCHEMA IF EXISTS" in sql_text
        assert "CASCADE" in sql_text

    def test_list_tables_sql(self) -> None:
        """list_tables_sql references pg_tables."""
        assert "pg_tables" in self.adapter.list_tables_sql()

    def test_get_column_types_sql(self) -> None:
        """get_column_types_sql references information_schema.columns."""
        assert "information_schema.columns" in self.adapter.get_column_types_sql()

    def test_get_reserved_keywords_contains_expected(self) -> None:
        """Reserved keywords include 'select', 'ilike', 'freeze'."""
        keywords = self.adapter.get_reserved_keywords()
        for kw in ("select", "ilike", "freeze"):
            assert kw in keywords

    def test_get_dangerous_functions_contains_expected(self) -> None:
        """Dangerous functions include 'current_user', 'pg_cancel_backend', 'version'."""
        funcs = self.adapter.get_dangerous_functions()
        for fn in ("current_user", "pg_cancel_backend", "version"):
            assert fn in funcs

    def test_is_retryable_cache_error_not_supported_error(self) -> None:
        """NotSupportedError with 'invalidcachedstatementerror' is retryable."""
        from sqlalchemy.exc import NotSupportedError

        exc = NotSupportedError(
            "sqlalchemy", {}, Exception("InvalidCachedStatementError occurred")
        )
        assert self.adapter.is_retryable_cache_error(exc) is True

    def test_is_retryable_cache_error_unrelated(self) -> None:
        """An unrelated ValueError is not retryable."""
        assert self.adapter.is_retryable_cache_error(ValueError("unrelated")) is False

    def test_is_retryable_cache_error_chained_cause(self) -> None:
        """Exception with __cause__ being InvalidCachedStatementError is retryable."""
        try:
            from asyncpg.exceptions import InvalidCachedStatementError

            outer = RuntimeError("wrapper")
            outer.__cause__ = InvalidCachedStatementError("cache invalid")
            assert self.adapter.is_retryable_cache_error(outer) is True
        except ImportError:
            pytest.skip("asyncpg not available")

    @pytest.mark.asyncio
    async def test_clear_statement_cache_calls_discard_plans(self) -> None:
        """clear_statement_cache calls session.execute(text('DISCARD PLANS'))."""
        session = AsyncMock()
        await self.adapter.clear_statement_cache(session)
        session.execute.assert_called_once()
        call_arg = session.execute.call_args[0][0]
        assert "DISCARD PLANS" in str(call_arg.text)

    @pytest.mark.asyncio
    async def test_clear_statement_cache_fallback_on_failure(self) -> None:
        """clear_statement_cache falls back to session.invalidate() on failure."""
        session = AsyncMock()
        session.execute.side_effect = RuntimeError("fail")
        session.invalidate = AsyncMock()
        await self.adapter.clear_statement_cache(session)
        session.invalidate.assert_called_once()

    @pytest.mark.asyncio
    async def test_restore_search_path_with_schema(self) -> None:
        """restore_search_path executes SET search_path when _current_schema is set."""
        session = AsyncMock()
        session._current_schema = "my_schema"
        await self.adapter.restore_search_path(session)
        session.execute.assert_called_once()
        call_arg = session.execute.call_args[0][0]
        assert "SET search_path" in str(call_arg.text)

    @pytest.mark.asyncio
    async def test_restore_search_path_without_schema(self) -> None:
        """restore_search_path is a no-op when _current_schema is not set."""
        session = AsyncMock(spec=[])
        await self.adapter.restore_search_path(session)
        # No execute call since there's no _current_schema attribute

    def test_set_search_path_sql(self) -> None:
        """set_search_path_sql returns SET search_path = '...' format."""
        result = self.adapter.set_search_path_sql("my_schema")
        assert "SET search_path" in result

    def test_alembic_version_table_schema(self) -> None:
        """Alembic version table schema is 'sparkdb_manager'."""
        assert self.adapter.get_alembic_version_table_schema() == "sparkdb_manager"

    def test_alembic_include_schemas(self) -> None:
        """Alembic include_schemas is True."""
        assert self.adapter.get_alembic_include_schemas() is True

    def test_model_table_args(self) -> None:
        """Model table_args has schema='sparkdb_manager'."""
        assert self.adapter.get_model_table_args() == {"schema": "sparkdb_manager"}

    def test_env_prefix(self) -> None:
        """Environment variable prefix is 'PGSQL'."""
        assert self.adapter.get_env_prefix() == "PGSQL"

    def test_default_port(self) -> None:
        """Default port is 5432."""
        assert self.adapter.get_default_port() == 5432


# ---------------------------------------------------------------------------
# C. MySQLAdapter
# ---------------------------------------------------------------------------


class TestMySQLAdapter:
    """Tests for the MySQL adapter implementation."""

    def setup_method(self) -> None:
        """Create a fresh adapter for each test."""
        self.adapter = MySQLAdapter()

    def test_get_db_type(self) -> None:
        """get_db_type returns 'mysql'."""
        assert self.adapter.get_db_type() == "mysql"

    def test_get_sqlglot_dialect(self) -> None:
        """get_sqlglot_dialect returns 'mysql'."""
        assert self.adapter.get_sqlglot_dialect() == "mysql"

    def test_build_async_url(self) -> None:
        """build_async_url returns 'mysql+aiomysql://...' format."""
        url = self.adapter.build_async_url("u", "p", "h", 3306, "db")
        assert url == "mysql+aiomysql://u:p@h:3306/db"

    def test_build_sync_url(self) -> None:
        """build_sync_url returns 'mysql+pymysql://...' format."""
        url = self.adapter.build_sync_url("u", "p", "h", 3306, "db")
        assert url == "mysql+pymysql://u:p@h:3306/db"

    def test_get_engine_connect_args(self) -> None:
        """get_engine_connect_args returns empty dict."""
        assert self.adapter.get_engine_connect_args() == {}

    def test_safe_create_schema_sql(self) -> None:
        """safe_create_schema_sql uses CREATE DATABASE IF NOT EXISTS with utf8mb4."""
        result = self.adapter.safe_create_schema_sql("my_schema")
        sql_text = str(result.text)
        assert "CREATE DATABASE IF NOT EXISTS" in sql_text
        assert "utf8mb4" in sql_text

    def test_safe_drop_schema_sql(self) -> None:
        """safe_drop_schema_sql uses DROP DATABASE IF EXISTS."""
        result = self.adapter.safe_drop_schema_sql("my_schema")
        assert "DROP DATABASE IF EXISTS" in str(result.text)

    def test_list_tables_sql(self) -> None:
        """list_tables_sql references information_schema.TABLES and BASE TABLE."""
        sql = self.adapter.list_tables_sql()
        assert "information_schema.TABLES" in sql
        assert "BASE TABLE" in sql

    def test_get_column_types_sql(self) -> None:
        """get_column_types_sql references information_schema.COLUMNS."""
        assert "information_schema.COLUMNS" in self.adapter.get_column_types_sql()

    def test_get_reserved_keywords_contains_expected(self) -> None:
        """Reserved keywords include 'database', 'databases', but not 'ilike'."""
        keywords = self.adapter.get_reserved_keywords()
        assert "database" in keywords
        assert "databases" in keywords
        assert "ilike" not in keywords

    def test_get_dangerous_functions_contains_expected(self) -> None:
        """Dangerous functions include 'sleep', 'benchmark', 'load_file'."""
        funcs = self.adapter.get_dangerous_functions()
        for fn in ("sleep", "benchmark", "load_file"):
            assert fn in funcs

    def test_is_retryable_cache_error_always_false(self) -> None:
        """MySQL adapter always returns False for cache errors."""
        assert self.adapter.is_retryable_cache_error(RuntimeError("any")) is False
        assert self.adapter.is_retryable_cache_error(ValueError("whatever")) is False

    @pytest.mark.asyncio
    async def test_clear_statement_cache_is_noop(self) -> None:
        """clear_statement_cache is a no-op (session methods not called)."""
        session = AsyncMock()
        await self.adapter.clear_statement_cache(session)
        session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_restore_search_path_with_schema(self) -> None:
        """restore_search_path executes USE `...` when _current_schema is set."""
        session = AsyncMock()
        session._current_schema = "my_schema"
        await self.adapter.restore_search_path(session)
        session.execute.assert_called_once()
        call_arg = session.execute.call_args[0][0]
        assert "USE" in str(call_arg.text)

    @pytest.mark.asyncio
    async def test_restore_search_path_without_schema(self) -> None:
        """restore_search_path is a no-op when _current_schema is not set."""
        session = AsyncMock(spec=[])
        await self.adapter.restore_search_path(session)
        # No execute call since there's no _current_schema attribute

    def test_set_search_path_sql(self) -> None:
        """set_search_path_sql returns USE `...` format."""
        result = self.adapter.set_search_path_sql("my_schema")
        assert "USE" in result

    def test_set_search_path_sql_rejects_invalid_identifier(self) -> None:
        """set_search_path_sql rejects identifiers containing unsafe characters."""
        with pytest.raises(ValueError):
            self.adapter.set_search_path_sql("my-schema")

    def test_set_search_path_sql_rejects_non_ascii_identifier(self) -> None:
        """set_search_path_sql rejects non-ASCII identifiers."""
        with pytest.raises(ValueError):
            self.adapter.set_search_path_sql("测试_schema")

    def test_alembic_version_table_schema(self) -> None:
        """Alembic version table schema is None for MySQL."""
        assert self.adapter.get_alembic_version_table_schema() is None

    def test_alembic_include_schemas(self) -> None:
        """Alembic include_schemas is False."""
        assert self.adapter.get_alembic_include_schemas() is False

    def test_model_table_args(self) -> None:
        """Model table_args is empty dict."""
        assert self.adapter.get_model_table_args() == {}

    def test_env_prefix(self) -> None:
        """Environment variable prefix is 'MYSQL'."""
        assert self.adapter.get_env_prefix() == "MYSQL"

    def test_default_port(self) -> None:
        """Default port is 3306."""
        assert self.adapter.get_default_port() == 3306


# ---------------------------------------------------------------------------
# D. Registry get_adapter / reset_adapter
# ---------------------------------------------------------------------------


class TestAdapterRegistry:
    """Tests for the adapter registry (get_adapter / reset_adapter)."""

    def setup_method(self) -> None:
        """Reset adapter before each test."""
        reset_adapter()

    def teardown_method(self) -> None:
        """Reset adapter after each test."""
        reset_adapter()

    def test_default_returns_postgresql(self) -> None:
        """No DB_TYPE env var returns PostgreSQLAdapter."""
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("DB_TYPE", None)
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

    def test_postgresql_explicit(self) -> None:
        """DB_TYPE=postgresql returns PostgreSQLAdapter."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

    def test_mysql_explicit(self) -> None:
        """DB_TYPE=mysql returns MySQLAdapter."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

    def test_mixed_case(self) -> None:
        """DB_TYPE=PostgreSQL (mixed case) returns PostgreSQLAdapter."""
        with patch.dict(os.environ, {"DB_TYPE": "PostgreSQL"}):
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

    def test_unsupported_raises(self) -> None:
        """DB_TYPE=oracle raises ValueError."""
        with patch.dict(os.environ, {"DB_TYPE": "oracle"}):
            with pytest.raises(ValueError, match="Unsupported DB_TYPE"):
                get_adapter()

    def test_singleton_behavior(self) -> None:
        """Two consecutive calls return the same instance."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            first = get_adapter()
            second = get_adapter()
            assert first is second

    def test_reset_clears_singleton(self) -> None:
        """reset_adapter clears the cached singleton."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            first = get_adapter()
            reset_adapter()
            second = get_adapter()
            assert first is not second


# ---------------------------------------------------------------------------
# E. Cross-Adapter Comparison
# ---------------------------------------------------------------------------


class TestCrossAdapterComparison:
    """Cross-adapter comparison tests."""

    def test_different_reserved_keywords(self) -> None:
        """PG has 'ilike'; MySQL has 'database' instead."""
        pg = PostgreSQLAdapter()
        my = MySQLAdapter()
        assert "ilike" in pg.get_reserved_keywords()
        assert "ilike" not in my.get_reserved_keywords()
        assert "database" in my.get_reserved_keywords()
        assert "database" not in pg.get_reserved_keywords()

    def test_different_dangerous_functions(self) -> None:
        """PG has 'pg_cancel_backend'; MySQL has 'sleep'."""
        pg = PostgreSQLAdapter()
        my = MySQLAdapter()
        assert "pg_cancel_backend" in pg.get_dangerous_functions()
        assert "pg_cancel_backend" not in my.get_dangerous_functions()
        assert "sleep" in my.get_dangerous_functions()
        assert "sleep" not in pg.get_dangerous_functions()
