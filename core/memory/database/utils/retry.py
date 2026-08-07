"""
Retry invalid cached statement.
"""

import asyncio
from functools import wraps
from typing import Any, Callable, TypeVar

from loguru import logger
from memory.database.repository.middleware.adapters import get_adapter
from sqlalchemy.exc import InterfaceError

F = TypeVar("F", bound=Callable[..., Any])


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


def retry_on_invalid_cached_statement(
    max_retries: int = 2, delay: float = 0.1
) -> Callable[[F], F]:
    """
    Automatically retry on retryable cache errors (database-specific).

    When a retryable cache error is detected, this decorator will:
    1. Clear the statement cache using the adapter's method
    2. Restore the search path using the adapter's method
    3. Wait a short delay to allow the connection pool to refresh
    4. Retry the operation
    """

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            adapter = get_adapter()
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if adapter.is_retryable_cache_error(e) or isinstance(
                        e, InterfaceError
                    ):
                        if attempt < max_retries - 1:
                            logger.info(
                                f"[{func.__name__}] Retryable cache error "
                                f"detected, invalidating cache and retrying "
                                f"({attempt + 1}/{max_retries})..."
                            )

                            # Find session from function arguments
                            session = _find_session_from_args(args, kwargs)

                            # Clear statement cache and restore search_path
                            # if session found
                            if session is not None:
                                await adapter.clear_statement_cache(session)
                                await adapter.restore_search_path(session)

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
