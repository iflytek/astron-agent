"""
Database migration module for FastAPI lifespan.

This module provides database migration functionality that can be executed
during FastAPI application startup to ensure the database schema is up-to-date.
"""

import logging
from pathlib import Path

from common.service import get_cache_service

from alembic import command  # type: ignore[attr-defined]
from alembic.config import Config

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | %(levelname)s | %(name)s:%(funcName)s:%(lineno)d | "
        "%(message)s"
    ),
    datefmt="%Y-%m-%d %H:%M:%S",
)


def run_database_migration() -> None:
    """
    Execute database migration (using Redis distributed lock).

    This function runs database migrations to ensure the database schema is
    up-to-date. Uses Redis distributed lock to prevent multiple instances from
    running migrations simultaneously. Database URL is configured from
    environment variables in alembic/env.py.
    """
    memory_dir = Path(__file__).parent.parent.parent.parent.parent
    alembic_dir = memory_dir / "database" / "alembic"
    alembic_ini = alembic_dir / "alembic.ini"
    if not alembic_ini.exists():
        logging.error("alembic.ini not found: %s", alembic_ini)
        raise FileNotFoundError(f"alembic.ini not found: {alembic_ini}")

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(alembic_dir))

    cache_service = get_cache_service()
    is_locked = cache_service.setnx(
        "memory_database_migration_lock", "locked", expire_time=60
    )
    if is_locked:
        try:
            command.upgrade(config, "head")
        except Exception as e:  # pylint: disable=broad-exception-caught
            if "already exists" in str(e):
                try:
                    command.stamp(config, "f2a4ce6e3198")
                    command.upgrade(config, "head")
                except (
                    Exception
                ) as stamp_error:  # pylint: disable=broad-exception-caught
                    logging.error(
                        "Failed to stamp and upgrade legacy database: %s",
                        stamp_error,
                    )
            logging.error("Database migration failed: %s", e)
