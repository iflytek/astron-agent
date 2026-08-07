"""
Database utility functions module.

This module provides utility functions for database session management
and common database operations.
"""

from contextlib import contextmanager
from typing import Iterator

from loguru import logger
from sqlmodel import Session  # type: ignore

from workflow.extensions.middleware.getters import get_db_service


@contextmanager
def session_getter(auto_commit: bool = True) -> Iterator[Session]:
    """
    Context manager for database session management.

    This function provides a safe way to obtain and manage database sessions
    with automatic rollback on exceptions and proper cleanup. It ensures that
    database sessions are properly closed even if exceptions occur during
    database operations.

    :param auto_commit: Whether to automatically commit on successful exit.
        Set to False for read-only operations to avoid unnecessary commit overhead.
    :return: Iterator yielding a database session
    :raises Exception: Re-raises any exception that occurs during session usage
    """
    db_service = get_db_service()
    try:
        # Create a new session from the database service engine
        session = Session(db_service.engine)
        yield session
        if auto_commit:
            session.commit()
    except Exception as e:
        # Log the exception and rollback the session before re-raising
        logger.debug(f"Session rollback because of exception: {e}")
        session.rollback()
        raise
    finally:
        # Ensure session is always closed, even if an exception occurred
        session.close()
