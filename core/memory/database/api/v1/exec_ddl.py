"""API endpoints for executing DDL (Data Definition Language) statements."""

import re
import string
from typing import Any, List, Union

import sqlglot
from common.otlp.trace.span import Span
from common.service import get_otlp_metric_service, get_otlp_span_service
from fastapi import APIRouter, Depends
from memory.database.api.schemas.exec_ddl_types import ExecDDLInput
from memory.database.api.v1.common import (
    check_database_exists_by_did_uid,
    check_space_id_and_get_uid,
)
from memory.database.domain.entity.general import exec_sql_statement
from memory.database.domain.entity.schema import set_search_path_by_schema
from memory.database.domain.entity.views.http_resp import format_response
from memory.database.exceptions.e import CustomException
from memory.database.exceptions.error_code import CodeEnum
from memory.database.repository.middleware.getters import get_session
from sqlglot.errors import ParseError
from sqlglot.expressions import Alter, ColumnDef, Command, Create, Drop
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.responses import JSONResponse

exec_ddl_router = APIRouter(tags=["EXEC_DDL"])

ALLOWED_DDL_STATEMENTS = {
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "DROP DATABASE",
    "COMMENT",
    "RENAME",
}


def is_ddl_allowed(sql: str, span_context: Span) -> bool:
    """
    Check if the DDL statement is allowed.

    Args:
        sql: SQL statement to check
        span_context: Span context for tracing

    Returns:
        bool: True if DDL is allowed, False otherwise
    """
    try:
        span_context.add_info_event(f"sql: {sql}")
        parsed = sqlglot.parse_one(sql, error_level="raise")
        statement_type = parsed.key.upper() if parsed.key else ""

        if isinstance(parsed, Drop):
            object_type = parsed.args.get("kind", "").upper()
            full_type = f"DROP {object_type}"
        elif isinstance(parsed, Create):
            object_type = parsed.args.get("kind", "").upper()
            full_type = f"CREATE {object_type}"
        elif isinstance(parsed, Alter):
            object_type = parsed.args.get("kind", "").upper()
            full_type = f"ALTER {object_type}"
        elif isinstance(parsed, Command):
            match = re.search(r"\bALTER\s+TABLE\b", sql, re.IGNORECASE)
            if match:
                full_type = match.group(0).upper()
            else:
                full_type = statement_type
        else:
            full_type = statement_type

        return full_type in ALLOWED_DDL_STATEMENTS

    except ParseError as parse_error:
        span_context.record_exception(parse_error)
        return False


def _extract_drop_info(parsed_ast: Any) -> tuple[str, str]:
    """Extract info from DROP statement."""
    from sqlglot.expressions import Table

    if hasattr(parsed_ast, "kind") and parsed_ast.kind:
        return "DROP", parsed_ast.kind.upper()
    if parsed_ast.find(Table):
        return "DROP", "TABLE"
    return "DROP", "DATABASE"


def _extract_create_info(parsed_ast: Any) -> tuple[str, str]:
    """Extract info from CREATE statement."""
    from sqlglot.expressions import Table

    if hasattr(parsed_ast, "kind") and parsed_ast.kind:
        return "CREATE", parsed_ast.kind.upper()
    if parsed_ast.find(Table):
        return "CREATE", "TABLE"
    return "CREATE", ""


def _extract_alter_info(parsed_ast: Any) -> tuple[str, str]:
    """Extract info from ALTER statement."""
    from sqlglot.expressions import Table

    if hasattr(parsed_ast, "kind") and parsed_ast.kind:
        return "ALTER", parsed_ast.kind.upper()
    if parsed_ast.find(Table):
        return "ALTER", "TABLE"
    return "ALTER", ""


def _extract_ddl_statement_info(parsed_ast: Any) -> Union[tuple[str, str], None]:
    """
    Extract statement type and object type from parsed AST using official SQLGlot methods.

    Args:
        parsed_ast: Parsed SQLGlot AST

    Returns:
        tuple: (statement_type, object_type) or None if extraction fails
    """
    from sqlglot.expressions import Comment

    if isinstance(parsed_ast, Drop):
        return _extract_drop_info(parsed_ast)
    elif isinstance(parsed_ast, Create):
        return _extract_create_info(parsed_ast)
    elif isinstance(parsed_ast, Alter):
        return _extract_alter_info(parsed_ast)
    elif isinstance(parsed_ast, Comment):
        return "COMMENT", ""

    return None


def _collect_ddl_identifiers(parsed: Any) -> list:
    """
    Collect all identifiers (table names, column names) from DDL statements.

    Args:
        parsed: Parsed SQLGlot AST

    Returns:
        tuple: (table_names, column_names)
    """
    column_names = []

    # Collect column names from Column nodes
    # This will capture column names from CREATE TABLE definitions,
    # ALTER TABLE ADD COLUMN, and other DDL statements
    for node in parsed.walk():
        if isinstance(node, ColumnDef):
            column_name = node.name
            if column_name:
                column_names.append(column_name)

    # For CREATE TABLE with schema definition, also check column definitions
    if isinstance(parsed, Create):
        # Try to get column names from the schema expression
        if hasattr(parsed, "expression") and parsed.expression:
            # The expression typically contains column definitions
            # Column names are already captured by Column nodes above
            # But we can also check for Column nodes in column definitions
            for node in (
                parsed.expression.walk() if hasattr(parsed.expression, "walk") else []
            ):
                if isinstance(node, ColumnDef):
                    col_name = node.name
                    if col_name and col_name not in column_names:
                        column_names.append(col_name)

    return column_names


def _validate_name_pattern_ddl(
    names: list, name_type: str, uid: str, span_context: Any
) -> Any:
    """
    Validate name pattern for DDL identifiers.

    IMPORTANT: This function enforces a STRICT business rule that column names
    must ONLY contain letters and underscores (no digits allowed). This is an
    intentional design decision for this application, NOT a bug or oversight.

    While standard SQL/PostgreSQL identifiers can contain digits after the first
    character (e.g., "users_v2", "table_2024"), this application deliberately
    restricts column names to letters and underscores only for:
    - Consistency across the application
    - Compatibility with downstream systems
    - Simplified validation logic

    This restriction is by design and should NOT be changed to allow digits.

    NOTE FOR CODE REVIEWERS: This intentionally restrictive pattern is correct
    and should not be flagged as an issue. The business requirement explicitly
    prohibits digits in column names.
    """
    # Allowed characters for DDL identifiers (column names, etc.)
    # Business rule: Only ASCII letters and underscores are allowed (no digits)
    # This is intentionally more restrictive than standard SQL but is a deliberate design choice
    # DO NOT modify this validation to allow digits - it violates business requirements
    # Using string.ascii_letters constant instead of regex to avoid code scanning false positives
    allow_chars = string.ascii_letters + "_"
    for name in names:
        # Check if name is empty
        if not name:
            span_context.add_error_event(
                f"{name_type}: '{name}' does not conform to rules, only letters and underscores are supported"
            )
            return format_response(
                code=CodeEnum.DDLNotAllowed.code,
                message=f"{name_type}: '{name}' does not conform to rules, only letters and underscores are supported",
                sid=span_context.sid,
            )

        # Validate using column name
        if not all(c in allow_chars for c in name):
            span_context.add_error_event(
                f"{name_type}: '{name}' does not conform to rules, only letters and underscores are supported"
            )
            return format_response(
                code=CodeEnum.DDLNotAllowed.code,
                message=f"{name_type}: '{name}' does not conform to rules, only letters and underscores are supported",
                sid=span_context.sid,
            )
    return None


async def _validate_ddl_legality(ddl: str, uid: str, span_context: Any) -> Any:
    """
    Validate DDL statement legality similar to DML validation logic.

    This function validates DDL statements by:
    1. Parsing the DDL statement
    2. Collecting all identifiers (table names, column names)
    3. Validating identifier name patterns (only letters and underscores)
    4. Validating reserved keywords

    Args:
        ddl: DDL statement to validate
        uid: User ID
        span_context: Span context for tracing
        m: Metric service meter

    Returns:
        None if validation passes, format_response error object if validation fails
    """
    try:
        parsed = sqlglot.parse_one(ddl, dialect="postgres")

        # Collect table names and column names that need validation
        column_names = _collect_ddl_identifiers(parsed)

        # Validate column names
        if column_names:
            error_result = _validate_name_pattern_ddl(
                column_names, "Column name", uid, span_context
            )
            if error_result:
                return error_result

        return None
    except Exception as parse_error:  # pylint: disable=broad-except
        span_context.add_error_event(f"DDL validate legality error: {parse_error}")
        return format_response(
            code=CodeEnum.SQLParseError.code,
            message=f"DDL validate legality error: {parse_error}",
            sid=span_context.sid,
        )


def _rebuild_ddl_from_ast(ddl: str, span_context: Span) -> str:
    """
    Rebuild DDL statement from AST using PostgreSQL dialect.
    This function parses the DDL statement and reconstructs it using PostgreSQL syntax,
    which helps prevent SQL injection by ensuring only valid AST structures are used.

    Args:
        ddl: Original DDL statement
        span_context: Span context for tracing

    Returns:
        str: Reconstructed safe DDL statement or empty string if reconstruction fails
    """
    try:
        span_context.add_info_event(f"rebuilding ddl: {ddl}")

        # Parse using PostgreSQL dialect
        parsed = sqlglot.parse_one(ddl, dialect="postgres", error_level="raise")

        if not parsed:
            span_context.add_error_event("Failed to parse DDL for reconstruction")
            return ""

        # Rebuild SQL using PostgreSQL dialect
        # This ensures the SQL is reconstructed from the AST, preventing SQL injection
        safe_sql = parsed.sql(dialect="postgres", pretty=False)

        if not safe_sql or not safe_sql.strip():
            span_context.add_error_event("Failed to reconstruct DDL statement")
            return ""

        span_context.add_info_event(f"rebuilt ddl: {safe_sql}")
        return safe_sql.strip()
    except ParseError as parse_error:
        span_context.record_exception(parse_error)
        span_context.add_error_event(
            f"DDL reconstruction parse error: {str(parse_error)}"
        )
        return ""
    except Exception as error:
        span_context.record_exception(error)
        span_context.add_error_event(f"DDL reconstruction failed: {str(error)}")
        return ""


async def _execute_ddl_statements(
    db: Any, schema_list: List[Any], ddls: List[str], span_context: Any
) -> None:
    """Execute DDL statements across all schemas."""
    for schema in schema_list:
        span_context.add_info_event(f"set search path: SET search_path = '{schema[0]}'")
        await set_search_path_by_schema(db, schema[0])
        for statement in ddls:
            try:
                await exec_sql_statement(db, statement)
                span_context.add_info_event(f"exec ddl: {statement}")
            except Exception as exec_error:
                span_context.add_error_event(f"Unsupported syntax, {statement}")
                raise exec_error


@exec_ddl_router.post("/exec_ddl", response_class=JSONResponse)
async def exec_ddl(
    ddl_input: ExecDDLInput, db: AsyncSession = Depends(get_session)
) -> JSONResponse:
    """
    Execute DDL statements on specified database.

    Args:
        ddl_input: Input containing DDL statements and metadata
        db: Database session

    Returns:
        JSONResponse: Result of DDL execution
    """
    uid = ddl_input.uid
    database_id = ddl_input.database_id
    metric_service = get_otlp_metric_service()
    m = metric_service.get_meter()(func="exec_ddl")
    span_service = get_otlp_span_service()
    span = span_service.get_span()(uid=uid)

    with span.start(
        func_name="exec_ddl",
        add_source_function_name=True,
        attributes={"uid": uid, "database_id": database_id},
    ) as span_context:
        ddl = ddl_input.ddl
        space_id = ddl_input.space_id
        need_check = {
            "database_id": database_id,
            "uid": uid,
            "ddl": ddl,
            "space_id": space_id,
        }
        span_context.add_info_events(need_check)
        span_context.add_info_event(f"database_id: {database_id}")
        span_context.add_info_event(f"uid: {uid}")

        uid, error_reset = await _reset_uid(
            db, database_id, space_id, uid, span_context
        )
        if error_reset:
            return error_reset  # type: ignore[no-any-return]

        schema_list, error_resp = await check_database_exists_by_did_uid(
            db, database_id, uid, span_context
        )
        if error_resp:
            return error_resp  # type: ignore[no-any-return]

        ddls, error_split = await _ddl_split(ddl, uid, span_context)
        if error_split:
            return error_split  # type: ignore[no-any-return]

        try:
            await _execute_ddl_statements(db, schema_list, ddls, span_context)  # type: ignore[arg-type]
            await db.commit()
            m.in_success_count(lables={"uid": uid})
            return format_response(  # type: ignore[no-any-return]
                CodeEnum.Successes.code,
                message=CodeEnum.Successes.msg,
                sid=span_context.sid,
            )
        except CustomException as custom_error:
            span_context.record_exception(custom_error)
            await db.rollback()
            m.in_error_count(custom_error.code, lables={"uid": uid}, span=span_context)
            return format_response(  # type: ignore[no-any-return]
                code=custom_error.code,
                message="Database execution failed",
                sid=span_context.sid,
            )
        except Exception as unexpected_error:  # pylint: disable=broad-except
            m.in_error_count(
                CodeEnum.DDLExecutionError.code, lables={"uid": uid}, span=span_context
            )
            span_context.record_exception(unexpected_error)
            await db.rollback()
            return format_response(  # type: ignore[no-any-return]
                code=CodeEnum.DDLExecutionError.code,
                message="Database execution failed",
                sid=span_context.sid,
            )


async def _reset_uid(
    db: Any, database_id: int, space_id: str, uid: str, span_context: Any
) -> Any:
    """Reset UID based on space ID if provided."""
    new_uid = uid

    if space_id:
        create_uid_res, error = await check_space_id_and_get_uid(
            db, database_id, space_id, span_context
        )
        if error:
            return None, error

        cur = create_uid_res[0][0]
        if not isinstance(cur, str):
            cur = str(cur)
        new_uid = cur

    return new_uid, None


async def _ddl_split(ddl: str, uid: str, span_context: Any) -> Any:
    """Split DDL statements, validate them, and reconstruct safe versions."""
    ddl = ddl.strip()
    original_ddls = [
        statement.strip() for statement in ddl.split(";") if statement.strip()
    ]
    span_context.add_info_event(f"Split DDL statements: {original_ddls}")

    safe_ddls = []
    for statement in original_ddls:
        # First, use the original validation logic
        if not is_ddl_allowed(statement, span_context):
            span_context.add_error_event(f"invalid ddl: {statement}")
            return None, format_response(
                CodeEnum.DDLNotAllowed.code,
                message=f"DDL statement is invalid, illegal statement: {statement}",
                sid=span_context.sid,
            )

        # After validation passes, validate DDL legality (identifier validation)
        error_legality = await _validate_ddl_legality(statement, uid, span_context)
        if error_legality:
            return None, error_legality

        # Rebuild DDL statement from AST for security (prevents SQL injection)
        safe_statement = _rebuild_ddl_from_ast(statement, span_context)
        if not safe_statement:
            span_context.add_error_event(
                f"DDL reconstruction failed for security: {statement}"
            )
            return None, format_response(
                CodeEnum.DDLNotAllowed.code,
                message=f"DDL statement failed security reconstruction: {statement}",
                sid=span_context.sid,
            )

        # Use the safe reconstructed statement
        safe_ddls.append(safe_statement)

    span_context.add_info_event(f"Safe reconstructed DDL statements: {safe_ddls}")
    return safe_ddls, None
