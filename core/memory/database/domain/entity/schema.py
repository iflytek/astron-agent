"""Module providing schema-related database operations."""

from memory.database.repository.middleware.adapters import get_adapter
from memory.database.utils.retry import retry_on_invalid_cached_statement
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession


@retry_on_invalid_cached_statement(max_retries=3)
async def set_search_path_by_schema(session: AsyncSession, schema: str) -> None:
    """Set the database search path to the specified schema.

    Args:
        session: Async database session
        schema: Schema name to set as search path
    """
    adapter = get_adapter()
    sql = adapter.set_search_path_sql(schema)
    await session.exec(text(sql))  # type: ignore[call-overload]
    # Store current schema on session object for potential recovery after connection invalidation
    setattr(session, "_current_schema", schema)
