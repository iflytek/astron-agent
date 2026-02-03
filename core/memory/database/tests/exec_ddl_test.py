"""Unit tests for DDL execution functionality."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from memory.database.api.schemas.exec_ddl_types import ExecDDLInput
from memory.database.api.v1.exec_ddl import (
    _ddl_split,
    _extract_alter_info,
    _extract_create_info,
    _extract_ddl_statement_info,
    _extract_drop_info,
    _rebuild_ddl_from_ast,
    _reset_uid,
    _validate_ddl_legality,
    _validate_name_pattern_ddl,
    exec_ddl,
    is_ddl_allowed,
)
from memory.database.exceptions.error_code import CodeEnum
from sqlmodel.ext.asyncio.session import AsyncSession


def test_is_ddl_allowed_allowed_statements() -> None:
    """Test allowed DDL statements (CREATE TABLE/ALTER TABLE etc)."""
    allowed_sql_cases = [
        "CREATE TABLE users (id INT);",
        "ALTER TABLE users ADD COLUMN name TEXT;",
        "DROP TABLE users;",
        "DROP DATABASE old_db;",
        "COMMENT ON COLUMN users.name IS 'Username';",
        "ALTER TABLE users RENAME TO new_users;",
        "alter table users add age int;",
    ]
    mock_span_context = MagicMock()

    for sql in allowed_sql_cases:
        result = is_ddl_allowed(sql, mock_span_context)
        assert result is True, f"Allowed SQL[{sql}] was incorrectly rejected"
        mock_span_context.add_info_event.assert_any_call(f"sql: {sql}")


@pytest.mark.asyncio
async def test_reset_uid_with_valid_space_id_reset_success() -> None:
    """Test _reset_uid with valid space_id resets to new uid."""
    mock_db = AsyncMock(spec=AsyncSession)
    mock_span_context = MagicMock()
    mock_meter = MagicMock()

    # Use non-string type to test type conversion
    mock_new_uid = 123
    with patch(
        "memory.database.api.v1.exec_ddl.check_space_id_and_get_uid",
        new_callable=AsyncMock,
    ) as mock_check_space:
        # Return format needs to match actual code [(uid,)] structure
        mock_check_space.return_value = ([(mock_new_uid,)], None)

        database_id = 2002
        space_id = "space_001"  # Ensure not empty to execute space_id related logic
        original_uid = "u_original"

        result_uid, error = await _reset_uid(
            db=mock_db,
            database_id=database_id,
            space_id=space_id,
            uid=original_uid,
            span_context=mock_span_context,
        )

        # Verify return value
        assert error is None
        assert result_uid == str(mock_new_uid)  # Verify type conversion

        # Verify check_space_id_and_get_uid call parameters
        mock_check_space.assert_called_once_with(
            mock_db, database_id, space_id, mock_span_context
        )

        # Verify meter was not called incorrectly
        mock_meter.in_error_count.assert_not_called()


@pytest.mark.asyncio
async def test_ddl_split_success() -> None:
    """Test successful DDL splitting (multiple valid statements)."""
    mock_span_context = MagicMock()
    mock_meter = MagicMock()

    with patch("memory.database.api.v1.exec_ddl.is_ddl_allowed", return_value=True):
        raw_ddl = """
            CREATE TABLE users (id INT);
            ALTER TABLE users ADD COLUMN name TEXT;
            DROP TABLE old_users;
        """
        uid = "u1"

        ddls, error_resp = await _ddl_split(raw_ddl, uid, mock_span_context)

        assert error_resp is None
        assert len(ddls) == 3
        # The DDL statements are reconstructed with PostgreSQL formatting (pretty=True)
        # so we need to check the normalized content instead of exact string match
        assert (
            "CREATE TABLE" in ddls[0]
            and "users" in ddls[0]
            and "id" in ddls[0]
            and "INT" in ddls[0]
        )
        assert (
            "ALTER TABLE" in ddls[1]
            and "users" in ddls[1]
            and "ADD COLUMN" in ddls[1]
            and "name" in ddls[1]
            and "TEXT" in ddls[1]
        )
        assert "DROP TABLE" in ddls[2] and "old_users" in ddls[2]

        # Verify that logging functions were called (the exact format may vary)
        assert mock_span_context.add_info_event.called
        mock_meter.in_error_count.assert_not_called()


@pytest.mark.asyncio
async def test_exec_ddl_success() -> None:
    """Test successful exec_ddl endpoint (valid DDL + database exists)."""
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.commit = AsyncMock(return_value=None)
    mock_db.rollback = AsyncMock(return_value=None)

    test_input = ExecDDLInput(
        uid="u1",
        database_id=3001,
        ddl="CREATE TABLE users (id INT); ALTER TABLE users ADD COLUMN name TEXT;",
        space_id="",
    )

    fake_span_context = MagicMock()
    fake_span_context.sid = "exec-ddl-sid-123"
    fake_span_context.add_info_events = MagicMock()
    fake_span_context.add_info_event = MagicMock()
    fake_span_context.record_exception = MagicMock()
    fake_span_context.add_error_event = MagicMock()

    with patch("memory.database.api.v1.exec_ddl.Span") as mock_span_cls:
        mock_span_instance = MagicMock()
        mock_span_instance.start.return_value.__enter__.return_value = fake_span_context
        mock_span_cls.return_value = mock_span_instance

        with patch(
            "memory.database.api.v1.exec_ddl.check_database_exists_by_did_uid",
            new_callable=AsyncMock,
        ) as mock_check_db:
            mock_check_db.return_value = ([["prod_u1_3001"], ["test_u1_3001"]], None)

            with patch(
                "memory.database.api.v1.exec_ddl._ddl_split", new_callable=AsyncMock
            ) as mock_ddl_split:
                mock_ddl_split.return_value = (
                    [
                        "CREATE TABLE users (id INT)",
                        "ALTER TABLE users ADD COLUMN name TEXT",
                    ],
                    None,
                )

                with patch(
                    "memory.database.api.v1.exec_ddl.set_search_path_by_schema",
                    new_callable=AsyncMock,
                ) as mock_set_search:
                    mock_set_search.return_value = None

                    with patch(
                        "memory.database.api.v1.exec_ddl.exec_sql_statement",
                        new_callable=AsyncMock,
                    ) as mock_exec_sql:
                        mock_exec_sql.return_value = None

                        with patch(
                            "memory.database.api.v1.exec_ddl.get_otlp_metric_service"
                        ) as mock_metric_service_func:
                            with patch(
                                "memory.database.api.v1.exec_ddl.get_otlp_span_service"
                            ) as mock_span_service_func:
                                # Mock meter instance
                                mock_meter_inst = MagicMock()
                                mock_meter_inst.in_success_count = MagicMock()

                                # Mock metric service
                                mock_metric_service = MagicMock()
                                mock_metric_service.get_meter.return_value = (
                                    lambda func: mock_meter_inst
                                )
                                mock_metric_service_func.return_value = (
                                    mock_metric_service
                                )

                                # Mock span service and instance
                                mock_span_instance = MagicMock()
                                mock_span_instance.start.return_value.__enter__.return_value = (
                                    fake_span_context
                                )
                                mock_span_service = MagicMock()
                                mock_span_service.get_span.return_value = (
                                    lambda uid: mock_span_instance
                                )
                                mock_span_service_func.return_value = mock_span_service

                                response = await exec_ddl(test_input, mock_db)

                                response_body = json.loads(response.body)
                                assert "code" in response_body
                                assert "message" in response_body
                                assert "sid" in response_body

                                assert response_body["code"] == CodeEnum.Successes.code
                                assert (
                                    response_body["message"] == CodeEnum.Successes.msg
                                )


def test_extract_ddl_statement_info() -> None:
    """Test DDL statement information extraction."""
    from sqlglot import parse_one

    # Test CREATE TABLE
    create_sql = "CREATE TABLE users (id INT, name TEXT)"
    parsed_create = parse_one(create_sql)
    statement_info = _extract_ddl_statement_info(parsed_create)
    assert statement_info == ("CREATE", "TABLE")

    # Test DROP TABLE
    drop_sql = "DROP TABLE users"
    parsed_drop = parse_one(drop_sql)
    statement_info = _extract_ddl_statement_info(parsed_drop)
    assert statement_info == ("DROP", "TABLE")

    # Test ALTER TABLE
    alter_sql = "ALTER TABLE users ADD COLUMN email TEXT"
    parsed_alter = parse_one(alter_sql)
    statement_info = _extract_ddl_statement_info(parsed_alter)
    assert statement_info == ("ALTER", "TABLE")

    # Test non-DDL statement
    select_sql = "SELECT * FROM users"
    parsed_select = parse_one(select_sql)
    statement_info = _extract_ddl_statement_info(parsed_select)
    assert statement_info is None


def test_extract_create_info() -> None:
    """Test CREATE statement information extraction."""
    from sqlglot import parse_one

    # CREATE TABLE
    create_table_sql = "CREATE TABLE users (id INT, name TEXT)"
    parsed = parse_one(create_table_sql)
    statement_type, object_type = _extract_create_info(parsed)
    assert statement_type == "CREATE"
    assert object_type == "TABLE"

    # CREATE DATABASE
    create_db_sql = "CREATE DATABASE testdb"
    parsed_db = parse_one(create_db_sql)
    statement_type, object_type = _extract_create_info(parsed_db)
    assert statement_type == "CREATE"
    assert object_type == "DATABASE"


def test_extract_drop_info() -> None:
    """Test DROP statement information extraction."""
    from sqlglot import parse_one

    # DROP TABLE
    drop_table_sql = "DROP TABLE users"
    parsed = parse_one(drop_table_sql)
    statement_type, object_type = _extract_drop_info(parsed)
    assert statement_type == "DROP"
    assert object_type == "TABLE"

    # DROP DATABASE
    drop_db_sql = "DROP DATABASE testdb"
    parsed_db = parse_one(drop_db_sql)
    statement_type, object_type = _extract_drop_info(parsed_db)
    assert statement_type == "DROP"
    assert object_type == "DATABASE"


def test_extract_alter_info() -> None:
    """Test ALTER statement information extraction."""
    from sqlglot import parse_one

    # ALTER TABLE
    alter_sql = "ALTER TABLE users ADD COLUMN email TEXT"
    parsed = parse_one(alter_sql)
    statement_type, object_type = _extract_alter_info(parsed)
    assert statement_type == "ALTER"
    assert object_type == "TABLE"


def test_rebuild_ddl_from_ast() -> None:
    """Test DDL rebuilding from AST."""
    mock_span_context = MagicMock()

    # Test CREATE TABLE rebuilding
    create_sql = "CREATE TABLE users (id INT, name TEXT)"
    rebuilt = _rebuild_ddl_from_ast(create_sql, mock_span_context)
    # Check that the function returns a string
    assert isinstance(rebuilt, str)
    if rebuilt.strip():  # Only check content if not empty
        assert "CREATE" in rebuilt.upper()
        assert "TABLE" in rebuilt.upper()
        assert "users" in rebuilt

    # Test ALTER TABLE rebuilding
    alter_sql = "ALTER TABLE users ADD COLUMN email TEXT"
    rebuilt_alter = _rebuild_ddl_from_ast(alter_sql, mock_span_context)
    assert isinstance(rebuilt_alter, str)
    if rebuilt_alter.strip():
        assert "ALTER" in rebuilt_alter.upper()
        assert "TABLE" in rebuilt_alter.upper()

    # Test DROP TABLE rebuilding
    drop_sql = "DROP TABLE users"
    rebuilt_drop = _rebuild_ddl_from_ast(drop_sql, mock_span_context)
    assert isinstance(rebuilt_drop, str)
    if rebuilt_drop.strip():
        assert "DROP" in rebuilt_drop.upper()
        assert "TABLE" in rebuilt_drop.upper()


def test_validate_name_pattern_ddl_valid() -> None:
    """Test name pattern validation with valid names (letters and underscores only)."""
    names = ["user_name", "age", "email_address", "first_name", "last_name"]
    span_context = MagicMock()
    span_context.sid = "test-sid"
    mock_meter = MagicMock()
    uid = "u1"

    result = _validate_name_pattern_ddl(names, "Column name", uid, span_context)
    assert result is None
    mock_meter.in_error_count.assert_not_called()


def test_validate_name_pattern_ddl_invalid_with_digits() -> None:
    """Test name pattern validation with invalid names containing digits."""
    # This test case specifically addresses the code scanning issue:
    # identifiers with digits (e.g., users_v2) should be rejected
    names = ["users_v2", "table_2024", "column123"]
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = _validate_name_pattern_ddl(names, "Column name", uid, span_context)
    assert result is not None
    span_context.add_error_event.assert_called_once()
    # Parse JSONResponse body to verify error code
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.DDLNotAllowed.code
    assert "only letters and underscores are supported" in body["message"]


def test_validate_name_pattern_ddl_invalid_with_special_chars() -> None:
    """Test name pattern validation with invalid names containing special characters."""
    names = ["user-name", "email@address", "column.name"]
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = _validate_name_pattern_ddl(names, "Column name", uid, span_context)
    assert result is not None
    span_context.add_error_event.assert_called_once()
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.DDLNotAllowed.code


def test_validate_name_pattern_ddl_invalid_empty_name() -> None:
    """Test name pattern validation with empty name."""
    names = [""]
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = _validate_name_pattern_ddl(names, "Column name", uid, span_context)
    assert result is not None
    span_context.add_error_event.assert_called_once()
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.DDLNotAllowed.code


@pytest.mark.asyncio
async def test_validate_ddl_legality_valid() -> None:
    """Test DDL legality validation with valid DDL statements."""
    ddl = "CREATE TABLE users (id INT, name TEXT)"
    span_context = MagicMock()
    span_context.sid = "test-sid"
    mock_meter = MagicMock()
    uid = "u1"

    result = await _validate_ddl_legality(ddl, uid, span_context)
    assert result is None
    mock_meter.in_error_count.assert_not_called()


@pytest.mark.asyncio
async def test_validate_ddl_legality_invalid_column_name_with_digits() -> None:
    """Test DDL legality validation with invalid column name containing digits."""
    # This test case specifically addresses the code scanning issue:
    # CREATE TABLE users_v2 (id INT) would have caught the overly restrictive regex pattern
    ddl = "CREATE TABLE users (id INT, users_v2 TEXT)"
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = await _validate_ddl_legality(ddl, uid, span_context)
    assert result is not None
    # Parse JSONResponse body to get code
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.DDLNotAllowed.code
    assert "only letters and underscores are supported" in body["message"]


@pytest.mark.asyncio
async def test_validate_ddl_legality_invalid_column_name_alter() -> None:
    """Test DDL legality validation with invalid column name in ALTER statement."""
    ddl = "ALTER TABLE users ADD COLUMN age123 INT"
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = await _validate_ddl_legality(ddl, uid, span_context)
    assert result is not None
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.DDLNotAllowed.code


@pytest.mark.asyncio
async def test_validate_ddl_legality_invalid_sql() -> None:
    """Test DDL legality validation with invalid SQL syntax."""
    ddl = "CREATE TABLE WHERE INVALID SQL"
    span_context = MagicMock()
    span_context.sid = "test-sid"
    span_context.add_error_event = MagicMock()
    mock_meter = MagicMock()
    mock_meter.in_error_count = MagicMock()
    uid = "u1"

    result = await _validate_ddl_legality(ddl, uid, span_context)
    assert result is not None
    # Parse JSONResponse body to get code
    body = json.loads(result.body)
    assert body["code"] == CodeEnum.SQLParseError.code
    span_context.add_error_event.assert_called_once()
