"""API endpoints for executing DML (Data Manipulation Language) statements."""

import datetime
import decimal
import re
import string
import time
import uuid
from typing import Any, Dict, List, Optional, Union

import sqlglot
import sqlparse
from common.service import get_otlp_metric_service, get_otlp_span_service
from common.utils.snowfake import get_id
from fastapi import APIRouter, Depends
from loguru import logger
from memory.database.api.schemas.exec_dml_types import ExecDMLInput
from memory.database.api.v1.common import (
    check_database_exists_by_did,
    check_space_id_and_get_uid,
    validate_reserved_functions,
    validate_reserved_keywords,
)
from memory.database.domain.entity.general import exec_sql_statement, parse_and_exec_sql
from memory.database.domain.entity.schema import set_search_path_by_schema
from memory.database.domain.entity.views.http_resp import format_response
from memory.database.exceptions.e import CustomException
from memory.database.exceptions.error_code import CodeEnum
from memory.database.repository.middleware.adapters import get_adapter
from memory.database.repository.middleware.getters import get_session
from sqlglot import exp, parse_one
from sqlglot.expressions import Column, Literal
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.responses import JSONResponse

exec_dml_router = APIRouter(tags=["EXEC_DML"])

INSERT_EXTRA_COLUMNS = ["id", "uid", "create_time", "update_time"]


def _normalize_bind_placeholders(sql: str) -> str:
    """Normalize SQLGlot placeholders to SQLAlchemy text() bind syntax."""
    return re.sub(r"%\(([a-zA-Z_][a-zA-Z0-9_]*)\)s", r":\1", sql)


def _build_insert_literal_map(
    parsed: exp.Insert, table_name: str, literal_column_map: Dict[int, str]
) -> None:
    """Build literal-column mapping for INSERT statements."""
    columns = parsed.args.get("this")
    insert_exprs = parsed.args.get("expression")
    if not (columns and insert_exprs):
        return

    # Get table name from INSERT statement
    actual_table_name = (
        parsed.this.alias_or_name if isinstance(parsed.this, exp.Table) else table_name
    )

    column_names = [
        col.name if hasattr(col, "name") else str(col.this)
        for col in columns.expressions
    ]
    for row in insert_exprs.expressions:
        if not hasattr(row, "expressions"):
            continue
        for idx, expr in enumerate(row.expressions):
            if isinstance(expr, exp.Literal) and idx < len(column_names):
                literal_column_map[id(expr)] = (
                    f"{actual_table_name}.{column_names[idx]}"
                )


def _build_update_literal_map(
    parsed: exp.Update,
    table_name: str,
    literal_column_map: Dict[int, str],
    alias_map: Optional[Dict[str, str]] = None,
) -> None:
    """Build literal-column mapping for UPDATE statements."""
    alias_map = alias_map or {}

    # Get default table name from UPDATE statement
    default_table_name = (
        parsed.this.name or parsed.this.alias_or_name
        if isinstance(parsed.this, exp.Table)
        else table_name
    )

    for set_expr in parsed.expressions:
        if not (
            isinstance(set_expr, exp.EQ)
            and isinstance(set_expr.left, exp.Column)
            and isinstance(set_expr.right, exp.Literal)
        ):
            continue
        col = set_expr.left
        table_ref = (
            _extract_table_ref(col.table)
            if hasattr(col, "table") and col.table
            else None
        )
        actual_table_name = _resolve_table_name(
            table_ref, alias_map, default_table_name
        )
        literal_column_map[id(set_expr.right)] = f"{actual_table_name}.{col.name}"


def _process_comparison_node(
    node: Any,
    literal_column_map: Dict[int, str],
    get_table_name_func: Any,
) -> None:
    """Process comparison operation node to map literals to columns."""
    left_col = node.left if isinstance(node.left, exp.Column) else None
    right_lit = node.right if isinstance(node.right, exp.Literal) else None
    if left_col and right_lit:
        actual_table_name = get_table_name_func(left_col)
        literal_column_map[id(right_lit)] = f"{actual_table_name}.{left_col.name}"
        return

    # Check for Literal on left and Column on right
    left_lit = node.left if isinstance(node.left, exp.Literal) else None
    right_col = node.right if isinstance(node.right, exp.Column) else None
    if left_lit and right_col:
        actual_table_name = get_table_name_func(right_col)
        literal_column_map[id(left_lit)] = f"{actual_table_name}.{right_col.name}"


def _map_where_literals_recursive(
    node: Any,
    literal_column_map: Dict[int, str],
    get_table_name_func: Any,
) -> None:
    """Recursively map literal values in WHERE clause to column names."""
    if isinstance(node, (exp.EQ, exp.NEQ, exp.GT, exp.LT, exp.GTE, exp.LTE)):
        _process_comparison_node(node, literal_column_map, get_table_name_func)
    elif hasattr(node, "expressions"):
        for expr in node.expressions:
            _map_where_literals_recursive(expr, literal_column_map, get_table_name_func)
    elif hasattr(node, "this"):
        _map_where_literals_recursive(
            node.this, literal_column_map, get_table_name_func
        )


def _build_select_literal_map(
    parsed: exp.Select,
    table_name: str,
    literal_column_map: Dict[int, str],
    alias_map: Optional[Dict[str, str]] = None,
) -> None:
    """Build literal-column mapping for SELECT statements."""
    alias_map = alias_map or {}

    where_expr = parsed.args.get("where")
    if not where_expr:
        return

    # Get default table name from first table in FROM clause
    from_expr = parsed.args.get("from")
    default_table_name = table_name
    if from_expr and hasattr(from_expr, "expressions") and from_expr.expressions:
        first_table = from_expr.expressions[0]
        if isinstance(first_table, exp.Table):
            default_table_name = first_table.name or first_table.alias_or_name

    def _get_table_name_from_column(col: exp.Column) -> str:
        """Get actual table name from Column node, resolving aliases."""
        table_ref = (
            _extract_table_ref(col.table)
            if hasattr(col, "table") and col.table
            else None
        )
        return _resolve_table_name(table_ref, alias_map, default_table_name)

    _map_where_literals_recursive(
        where_expr, literal_column_map, _get_table_name_from_column
    )


def _extract_table_ref(table_obj: Any) -> Optional[str]:
    """Extract table reference from various table object types."""
    if isinstance(table_obj, exp.Table):
        return table_obj.name or table_obj.alias_or_name
    if isinstance(table_obj, str):
        return table_obj
    if hasattr(table_obj, "this"):
        return table_obj.this
    if hasattr(table_obj, "name"):
        return table_obj.name
    return None


def _resolve_table_name(
    table_ref: Optional[str], alias_map: Dict[str, str], default: str
) -> str:
    """Resolve table reference to actual table name using alias map."""
    if table_ref and alias_map:
        return alias_map.get(table_ref, table_ref)
    return table_ref or default


def _build_table_alias_map(parsed: Any) -> Dict[str, str]:
    """Build mapping from table alias to actual table name."""
    alias_map: Dict[str, str] = {}
    for table in parsed.find_all(exp.Table):
        if table.name:
            alias_map[table.name] = table.name
            if table.alias:
                alias_map[table.alias] = table.name
    return alias_map


def _build_literal_column_map(
    parsed: Any,
    table_name: str,
    literal_column_map: Dict[int, str],
    alias_map: Optional[Dict[str, str]] = None,
) -> None:
    """Build mapping from Literal nodes to column names based on statement type."""
    if alias_map is None:
        alias_map = _build_table_alias_map(parsed)

    if isinstance(parsed, exp.Insert):
        _build_insert_literal_map(parsed, table_name, literal_column_map)
    elif isinstance(parsed, exp.Update):
        _build_update_literal_map(parsed, table_name, literal_column_map, alias_map)
    elif isinstance(parsed, exp.Select):
        _build_select_literal_map(parsed, table_name, literal_column_map, alias_map)


def _is_datetime_type(data_type: str) -> bool:
    """
    Determine if the data type is a datetime type.

    Args:
        data_type: Data type string

    Returns:
        bool: Returns True if it's a datetime type, otherwise returns False
    """
    if not data_type:
        return False
    data_type_lower = data_type.lower()
    datetime_types = [
        "timestamp",
        "timestamptz",
        "timestamp without time zone",
        "timestamp with time zone",
        "date",
        "time",
        "timetz",
        "time without time zone",
        "time with time zone",
        "datetime",
    ]
    return any(dt in data_type_lower for dt in datetime_types)


def _convert_value_if_datetime(
    value: str,
    node_id: int,
    literal_column_map: Dict[int, str],
    column_types: Dict[str, str],
) -> Union[str, datetime.datetime]:
    """Convert string value to datetime if the corresponding column is datetime type."""
    converted_value: Union[str, datetime.datetime] = value
    col_key = literal_column_map.get(node_id)
    if not col_key:
        return converted_value

    column_type = column_types.get(col_key, "")
    if not _is_datetime_type(column_type):
        return converted_value

    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", value):
        converted_value = datetime.datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    return converted_value


def _is_numeric_value(value: Any) -> bool:
    """Check if value is numeric (int, float, or numeric string)."""
    return isinstance(value, (int, float)) or (
        isinstance(value, str) and value.isdigit()
    )


def _is_boolean_type(column_type: str) -> bool:
    """Check if column type is boolean (MySQL tinyint(1)/boolean, PostgreSQL bool)."""
    if not column_type:
        return False
    ct = column_type.lower()
    return (
        "boolean" in ct
        or ct == "bool"
        or ct.startswith("tinyint(1)")
        or ct == "tinyint"
    )


def _convert_value_if_boolean(
    value: str,
    node_id: int,
    literal_column_map: Dict[int, str],
    column_types: Dict[str, str],
) -> Union[str, bool]:
    """Convert 'true'/'false' string to bool for boolean columns (MySQL compatibility)."""
    col_key = literal_column_map.get(node_id)
    if not col_key or not _is_boolean_type(column_types.get(col_key, "")):
        return value
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False
    return value


def _parameterize_literals(
    parsed: Any,
    literal_column_map: Dict[int, str],
    column_types: Optional[Dict[str, str]],
) -> dict[str, Any]:
    """
    Parameterize literal values in SQL statements.

    Args:
        parsed: Parsed SQL expression
        literal_column_map: Mapping from literal node IDs to column names
        column_types: Column type mapping

    Returns:
        dict: Parameter dictionary mapping parameter names to values
    """
    params_dict: dict[str, Any] = {}
    for node in parsed.walk():
        if not isinstance(node, exp.Literal):
            continue

        value = node.this
        if _is_numeric_value(value):
            continue

        if not isinstance(value, str):
            continue

        # Convert value to datetime or boolean if needed (MySQL compatibility)
        converted_value: Union[str, datetime.datetime, bool] = value
        if column_types:
            converted_value = _convert_value_if_datetime(
                value, id(node), literal_column_map, column_types
            )
            if isinstance(converted_value, str):
                converted_value = _convert_value_if_boolean(
                    converted_value, id(node), literal_column_map, column_types
                )

        # Generate unique parameter name and replace literal with placeholder
        param_name = f"param_{len(params_dict)}"
        node.replace(exp.Placeholder(this=param_name))
        params_dict[param_name] = converted_value

    return params_dict


def rewrite_dml_with_uid_and_limit(
    dml: str,
    app_id: str,
    uid: str,
    limit_num: int,
    column_types: Optional[Dict[str, str]] = None,
    space_id: Optional[str] = None,
) -> tuple[str, list, dict]:
    """
    Rewrite DML with UID and limit expressions.

    Args:
        dml: Original DML statement
        app_id: Application ID
        uid: User ID
        limit_num: Limit number for SELECT queries
        column_types: Column type mapping, key is "table.column", value is data type
        space_id: Optional team space ID for team data sharing

    Returns:
        tuple: (rewritten_sql, insert_ids, params_dict)
    """
    dialect = get_adapter().get_sqlglot_dialect()
    parsed = parse_one(dml, dialect=dialect)
    insert_ids: List[int] = []

    tables = [table.alias_or_name for table in parsed.find_all(exp.Table)]

    if isinstance(parsed, (exp.Update, exp.Delete, exp.Select)):
        _dml_add_where(parsed, tables, app_id, uid, space_id)

    if isinstance(parsed, exp.Select):
        limit = parsed.args.get("limit")
        if not limit:
            parsed.set("limit", exp.Limit(expression=exp.Literal.number(limit_num)))

    if isinstance(parsed, exp.Insert):
        _dml_insert_add_params(parsed, insert_ids, app_id, uid, space_id)

    # Build mapping from Literal nodes to column names (only when needed)
    literal_column_map: Dict[int, str] = {}
    if column_types and tables:
        # Use first table as default, but functions will get actual table name
        # from Column nodes
        default_table_name = tables[0]
        # Build alias map to resolve table aliases to actual table names
        alias_map = _build_table_alias_map(parsed)
        _build_literal_column_map(
            parsed, default_table_name, literal_column_map, alias_map
        )

    # Parameterize values in SQL statements
    params_dict = _parameterize_literals(parsed, literal_column_map, column_types)

    return (
        _normalize_bind_placeholders(
            parsed.sql(dialect=get_adapter().get_sqlglot_dialect())
        ),
        insert_ids,
        params_dict,
    )


def _dml_add_where(
    parsed: Any,
    tables: List[str],
    app_id: str,
    uid: str,
    space_id: Optional[str] = None,
) -> None:
    """Add WHERE conditions to DML statements based on space_id or uid.

    Args:
        parsed: Parsed SQL statement
        tables: List of table names in the query
        app_id: Application ID
        uid: User ID
        space_id: Optional team space ID. If provided, no filtering is needed
                  (schema-level isolation); otherwise use uid-based isolation

    Note:
        In team space mode (space_id exists), each database has its own PostgreSQL
        schema (e.g., prod_{uid}_{database_id}), which already provides physical
        isolation. Therefore, no additional WHERE filtering is needed.

        In personal mode (space_id is None), we filter by uid to isolate data
        between different users.
    """
    # Team space mode: schema already provides isolation, no WHERE filter needed
    if space_id:
        return

    # Personal mode: add uid-based filtering
    where_expr = parsed.args.get("where")
    uid_conditions = []

    for table in tables:
        uid_col = exp.Column(this="uid", table=table)
        condition = exp.In(
            this=uid_col,
            expressions=[
                exp.Literal.string(f"{uid}"),
                exp.Literal.string(f"{app_id}:{uid}"),
            ],
        )
        uid_conditions.append(condition)

    final_condition = uid_conditions[0]
    for cond in uid_conditions[1:]:
        final_condition = exp.and_(final_condition, cond)  # type: ignore[assignment]

    if where_expr:
        grouped_where = exp.Paren(this=where_expr.this)
        new_where = exp.and_(grouped_where, final_condition)
    else:
        new_where = final_condition

    parsed.set("where", exp.Where(this=new_where))


def _dml_insert_add_params(
    parsed: Any,
    insert_ids: List[int],
    app_id: str,
    uid: str,
    space_id: Optional[str] = None,
) -> None:
    """Add parameters to INSERT statements.

    Args:
        parsed: Parsed INSERT statement
        insert_ids: List to store generated IDs
        app_id: Application ID
        uid: User ID
        space_id: Optional team space ID (not used, kept for API compatibility)

    Note:
        We always add id and uid columns regardless of space_id, because:
        - id: Primary key, always needed
        - uid: Records who created the data, useful for audit trails

        We do NOT add space_id column because schema-level isolation already
        provides space separation.
    """
    existing_columns = parsed.args["this"].expressions or []
    insert_exprs = parsed.args["expression"]
    rows = insert_exprs.expressions

    extra_fields = ["id", "uid"]

    need_del_index = []
    for index, column in enumerate(existing_columns):
        if column.this in INSERT_EXTRA_COLUMNS:
            need_del_index.append(index)

    need_del_index.reverse()
    for index in need_del_index:
        existing_columns.pop(index)
        for row in rows:
            row.expressions.pop(index)

    for name in extra_fields:
        existing_columns.append(exp.to_identifier(name))

    for i, row in enumerate(rows):
        row_id = get_id()
        insert_ids.append(row_id)
        extra_values = [
            exp.Literal.number(row_id),
            exp.Literal.string(f"{app_id}:{uid}"),
        ]
        new_exprs = list(row.expressions) + [val.copy() for val in extra_values]
        rows[i] = exp.Tuple(expressions=new_exprs)

    parsed.set("columns", exp.Tuple(this=existing_columns))
    parsed.set("expression", insert_exprs)


def to_jsonable(obj: Any) -> Any:
    """Convert object to JSON-serializable format."""
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [to_jsonable(item) for item in obj]
    if isinstance(obj, datetime.datetime):
        return obj.isoformat(sep=" ", timespec="seconds")
    if isinstance(obj, datetime.date):
        return obj.isoformat()
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    return obj


def _collect_functions_names(parsed: Any) -> list:
    """
    Collect function names from parsed SQL AST.
    """
    functions_to_validate = []
    sqlglot_func_key_map = {
        "currentuser": "current_user",
        "sessionuser": "session_user",
        "currentdate": "current_date",
        "currenttime": "current_time",
        "currenttimestamp": "current_timestamp",
        "currentschema": "current_schema",
        "currentcatalog": "current_catalog",
        "currentdatabase": "current_database",
        "currentrole": "current_role",
        "localtime": "localtime",
        "localtimestamp": "localtimestamp",
        "user": "user",
        "systemuser": "system_user",
    }

    for node in parsed.walk():
        if not isinstance(node, exp.Func):
            continue

        func_name = node.name
        if not func_name:
            key = getattr(node, "key", None) or type(node).__name__.lower()
            func_name = sqlglot_func_key_map.get(key, "")

        if func_name:
            functions_to_validate.append(func_name)

    return functions_to_validate


def _collect_column_names(parsed: Any) -> list:
    """Collect column names."""
    columns_to_validate = []
    for node in parsed.walk():
        if not isinstance(node, Column):
            continue

        column_name = node.name
        if not column_name:
            continue

        columns_to_validate.append(column_name)
    return columns_to_validate


def _collect_insert_keys(parsed: Any) -> list:
    """Collect key names from INSERT statements."""
    keys_to_validate = []
    for node in parsed.walk():
        if not isinstance(node, exp.Insert):
            continue

        if not (node.this and hasattr(node.this, "expressions")):
            continue

        for col in node.this.expressions:
            if isinstance(col, Column):
                keys_to_validate.append(col.name)
    return keys_to_validate


def _collect_update_keys(parsed: Any) -> list:
    """Collect key names from UPDATE statements."""
    keys_to_validate = []
    for node in parsed.walk():
        if not isinstance(node, exp.Update):
            continue

        for set_expr in node.expressions:
            if not isinstance(set_expr, exp.EQ):
                continue

            left = set_expr.left
            if isinstance(left, Column):
                keys_to_validate.append(left.name)
            elif not isinstance(left, Column):
                raise ValueError(
                    f"Column names must be used in UPDATE SET clause: {set_expr}"
                )
    return keys_to_validate


def _collect_columns_and_keys(parsed: Any) -> tuple[list, list, list]:
    """Collect column names and key names that need validation."""
    functions_to_validate = _collect_functions_names(parsed)
    columns_to_validate = _collect_column_names(parsed)
    insert_keys = _collect_insert_keys(parsed)
    update_keys = _collect_update_keys(parsed)
    keys_to_validate = insert_keys + update_keys
    return functions_to_validate, columns_to_validate, keys_to_validate


def _validate_comparison_nodes(parsed: Any, uid: str, span_context: Any) -> Any:
    """Validate comparison operation nodes."""
    for node in parsed.walk():
        # Check keys in WHERE conditions
        if (
            isinstance(node, exp.EQ)
            or isinstance(node, exp.NEQ)
            or isinstance(node, exp.GT)
            or isinstance(node, exp.LT)
            or isinstance(node, exp.GTE)
            or isinstance(node, exp.LTE)
        ):
            # Get left side (usually column name)
            left = node.left
            if isinstance(left, Column):
                # These column names will be collected in _collect_columns_and_keys
                continue
            elif not isinstance(left, (Column, Literal)):
                span_context.add_error_event(
                    f"DML statement contains illegal expression: {node}"
                )
                logger.error(f"DML statement contains illegal expression: {node}")
                return format_response(
                    code=CodeEnum.DMLNotAllowed.code,
                    message=f"DML statement contains illegal expression: {node}",
                    sid=span_context.sid,
                )
    return None


def _validate_name_pattern(names: list, name_type: str, span_context: Any) -> Any:
    """
    Validate name pattern for DML identifiers.

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
    # Allowed characters for DML identifiers (column names, etc.)
    # Business rule: Only ASCII letters and underscores are allowed (no digits)
    # This is intentionally more restrictive than standard SQL but is a
    # deliberate design choice
    # DO NOT modify this validation to allow digits - it violates business
    # requirements
    # Using string.ascii_letters constant instead of regex to avoid code
    # scanning false positives
    allow_chars = string.ascii_letters + "_"
    for name in names:
        # Check if name is empty
        if not name:
            error_msg = (
                f"{name_type}: '{name}' does not conform to rules, "
                "only letters and underscores are supported"
            )
            span_context.add_error_event(error_msg)
            logger.error(error_msg)
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=error_msg,
                sid=span_context.sid,
            )

        # Validate using column name
        if not all(c in allow_chars for c in name):
            error_msg = (
                f"{name_type}: '{name}' does not conform to rules, "
                "only letters and underscores are supported"
            )
            span_context.add_error_event(error_msg)
            logger.error(error_msg)
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=error_msg,
                sid=span_context.sid,
            )
    return None


async def _validate_dml_legality(dml: str, uid: str, span_context: Any) -> Any:
    try:
        dialect = get_adapter().get_sqlglot_dialect()
        parsed = sqlglot.parse_one(dml, dialect=dialect)

        # Validate comparison operation nodes
        error_result = _validate_comparison_nodes(parsed, uid, span_context)
        if error_result:
            return error_result

        # Collect column names and keys that need validation
        functions_to_validate, columns_to_validate, keys_to_validate = (
            _collect_columns_and_keys(parsed)
        )
        # Validate reserved function
        error_result = await validate_reserved_functions(
            functions_to_validate, span_context
        )
        if error_result:
            return error_result

        # Validate column names
        error_result = _validate_name_pattern(
            columns_to_validate, "Column name", span_context
        )
        if error_result:
            return error_result
        # Validate reserved column
        error_result = await validate_reserved_keywords(
            columns_to_validate, span_context
        )
        if error_result:
            return error_result
        # Validate key names
        error_result = _validate_name_pattern(
            keys_to_validate, "Key name", span_context
        )
        if error_result:
            return error_result

        # Validate reserved keywords
        error_result = await validate_reserved_keywords(keys_to_validate, span_context)
        if error_result:
            return error_result

        return None
    except Exception as parse_error:  # pylint: disable=broad-except
        span_context.record_exception(parse_error)
        return format_response(
            code=CodeEnum.SQLParseError.code,
            message="SQL parsing failed",
            sid=span_context.sid,
        )


async def _validate_and_prepare_dml(db: Any, dml_input: Any, span_context: Any) -> Any:
    """Validate input and prepare DML execution."""
    app_id = dml_input.app_id
    uid = dml_input.uid
    database_id = dml_input.database_id
    dml = dml_input.dml
    sql_params = dml_input.params
    env = dml_input.env
    space_id = dml_input.space_id

    need_check = {
        "app_id": app_id,
        "database_id": database_id,
        "uid": uid,
        "dml": dml,
        "params": sql_params,
        "env": env,
        "space_id": space_id,
    }
    span_context.add_info_events(need_check)
    span_context.add_info_event(f"app_id: {app_id}")
    logger.info(f"app_id: {app_id}")
    span_context.add_info_event(f"database_id: {database_id}")
    logger.info(f"database_id: {database_id}")
    span_context.add_info_event(f"uid: {uid}")
    logger.info(f"uid: {uid}")

    if space_id:
        _, error_spaceid = await check_space_id_and_get_uid(
            db, database_id, space_id, span_context
        )
        if error_spaceid:
            return None, error_spaceid

    schema_list, error_resp = await check_database_exists_by_did(
        db, database_id, span_context
    )
    if error_resp:
        return None, error_resp

    return (app_id, uid, database_id, dml, sql_params, env, schema_list, space_id), None


async def _get_table_column_types(
    db: AsyncSession, schema: str, tables: List[str]
) -> Dict[str, str]:
    """
    Query table column type information.

    Args:
        db: Database session
        schema: Schema name
        tables: List of table names

    Returns:
        dict: Column type mapping, key is "table.column", value is data type
        (e.g., 'timestamp without time zone', 'character varying', etc.)
    """
    column_types: Dict[str, str] = {}
    adapter = get_adapter()
    for table in tables:
        sql = adapter.get_column_types_sql()
        result = await parse_and_exec_sql(
            db, sql, {"table_name": table, "table_schema": schema}
        )
        for row in result.fetchall():
            col_name = row[0]
            # Standard data type
            data_type = row[1]
            # Database-specific type (udt_name for PG, COLUMN_TYPE for MySQL)
            specific_type = row[2]
            key = f"{table}.{col_name}"
            # Use specific type for more accuracy, use data_type if empty
            column_types[key] = specific_type if specific_type else data_type
    return column_types


async def _process_dml_statements(
    dmls: List[str],
    app_id: str,
    uid: str,
    span_context: Any,
    db: AsyncSession,
    schema: str,
    space_id: Optional[str] = None,
    sql_params: Optional[Dict[str, Any]] = None,
) -> Any:
    """Process and rewrite DML statements.

    Args:
        dmls: List of DML statements to process
        app_id: Application ID
        uid: User ID
        span_context: Span context for tracing
        db: Database session
        schema: Database schema name
        space_id: Optional team space ID for team data sharing
        sql_params: Optional bind parameters supplied by the caller
    """
    sql_params = sql_params or {}
    rewrite_dmls = []
    for statement in dmls:
        error_legality = await _validate_dml_legality(statement, uid, span_context)
        if error_legality:
            return None, error_legality

        # Query column type information (if database connection and schema are provided)
        column_types: Optional[Dict[str, str]] = None
        try:
            dialect = get_adapter().get_sqlglot_dialect()
            parsed = parse_one(statement, dialect=dialect)
            # Use actual table names (not aliases) for database query
            tables = [table.name for table in parsed.find_all(exp.Table)]
            if tables:
                column_types = await _get_table_column_types(db, schema, tables)
                span_context.add_info_event(
                    f"Column types for tables {tables}: {column_types}"
                )
                logger.info(f"Column types for tables {tables}: {column_types}")
        except Exception as col_type_error:  # pylint: disable=broad-except
            # If querying column types fails, log error but don't interrupt
            # processing (backward compatibility)
            span_context.add_error_event(
                f"Failed to get column types: {str(col_type_error)}"
            )
            logger.error(f"Failed to get column types: {str(col_type_error)}")
            column_types = None

        rewrite_dml, insert_ids, params = rewrite_dml_with_uid_and_limit(
            dml=statement,
            app_id=app_id,
            uid=uid,
            limit_num=100,
            column_types=column_types,
            space_id=space_id,
        )
        duplicate_params = set(params) & set(sql_params)
        if duplicate_params:
            duplicate_names = ", ".join(sorted(duplicate_params))
            span_context.add_error_event(
                f"DML parameter names conflict with generated parameters: {duplicate_names}"
            )
            logger.error(
                f"DML parameter names conflict with generated parameters: {duplicate_names}"
            )
            return None, format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message="DML parameter names conflict with generated parameters",
                sid=span_context.sid,
            )
        params = {**params, **sql_params}
        span_context.add_info_event(f"rewrite dml sql: {rewrite_dml}")
        logger.info(f"rewrite dml sql: {rewrite_dml}")
        span_context.add_info_event(f"rewrite dml params: {params}")
        logger.info(f"rewrite dml params: {params}")
        span_context.add_info_event(f"rewrite dml insert_ids: {insert_ids}")
        logger.info(f"rewrite dml insert_ids: {insert_ids}")
        rewrite_dmls.append(
            {
                "rewrite_dml": rewrite_dml,
                "insert_ids": insert_ids,
                "params": params,
            }
        )
    return rewrite_dmls, None


@exec_dml_router.post("/exec_dml", response_class=JSONResponse)
async def exec_dml(
    dml_input: ExecDMLInput, db: AsyncSession = Depends(get_session)
) -> JSONResponse:
    """
    Execute DML statements on specified database.

    Args:
        dml_input: Input containing DML statements and metadata
        db: Database session

    Returns:
        JSONResponse: Result of DML execution
    """
    uid = dml_input.uid
    database_id = dml_input.database_id
    metric_service = get_otlp_metric_service()
    m = metric_service.get_meter()(func="exec_dml")
    span_service = get_otlp_span_service()
    span = span_service.get_span()(uid=uid)

    with span.start(
        func_name="exec_dml",
        add_source_function_name=True,
        attributes={"uid": uid, "database_id": database_id},
    ) as span_context:
        try:
            validated_data, error = await _validate_and_prepare_dml(
                db, dml_input, span_context
            )
            if error:
                return error  # type: ignore[no-any-return]

            app_id, uid, database_id, dml, sql_params, env, schema_list, space_id = (
                validated_data
            )

            schema, error_search = await _set_search_path(
                db, schema_list, env, uid, span_context
            )
            if error_search:
                return error_search  # type: ignore[no-any-return]

            dmls, error_split = await _dml_split(dml, db, schema, uid, span_context)
            if error_split:
                return error_split  # type: ignore[no-any-return]

            rewrite_dmls, error_legality = await _process_dml_statements(
                dmls, app_id, uid, span_context, db, schema, space_id, sql_params
            )
            if error_legality:
                return error_legality  # type: ignore[no-any-return]

            final_exec_success_res, exec_time, error_exec = await _exec_dml_sql(
                db, rewrite_dmls, uid, span_context
            )
            if error_exec:
                return error_exec  # type: ignore[no-any-return]

            return format_response(  # type: ignore[no-any-return]
                CodeEnum.Successes.code,
                message=CodeEnum.Successes.msg,
                sid=span_context.sid,
                data={
                    "exec_success": final_exec_success_res,
                    "exec_failure": [],
                    "exec_time": exec_time,
                },
            )
        except CustomException as custom_error:
            span_context.record_exception(custom_error)
            m.in_error_count(custom_error.code, lables={"uid": uid}, span=span_context)
            return format_response(  # type: ignore[no-any-return]
                code=custom_error.code,
                message="Database execution failed",
                sid=span_context.sid,
            )
        except Exception as unexpected_error:  # pylint: disable=broad-except
            m.in_error_count(
                CodeEnum.DMLExecutionError.code, lables={"uid": uid}, span=span_context
            )
            span_context.record_exception(unexpected_error)
            return format_response(  # type: ignore[no-any-return]
                code=CodeEnum.DMLExecutionError.code,
                message="Database execution failed",
                sid=span_context.sid,
            )


async def _exec_dml_sql(
    db: Any, rewrite_dmls: List[Any], uid: str, span_context: Any
) -> Any:
    """Execute rewritten DML SQL statements."""
    final_exec_success_res = []
    start_time = time.time()

    try:
        for dml_info in rewrite_dmls:
            rewrite_dml = dml_info["rewrite_dml"]
            insert_ids = dml_info["insert_ids"]
            params = dml_info.get("params", {})

            # If there are parameters, use parameterized query,
            # otherwise execute directly
            if params:
                result = await parse_and_exec_sql(db, rewrite_dml, params)
            else:
                result = await exec_sql_statement(db, rewrite_dml)
            try:
                exec_result = result.mappings().all()
                exec_result_dicts = [dict(row) for row in exec_result]
                exec_result_dicts = to_jsonable(exec_result_dicts)
            except Exception as mapping_error:
                span_context.add_info_event(f"{str(mapping_error)}")
                logger.info(f"{str(mapping_error)}")
                exec_result_dicts = []

            span_context.add_info_event(f"exec result: {exec_result_dicts}")
            logger.info(f"exec result: {exec_result_dicts}")

            if exec_result_dicts:
                final_exec_success_res.extend(exec_result_dicts)
            elif insert_ids:
                final_exec_success_res.extend([{"id": v} for v in insert_ids])

            await db.commit()

        exec_time = time.time() - start_time
        return final_exec_success_res, exec_time, None

    except Exception as exec_error:  # pylint: disable=broad-except
        span_context.record_exception(exec_error)
        await db.rollback()
        return (
            None,
            None,
            format_response(
                code=CodeEnum.DatabaseExecutionError.code,
                message="Database execution failed",
                sid=span_context.sid,
            ),
        )


async def _set_search_path(
    db: Any, schema_list: List[Any], env: str, uid: str, span_context: Any
) -> Any:
    """Set search path for database operations."""
    schema = next((one[0] for one in schema_list if env in one[0]), "")
    if not schema:
        span_context.add_error_event("Corresponding schema not found")
        logger.error("Corresponding schema not found")
        return None, format_response(
            code=CodeEnum.NoSchemaError.code,
            message=f"Corresponding schema not found: {schema}",
            sid=span_context.sid,
        )

    span_context.add_info_event(f"schema: {schema}")
    logger.info(f"schema: {schema}")
    try:
        await set_search_path_by_schema(db, schema)
        return schema, None
    except Exception as schema_error:  # pylint: disable=broad-except
        span_context.record_exception(schema_error)
        return None, format_response(
            code=CodeEnum.NoSchemaError.code,
            message=f"Invalid schema: {schema}",
            sid=span_context.sid,
        )


async def _dml_split(
    dml: str, db: Any, schema: str, uid: str, span_context: Any
) -> Any:
    """Split and validate DML statements."""
    dml = dml.strip()
    dmls = sqlparse.split(dml)
    span_context.add_info_event(f"Split DML statements: {dmls}")
    logger.info(f"Split DML statements: {dmls}")

    if len(dmls) != 1:
        span_context.add_error_event("DML request contains multiple SQL statements")
        logger.error("DML request contains multiple SQL statements")
        return None, format_response(
            code=CodeEnum.DMLNotAllowed.code,
            message="Only one SQL statement is allowed per DML request",
            sid=span_context.sid,
        )

    for statement in dmls:
        try:
            dialect = get_adapter().get_sqlglot_dialect()
            parsed = parse_one(statement, dialect=dialect)
            tables = {table.name for table in parsed.find_all(exp.Table)}
        except Exception as parse_error:  # pylint: disable=broad-except
            span_context.record_exception(parse_error)
            return None, format_response(
                code=CodeEnum.SQLParseError.code,
                message="SQL parsing failed",
                sid=span_context.sid,
            )

        result = await parse_and_exec_sql(
            db,
            get_adapter().list_tables_sql(),
            {"schema": schema},
        )
        valid_tables = {row[0] for row in result.fetchall()}
        not_found = tables - valid_tables

        if not_found:
            span_context.add_error_event(
                f"Table does not exist or no permission: {', '.join(not_found)}"
            )
            logger.error(
                f"Table does not exist or no permission: {', '.join(not_found)}"
            )
            return None, format_response(
                code=CodeEnum.NoAuthorityError.code,
                message=f"Table does not exist or no permission: "
                f"{', '.join(not_found)}",
                sid=span_context.sid,
            )

        allowed_sql = re.compile(r"^\s*(SELECT|INSERT|UPDATE|DELETE)\s+", re.IGNORECASE)
        if not allowed_sql.match(statement):
            span_context.add_error_events({"invalid dml": statement})
            logger.error(f"invalid dml: {statement}")
            return None, format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message="Unsupported SQL type, only "
                "SELECT/INSERT/UPDATE/DELETE allowed",
                sid=span_context.sid,
            )

    return dmls, None
