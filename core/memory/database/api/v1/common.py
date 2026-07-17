"""
Database operator API endpoints
for common databases.
"""

from typing import Any, List, Optional, Tuple

import sqlalchemy
import sqlalchemy.exc
from loguru import logger
from memory.database.domain.entity.database_meta import (
    get_id_by_did,
    get_id_by_did_uid,
    get_uid_by_did_space_id,
)
from memory.database.domain.entity.schema_meta import get_schema_name_by_did
from memory.database.domain.entity.views.http_resp import format_response
from memory.database.exceptions.error_code import CodeEnum
from memory.database.repository.middleware.adapters import get_adapter


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
            logger.error(f"User: {uid} does not have database: {database_id}")
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
            logger.error(f"Database does not exist: {database_id}")
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
    logger.info(f"space_id: {space_id}")
    create_uid_res = await get_uid_by_did_space_id(db, database_id, space_id)
    if not create_uid_res:
        span_context.add_error_event(
            f"space_id: {space_id} does not contain database_id: {database_id}"
        )
        logger.error(
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
    adapter = get_adapter()
    reserved_keywords = adapter.get_reserved_keywords()
    for key_name in keys:
        if key_name.lower() in reserved_keywords:
            span_context.add_error_event(f"Key name '{key_name}' is not allowed")
            logger.error(f"Key name '{key_name}' is not allowed")
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=f"Key name '{key_name}' is not allowed",
                sid=span_context.sid,
            )
    return None


async def validate_reserved_functions(keys: list, span_context: Any) -> Any:
    """Validate reserved functions."""
    adapter = get_adapter()
    dangerous_functions = adapter.get_dangerous_functions()
    for key_name in keys:
        if key_name.lower() in dangerous_functions:
            span_context.add_error_event(f"Function name '{key_name}' is not allowed")
            logger.error(f"Function name '{key_name}' is not allowed")
            return format_response(
                code=CodeEnum.DMLNotAllowed.code,
                message=f"Function name '{key_name}' is not allowed",
                sid=span_context.sid,
            )
    return None
