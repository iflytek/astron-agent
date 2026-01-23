"""
Database migration module for FastAPI lifespan.

This module provides database migration functionality that can be executed
during FastAPI application startup to ensure the database schema is up-to-date.
"""

from pathlib import Path

from loguru import logger
from sqlalchemy.exc import OperationalError

from alembic import command
from alembic.config import Config
from workflow.extensions.middleware.getters import get_cache_service

INIT_VERSION = "b13356244aea"

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
        logger.error(f"alembic.ini not found: {alembic_ini}")
        raise FileNotFoundError(f"alembic.ini not found: {alembic_ini}")

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(alembic_dir))

    cache_service = get_cache_service()
    redis_client = cache_service._client
    lock = redis_client.lock(name="workflow_database_migration_lock", timeout=60)
    if lock.acquire(blocking=False):
        try:
            command.upgrade(config, "head")
        except OperationalError as e:
            if "already exists" in str(e):
                logger.warning("Detected legacy database, stamping to init version...")
                try:
                    command.stamp(config, INIT_VERSION)
                    command.upgrade(config, "head")
                except Exception as stamp_error:
                    logger.error(f"Failed to stamp and upgrade legacy database: {stamp_error}")
            else:
                logger.error(f"Database migration failed: {e}")
        except Exception as e:
            logger.error(f"Database migration failed: {e}")
        finally:
            lock.release()
