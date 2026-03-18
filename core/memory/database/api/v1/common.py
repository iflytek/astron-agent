"""
Database operator API endpoints
for common databases.
"""

from typing import Any, List, Optional, Tuple

import sqlalchemy
import sqlalchemy.exc
from memory.database.domain.entity.database_meta import (
    get_id_by_did,
    get_id_by_did_uid,
    get_uid_by_did_space_id,
)
from memory.database.domain.entity.schema_meta import get_schema_name_by_did
from memory.database.domain.entity.views.http_resp import format_response
from memory.database.exceptions.error_code import CodeEnum

PGSQL_INVALID_KEY = [
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


PGSQL_DANGEROUS_FUNCTIONS = [
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


async def check_database_exists_by_did_uid(
    db: Any, database_id: int, uid: str, span_context: Any
) -> Tuple[Optional[List[List[str]]], Optional[Any]]:
    """Check if database exists and return its schemas."""
    try:
        db_id_res = await get_id_by_did_uid(db, database_id=database_id, uid=uid)
        if not db_id_res:
            span_context.add_error_event(
                f"User: {uid} does not have database: {database_id}"
            )
            return None, format_response(
                code=CodeEnum.DatabaseNotExistError.code,
                message=f"uid: {uid} or database_id: {database_id} error, "
                "please verify",
                sid=span_context.sid,
            )

        res = await get_schema_name_by_did(db, database_id=database_id)
        if not res:
            return None, format_response(
                code=CodeEnum.DatabaseNotExistError.code,
                message=CodeEnum.DatabaseNotExistError.msg,
                sid=span_context.sid,
            )
        return res, None
    except sqlalchemy.exc.DBAPIError as e:
        await db.rollback()
        span_context.record_exception(e)
        return None, format_response(
            code=CodeEnum.DatabaseExecutionError.code,
            message=f"Database execution failed. Please check if the passed "
            f"database id and uid are correct, {str(e.__cause__)}",
            sid=span_context.sid,
        )
    except Exception as e:  # pylint: disable=broad-except
        span_context.report_exception(e)
        return None, format_response(
            code=CodeEnum.DatabaseExecutionError.code,
            message=f"{str(e.__cause__)}",
            sid=span_context.sid,
        )


async def check_database_exists_by_did(
    db: Any, database_id: int, span_context: Any
) -> Tuple[Optional[List[List[str]]], Optional[Any]]:
    """Check if database exists."""
    try:
        db_id_res = await get_id_by_did(db, database_id)
        if not db_id_res:
            span_context.add_error_event(f"Database does not exist: {database_id}")
            return None, format_response(
                code=CodeEnum.DatabaseNotExistError.code,
                message=f"database_id: {database_id} error, please verify",
                sid=span_context.sid,
            )

        res = await get_schema_name_by_did(db, database_id)
        if not res:
            return None, format_response(
                code=CodeEnum.DatabaseNotExistError.code,
                message=CodeEnum.DatabaseNotExistError.msg,
                sid=span_context.sid,
            )
        return res, None

    except Exception as db_error:
        span_context.record_exception(db_error)
        return None, format_response(
            code=CodeEnum.DatabaseExecutionError.code,
            message="Database execution failed",
            sid=span_context.sid,
        )


async def check_space_id_and_get_uid(
    db: Any, database_id: int, space_id: str, span_context: Any
) -> Tuple[Optional[List[List[str]]], Optional[Any]]:
    """Check if space ID is valid."""
    span_context.add_info_event(f"space_id: {space_id}")
    create_uid_res = await get_uid_by_did_space_id(db, database_id, space_id)
    if not create_uid_res:
        span_context.add_error_event(
            f"space_id: {space_id} does not contain database_id: {database_id}"
        )
        return None, format_response(
            code=CodeEnum.SpaceIDNotExistError.code,
            message=f"space_id: {space_id} does not contain database_id: {database_id}",
            sid=span_context.sid,
        )

    return create_uid_res, None


async def validate_reserved_keywords(keys: list, span_context: Any) -> Any:
    """Validate reserved keywords."""
    for key_name in keys:
        if key_name.lower() in PGSQL_INVALID_KEY:
            span_context.add_error_event(f"Key name '{key_name}' is not allowed")
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=f"Key name '{key_name}' is not allowed",
                sid=span_context.sid,
            )
    return None


async def validate_reserved_functions(keys: list, span_context: Any) -> Any:
    """Validate reserved functions."""
    for key_name in keys:
        if key_name.lower() in PGSQL_DANGEROUS_FUNCTIONS:
            span_context.add_error_event(f"Function name '{key_name}' is not allowed")
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=f"Function name '{key_name}' is not allowed",
                sid=span_context.sid,
            )
    return None
