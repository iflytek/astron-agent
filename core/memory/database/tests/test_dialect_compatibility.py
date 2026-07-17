"""Unit tests for database dialect compatibility in DDL and DML operations.

This test module ensures that all SQL parsing operations correctly use the
database-specific dialect (MySQL or PostgreSQL) to avoid parsing errors.
"""

import os
from unittest.mock import MagicMock, patch

from memory.database.api.v1.exec_ddl import _rebuild_ddl_from_ast, is_ddl_allowed
from memory.database.api.v1.exec_dml import rewrite_dml_with_uid_and_limit
from memory.database.repository.middleware.adapters import get_adapter
from memory.database.repository.middleware.adapters.mysql_adapter import MySQLAdapter
from memory.database.repository.middleware.adapters.postgresql_adapter import (
    PostgreSQLAdapter,
)
from memory.database.repository.middleware.adapters.registry import reset_adapter


class TestDDLDialectCompatibility:
    """Test DDL operations with both MySQL and PostgreSQL dialects."""

    def setup_method(self) -> None:
        """Reset adapter before each test."""
        reset_adapter()

    def teardown_method(self) -> None:
        """Reset adapter after each test."""
        reset_adapter()

    def test_is_ddl_allowed_mysql_create_table_with_auto_increment(self) -> None:
        """Test MySQL-specific CREATE TABLE with AUTO_INCREMENT."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            mock_span_context = MagicMock()
            # MySQL-specific syntax with AUTO_INCREMENT and COMMENT
            mysql_ddl = """
                CREATE TABLE `users` (
                    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
                    `name` VARCHAR(255) NOT NULL COMMENT 'User name',
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) COMMENT='User table'
            """

            result = is_ddl_allowed(mysql_ddl, mock_span_context)
            assert (
                result is True
            ), "MySQL CREATE TABLE with AUTO_INCREMENT should be allowed"

    def test_is_ddl_allowed_postgresql_create_table_with_serial(self) -> None:
        """Test PostgreSQL-specific CREATE TABLE with SERIAL."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            mock_span_context = MagicMock()
            # PostgreSQL-specific syntax with SERIAL
            pg_ddl = """
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """

            result = is_ddl_allowed(pg_ddl, mock_span_context)
            assert (
                result is True
            ), "PostgreSQL CREATE TABLE with SERIAL should be allowed"

    def test_is_ddl_allowed_mysql_alter_table(self) -> None:
        """Test MySQL-specific ALTER TABLE syntax."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            mock_span_context = MagicMock()
            mysql_ddl = "ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) COMMENT 'Email address'"

            result = is_ddl_allowed(mysql_ddl, mock_span_context)
            assert result is True, "MySQL ALTER TABLE should be allowed"

    def test_is_ddl_allowed_postgresql_alter_table(self) -> None:
        """Test PostgreSQL-specific ALTER TABLE syntax."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            mock_span_context = MagicMock()
            pg_ddl = "ALTER TABLE users ADD COLUMN email VARCHAR(255)"

            result = is_ddl_allowed(pg_ddl, mock_span_context)
            assert result is True, "PostgreSQL ALTER TABLE should be allowed"

    def test_rebuild_ddl_mysql_syntax(self) -> None:
        """Test DDL rebuilding with MySQL dialect."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            mock_span_context = MagicMock()
            mysql_ddl = "CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255))"

            rebuilt = _rebuild_ddl_from_ast(mysql_ddl, mock_span_context)
            assert isinstance(rebuilt, str)
            assert len(rebuilt) > 0, "Rebuilt DDL should not be empty"
            # MySQL dialect should preserve the structure
            assert "CREATE" in rebuilt.upper()
            assert "TABLE" in rebuilt.upper()

    def test_rebuild_ddl_postgresql_syntax(self) -> None:
        """Test DDL rebuilding with PostgreSQL dialect."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            mock_span_context = MagicMock()
            pg_ddl = "CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)"

            rebuilt = _rebuild_ddl_from_ast(pg_ddl, mock_span_context)
            assert isinstance(rebuilt, str)
            assert len(rebuilt) > 0, "Rebuilt DDL should not be empty"
            assert "CREATE" in rebuilt.upper()
            assert "TABLE" in rebuilt.upper()


class TestDMLDialectCompatibility:
    """Test DML operations with both MySQL and PostgreSQL dialects."""

    def setup_method(self) -> None:
        """Reset adapter before each test."""
        reset_adapter()

    def teardown_method(self) -> None:
        """Reset adapter after each test."""
        reset_adapter()

    def test_rewrite_dml_mysql_dialect(self) -> None:
        """Test DML rewriting with MySQL dialect."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            test_dml = "SELECT * FROM users WHERE age > 18"
            app_id = "app123"
            uid = "user456"
            limit_num = 100

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=limit_num,
            )

            # Should successfully rewrite without errors
            assert isinstance(rewritten_sql, str)
            assert len(rewritten_sql) > 0
            assert "LIMIT" in rewritten_sql
            assert isinstance(params_dict, dict)

    def test_rewrite_dml_postgresql_dialect(self) -> None:
        """Test DML rewriting with PostgreSQL dialect."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            test_dml = "SELECT * FROM users WHERE age > 18"
            app_id = "app123"
            uid = "user456"
            limit_num = 100

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=limit_num,
            )

            # Should successfully rewrite without errors
            assert isinstance(rewritten_sql, str)
            assert len(rewritten_sql) > 0
            assert "LIMIT" in rewritten_sql
            assert isinstance(params_dict, dict)

    def test_rewrite_dml_mysql_with_backticks(self) -> None:
        """Test DML rewriting with MySQL backtick identifiers."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            # MySQL allows backticks for identifiers
            test_dml = "SELECT * FROM `users` WHERE `age` > 18"
            app_id = "app123"
            uid = "user456"
            limit_num = 100

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=limit_num,
            )

            assert isinstance(rewritten_sql, str)
            assert len(rewritten_sql) > 0
            assert "LIMIT" in rewritten_sql

    def test_rewrite_dml_postgresql_with_double_quotes(self) -> None:
        """Test DML rewriting with PostgreSQL double-quoted identifiers."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            # PostgreSQL uses double quotes for case-sensitive identifiers
            test_dml = 'SELECT * FROM "Users" WHERE "Age" > 18'
            app_id = "app123"
            uid = "user456"
            limit_num = 100

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=limit_num,
            )

            assert isinstance(rewritten_sql, str)
            assert len(rewritten_sql) > 0
            assert "LIMIT" in rewritten_sql

    def test_rewrite_dml_mysql_insert_with_auto_increment(self) -> None:
        """Test INSERT rewriting with MySQL (AUTO_INCREMENT context)."""
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, MySQLAdapter)

            test_dml = (
                "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
            )
            app_id = "app123"
            uid = "user456"

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=100,
            )

            assert isinstance(rewritten_sql, str)
            assert len(insert_ids) == 1
            assert isinstance(insert_ids[0], int)

    def test_rewrite_dml_postgresql_insert_with_serial(self) -> None:
        """Test INSERT rewriting with PostgreSQL (SERIAL context)."""
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            adapter = get_adapter()
            assert isinstance(adapter, PostgreSQLAdapter)

            test_dml = (
                "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
            )
            app_id = "app123"
            uid = "user456"

            rewritten_sql, insert_ids, params_dict = rewrite_dml_with_uid_and_limit(
                dml=test_dml,
                app_id=app_id,
                uid=uid,
                limit_num=100,
            )

            assert isinstance(rewritten_sql, str)
            assert len(insert_ids) == 1
            assert isinstance(insert_ids[0], int)


class TestCrossDialectConsistency:
    """Test that operations produce consistent results across dialects."""

    def setup_method(self) -> None:
        """Reset adapter before each test."""
        reset_adapter()

    def teardown_method(self) -> None:
        """Reset adapter after each test."""
        reset_adapter()

    def test_simple_select_consistent_across_dialects(self) -> None:
        """Test that simple SELECT produces similar results in both dialects."""
        test_dml = "SELECT name, age FROM users WHERE id = 1"
        app_id = "app123"
        uid = "user456"
        limit_num = 100

        # Test with MySQL
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            mysql_sql, mysql_ids, mysql_params = rewrite_dml_with_uid_and_limit(
                dml=test_dml, app_id=app_id, uid=uid, limit_num=limit_num
            )

        # Test with PostgreSQL
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            pg_sql, pg_ids, pg_params = rewrite_dml_with_uid_and_limit(
                dml=test_dml, app_id=app_id, uid=uid, limit_num=limit_num
            )

        # Both should succeed and have similar structure
        assert "LIMIT" in mysql_sql
        assert "LIMIT" in pg_sql
        assert len(mysql_ids) == len(pg_ids) == 0
        # Parameters should have similar structure (uid values)
        assert uid in mysql_params.values()
        assert uid in pg_params.values()

    def test_simple_create_table_consistent_across_dialects(self) -> None:
        """Test that simple CREATE TABLE is allowed in both dialects."""
        # Use standard SQL syntax that works in both
        ddl = "CREATE TABLE users (id INT, name VARCHAR(255))"
        mock_span_context = MagicMock()

        # Test with MySQL
        with patch.dict(os.environ, {"DB_TYPE": "mysql"}):
            reset_adapter()
            mysql_result = is_ddl_allowed(ddl, mock_span_context)

        # Test with PostgreSQL
        with patch.dict(os.environ, {"DB_TYPE": "postgresql"}):
            reset_adapter()
            pg_result = is_ddl_allowed(ddl, mock_span_context)

        # Both should allow the statement
        assert mysql_result is True
        assert pg_result is True
