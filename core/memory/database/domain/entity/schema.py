"""Module providing schema-related database operations."""

from memory.database.utils.retry import retry_on_invalid_cached_statement
from sqlalchemy import text
from sqlalchemy.sql import quoted_name
from sqlmodel.ext.asyncio.session import AsyncSession


@retry_on_invalid_cached_statement(max_retries=3)
async def set_search_path_by_schema(session: AsyncSession, schema: str) -> None:
    """Set the database search path to the specified schema.

    Args:
        session: Async database session
        schema: Schema name to set as search path
    """
    # Use SQLAlchemy's quoted_name to safely escape schema identifiers
    safe_name = quoted_name(schema, quote=True)
    await session.exec(text(f'SET search_path = "{safe_name}"'))  # type: ignore[call-overload]
    # Store current schema on session object for potential recovery after connection invalidation
    setattr(session, "_current_schema", schema)
