"""
Retry invalid cached statement.
"""

import asyncio
from functools import wraps
from typing import Any, Callable, TypeVar

from asyncpg.exceptions import InvalidCachedStatementError
from loguru import logger
from sqlalchemy import text
from sqlalchemy.exc import InterfaceError, NotSupportedError
from sqlalchemy.sql import quoted_name

F = TypeVar("F", bound=Callable[..., Any])


def _is_invalid_cached_statement_error(exception: Exception) -> bool:
    """Check if exception is related to InvalidCachedStatementError."""
    if isinstance(exception, InvalidCachedStatementError):
        return True

    # Check for SQLAlchemy-wrapped InvalidCachedStatementError
    if isinstance(exception, NotSupportedError):
        error_str = str(exception).lower()
        if (
            "invalidcachedstatementerror" in error_str
            or "cached statement plan is invalid" in error_str
        ):
            return True

    # Check the original cause
    original_error = getattr(exception, "__cause__", None) or getattr(
        exception, "__context__", None
    )
    if original_error and isinstance(original_error, InvalidCachedStatementError):
        return True

    return False


def _find_session_from_args(args: tuple, kwargs: dict) -> Any:
    """Find session object from function arguments.

    Looks for objects that have both 'execute' and 'connection' methods
    (typical of AsyncSession objects).

    Args:
        args: Function positional arguments
        kwargs: Function keyword arguments

    Returns:
        Session object if found, None otherwise
    """
    # Check positional arguments
    for arg in args:
        if hasattr(arg, "execute") and hasattr(arg, "connection"):
            return arg

    # Check keyword arguments
    for value in kwargs.values():
        if hasattr(value, "execute") and hasattr(value, "connection"):
            return value

    return None


async def _restore_search_path(session: Any) -> None:
    """Restore search_path if it was previously set.

    Always restore search_path if it was previously set,
    regardless of cache clearing method.
    This ensures search_path is correct in all scenarios:
    1. If DISCARD PLANS was used: search_path should still be set,
       but we restore it anyway for safety and consistency
       (minimal overhead, maximum reliability)
    2. If invalidate() was used: search_path is definitely lost
       and must be restored
    This defensive approach guarantees search_path correctness
    regardless of internal implementation details or potential edge cases.

    Args:
        session: Database session object
    """
    current_schema = getattr(session, "_current_schema", None)
    if current_schema:
        try:
            # Restore search_path using the same method as set_search_path_by_schema
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


async def _clear_prepared_statement_cache(session: Any) -> None:
    """Clear prepared statement cache using PostgreSQL official DISCARD PLANS command.

    According to PostgreSQL official documentation, DISCARD PLANS clears all
    cached query plans in the current session. This is the recommended way
    to handle InvalidCachedStatementError.

    The method tries two approaches in order:
    1. Execute PostgreSQL's DISCARD PLANS command (official PostgreSQL method)
    2. Invalidate the session connection (SQLAlchemy official method)

    References:
    - PostgreSQL: https://www.postgresql.org/docs/current/sql-discard.html
    - SQLAlchemy: https://docs.sqlalchemy.org/en/20/orm/session_api.html
    """
    # Method 1: Use PostgreSQL's official DISCARD PLANS command
    # This is the recommended approach per PostgreSQL documentation
    # DISCARD PLANS clears all cached query plans in the current session
    if hasattr(session, "execute"):
        try:
            # Execute DISCARD PLANS using SQLAlchemy's text() for safe execution
            # This command doesn't require a transaction and can be executed directly
            await session.execute(text("DISCARD PLANS"))
            logger.debug("Cleared prepared statement cache using DISCARD PLANS")
            return
        except Exception as e:
            logger.warning(
                f"Failed to execute DISCARD PLANS: {e}, trying fallback method"
            )

    # Fallback: Invalidate the session connection
    # This forces SQLAlchemy to get a fresh connection from the pool
    # SQLAlchemy's official method to invalidate connection
    if hasattr(session, "invalidate"):
        try:
            await session.invalidate()
            logger.debug("Invalidated session connection as fallback")
        except Exception as e:
            logger.warning(f"Failed to invalidate session: {e}")


def retry_on_invalid_cached_statement(
    max_retries: int = 2, delay: float = 0.1
) -> Callable[[F], F]:
    """
    Automatically retry on asyncpg InvalidCachedStatementError.
    Also handles SQLAlchemy-wrapped versions of this error.

    When InvalidCachedStatementError is detected, this decorator will:
    1. Execute PostgreSQL's DISCARD PLANS command to clear cached query plans
       (Official PostgreSQL method per
       https://www.postgresql.org/docs/current/sql-discard.html)
    2. If DISCARD PLANS fails, invalidate the session connection using
       SQLAlchemy's official invalidate() method to force a fresh connection
       from the pool
    3. Wait a short delay to allow the connection pool to refresh
    4. Retry the operation with cleared cache or fresh connection

    This approach follows PostgreSQL and SQLAlchemy official documentation
    and best practices.
    """

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if _is_invalid_cached_statement_error(e) or isinstance(
                        e, InterfaceError
                    ):
                        if attempt < max_retries - 1:
                            logger.info(
                                f"[{func.__name__}] InvalidCachedStatementError "
                                f"detected, invalidating cache and retrying "
                                f"({attempt + 1}/{max_retries})..."
                            )

                            # Find session from function arguments
                            session = _find_session_from_args(args, kwargs)

                            # Clear prepared statement cache and restore search_path
                            # if session found
                            if session is not None:
                                await _clear_prepared_statement_cache(session)
                                await _restore_search_path(session)

                            # Wait before retry to allow connection pool to refresh
                            await asyncio.sleep(delay)
                        else:
                            logger.error(f"[{func.__name__}] Max retries exceeded: {e}")
                            raise
                    else:
                        # Not a retryable error, re-raise immediately
                        raise

        return wrapper  # type: ignore[return-value]

    return decorator
