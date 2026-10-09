"""Tests for cross-space SQL injection vulnerability fix.

This module tests the security fixes that prevent users from accessing
data in other spaces via schema-qualified table names or system schemas.
"""

import json
from typing import Any, List
from unittest.mock import AsyncMock, MagicMock

import pytest
from memory.database.api.v1.exec_dml import _dml_split, _validate_dml_legality
from memory.database.exceptions.error_code import CodeEnum
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.responses import JSONResponse


def extract_response_data(response: Any) -> Any:
    """Extract data from JSONResponse object."""
    if isinstance(response, JSONResponse):
        return json.loads(bytes(response.body).decode())
    return response


class MockSpanContext:
    """Mock span context for testing."""

    def __init__(self) -> None:
        self.sid = "test-session-id"
        self.events: List[Any] = []
        self.errors: List[Any] = []

    def add_info_event(self, event: Any) -> None:
        self.events.append(event)

    def add_error_event(self, error: Any) -> None:
        self.errors.append(error)

    def record_exception(self, exc: Any) -> None:
        self.errors.append(str(exc))


@pytest.mark.asyncio
async def test_reject_schema_qualified_select() -> None:
    """Test that SELECT with schema qualifier is rejected."""
    dml = 'SELECT * FROM "other_schema".customer_data'
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code
    assert "not allowed" in error_data["message"].lower()


@pytest.mark.asyncio
async def test_reject_schema_qualified_update() -> None:
    """Test that UPDATE with schema qualifier is rejected."""
    dml = "UPDATE \"test_victim_schema\".customer_data SET name = 'hacked'"
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_reject_schema_qualified_delete() -> None:
    """Test that DELETE with schema qualifier is rejected."""
    dml = 'DELETE FROM "other_schema".customer_data WHERE id = 1'
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_reject_information_schema_access() -> None:
    """Test that access to information_schema is blocked."""
    dml = "SELECT schema_name FROM information_schema.schemata"
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code
    assert "not allowed" in error_data["message"].lower()


@pytest.mark.asyncio
async def test_reject_pg_catalog_access() -> None:
    """Test that access to pg_catalog is blocked."""
    dml = "SELECT * FROM pg_catalog.pg_tables"
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_reject_qualified_information_schema() -> None:
    """Test that schema-qualified information_schema access is blocked."""
    dml = 'SELECT * FROM "information_schema".tables'
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_allow_normal_select() -> None:
    """Test that normal SELECT without schema qualifier is allowed."""
    dml = "SELECT * FROM customer_data WHERE id = 1"
    span_context = MockSpanContext()

    # Mock database session to return valid tables
    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [("customer_data",)]
    db.execute = AsyncMock(return_value=mock_result)

    schema = "test_current_schema"
    uid = "test_uid"

    _, error = await _dml_split(dml, db, schema, uid, span_context)

    # Should pass validation (may fail on table existence check in real env)
    # The key is that it doesn't fail on schema qualifier check
    if error:
        error_data = extract_response_data(error)
        assert error_data["code"] != CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_allow_normal_update() -> None:
    """Test that normal UPDATE without schema qualifier is allowed."""
    dml = "UPDATE customer_data SET name = 'test' WHERE id = 1"
    span_context = MockSpanContext()

    # Mock database session
    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [("customer_data",)]
    db.execute = AsyncMock(return_value=mock_result)

    schema = "test_current_schema"
    uid = "test_uid"

    _, error = await _dml_split(dml, db, schema, uid, span_context)

    # Should pass schema qualifier validation
    if error:
        error_data = extract_response_data(error)
        assert error_data["code"] != CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
async def test_case_insensitive_forbidden_schema() -> None:
    """Test that forbidden schema check is case-insensitive."""
    test_cases = [
        "SELECT * FROM INFORMATION_SCHEMA.tables",
        "SELECT * FROM Information_Schema.tables",
        "SELECT * FROM PG_CATALOG.pg_tables",
        "SELECT * FROM Pg_Catalog.pg_tables",
    ]

    for dml in test_cases:
        span_context = MockSpanContext()
        db = AsyncMock(spec=AsyncSession)
        schema = "test_current_schema"
        uid = "test_uid"

        result, error = await _dml_split(dml, db, schema, uid, span_context)

        assert result is None, f"Should reject: {dml}"
        assert error is not None, f"Should have error for: {dml}"
        error_data = extract_response_data(error)
        assert (
            error_data["code"] == CodeEnum.DMLNotAllowed.code
        ), f"Wrong error code for: {dml}"


@pytest.mark.asyncio
async def test_reject_complex_query_with_schema_qualifier() -> None:
    """Test that complex queries with schema qualifiers are rejected."""
    dml = """
        SELECT a.id, b.name
        FROM customer_data a
        JOIN "other_schema".orders b ON a.id = b.customer_id
    """
    span_context = MockSpanContext()
    db = AsyncMock(spec=AsyncSession)
    schema = "test_current_schema"
    uid = "test_uid"

    result, error = await _dml_split(dml, db, schema, uid, span_context)

    assert result is None
    assert error is not None
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "dml",
    [
        # SQL hidden in a string literal is invisible to the AST table check
        "SELECT query_to_xml('select * from \"victim\".t', true, false, '') "
        "FROM customer_data",
        "SELECT pg_catalog.query_to_xml('select 1', true, false, '') "
        "FROM customer_data",
        "SELECT table_to_xml('victim.t', true, false, '') FROM customer_data",
        "SELECT schema_to_xml('victim', true, false, '') FROM customer_data",
        "SELECT database_to_xml(true, false, '') FROM customer_data",
        "SELECT pg_read_file('/etc/passwd') FROM customer_data",
    ],
)
async def test_reject_string_sql_execution_functions(dml: str) -> None:
    """Functions that run SQL from strings or dump schemas must be rejected."""
    span_context = MockSpanContext()
    error = await _validate_dml_legality(dml, "test_uid", span_context)

    assert error is not None, f"Should reject: {dml}"
    error_data = extract_response_data(error)
    assert error_data["code"] == CodeEnum.DMLNotAllowed.code
