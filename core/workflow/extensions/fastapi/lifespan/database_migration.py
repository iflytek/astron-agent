"""
Database migration module for FastAPI lifespan.

This module provides database migration functionality that can be executed
during FastAPI application startup to ensure the database schema is up-to-date.
"""

import logging
from pathlib import Path

from sqlalchemy.exc import OperationalError

from alembic import command  # type: ignore[attr-defined]
from alembic.config import Config
from workflow.extensions.middleware.getters import get_cache_service

# Migration constants
INIT_VERSION = "b13356244aea"

# MySQL error codes
MYSQL_ERROR_SELECT_DENIED = 1142
MYSQL_ERROR_ACCESS_DENIED = 1227
MYSQL_ERROR_EXECUTE_DENIED = 1370
MYSQL_ERROR_TABLE_EXISTS = 1050

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def run_database_migration() -> None:
    """
    Execute database migration (using Redis distributed lock).

    This function runs database migrations to ensure the database schema is up-to-date.
    Uses Redis distributed lock to prevent multiple instances from running migrations simultaneously.
    Database URL is configured from environment variables in alembic/env.py.
    """
    workflow_dir = Path(__file__).parent.parent.parent.parent
    alembic_dir = workflow_dir / "alembic"
    alembic_ini = alembic_dir / "alembic.ini"
    if not alembic_ini.exists():
        logging.error(f"alembic.ini not found: {alembic_ini}")
        raise FileNotFoundError(f"alembic.ini not found: {alembic_ini}")

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(alembic_dir))

    cache_service = get_cache_service()
    is_locked = cache_service.setnx("workflow_database_migration_lock", "locked", ex=60)
    if is_locked:
        try:
            command.upgrade(config, "head")
        except OperationalError as e:
            db_error_code = getattr(e.orig, "args", [None])[0]
            if db_error_code in (
                MYSQL_ERROR_SELECT_DENIED,
                MYSQL_ERROR_ACCESS_DENIED,
                MYSQL_ERROR_EXECUTE_DENIED,
            ):
                logging.warning(
                    f"Skip database migration due to insufficient permissions: {e}"
                )
                return
            elif db_error_code == MYSQL_ERROR_TABLE_EXISTS:
                logging.warning("Detected legacy database, stamping to init version...")
                try:
                    command.stamp(config, INIT_VERSION)
                    command.upgrade(config, "head")
                except Exception as stamp_error:
                    logging.error(
                        f"Failed to stamp and upgrade legacy database: {stamp_error}"
                    )
            else:
                logging.error(f"Database migration failed: {e}")
        except Exception as e:
            logging.error(f"Database migration failed: {e}")
