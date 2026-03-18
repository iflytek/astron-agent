"""Database migration module for Link service startup.

Provides safe Alembic auto-migration with Redis distributed lock and
fresh-database compatibility handling.
"""

import logging
import os
from pathlib import Path

from plugin.link.consts import const
from plugin.link.domain.models.manager import get_redis_engine
from plugin.link.domain.models.utils import RedisService
from sqlalchemy.exc import OperationalError

from alembic import command  # type: ignore[attr-defined]
from alembic.config import Config

# Migration constants
INIT_VERSION = "5c4f1b5ab83d"
LOCK_KEY = "link_database_migration_lock"
LOCK_TTL_SECONDS = int(os.getenv("LINK_DB_MIGRATION_LOCK_TTL", "60"))

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


def _check_db_url() -> None:
    """Check DB URL and validate required env vars."""
    mysql_host = os.getenv(const.MYSQL_HOST_KEY)
    mysql_port = os.getenv(const.MYSQL_PORT_KEY)
    mysql_user = os.getenv(const.MYSQL_USER_KEY)
    mysql_password = os.getenv(const.MYSQL_PASSWORD_KEY)
    mysql_db = os.getenv(const.MYSQL_DB_KEY)

    missing_envs = [
        key
        for key, value in [
            (const.MYSQL_HOST_KEY, mysql_host),
            (const.MYSQL_PORT_KEY, mysql_port),
            (const.MYSQL_USER_KEY, mysql_user),
            (const.MYSQL_PASSWORD_KEY, mysql_password),
            (const.MYSQL_DB_KEY, mysql_db),
        ]
        if not value
    ]
    if missing_envs:
        raise ValueError(
            "Missing required MySQL environment variables for migration: "
            f"{', '.join(missing_envs)}"
        )


def _build_alembic_config(link_dir: Path) -> Config:
    """Build Alembic config from local link module files."""
    alembic_dir = link_dir / "alembic"
    alembic_ini = link_dir / "alembic.ini"
    if not alembic_ini.exists():
        logging.error("alembic.ini not found: %s", alembic_ini)
        raise FileNotFoundError(f"alembic.ini not found: {alembic_ini}")

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(alembic_dir))
    return config


def _get_or_create_redis_service() -> RedisService:
    """Get or create Redis service instance."""
    redis_service = get_redis_engine()
    if redis_service is not None:
        logging.info("redis_service is successfully got from get_redis_engine()")
        return redis_service

    redis_addr = os.getenv(const.REDIS_CLUSTER_ADDR_KEY) or os.getenv(
        const.REDIS_ADDR_KEY
    )
    redis_password = os.getenv(const.REDIS_PASSWORD_KEY)
    if not redis_addr:
        logging.error("Redis address is not set in environment variables")
        raise ValueError("Redis address is not set in environment variables")

    return RedisService(cluster_addr=redis_addr, password=redis_password)


def _handle_migration_error(config: Config, error: OperationalError) -> None:
    """Handle migration operational errors."""
    db_error_code = getattr(error.orig, "args", [None])[0]

    if db_error_code in (
        MYSQL_ERROR_SELECT_DENIED,
        MYSQL_ERROR_ACCESS_DENIED,
        MYSQL_ERROR_EXECUTE_DENIED,
    ):
        logging.warning(
            f"Skip database migration due to insufficient permissions: {error}"
        )
        return

    if db_error_code == MYSQL_ERROR_TABLE_EXISTS:
        logging.warning("Detected legacy database, stamping to init version...")
        try:
            command.stamp(config, INIT_VERSION)
            command.upgrade(config, "head")
        except Exception as stamp_error:
            logging.error(f"Failed to stamp and upgrade legacy database: {stamp_error}")
    else:
        logging.error(f"Database migration failed: {error}")


def _execute_migration(config: Config) -> None:
    """Execute Alembic migration with error handling."""
    try:
        command.upgrade(config, "head")
        logging.info("Database migration success")
    except OperationalError as e:
        _handle_migration_error(config, e)
    except Exception as e:
        logging.error(f"Database migration failed: {e}")


def run_database_migration() -> None:
    """Execute database migration with Redis distributed lock."""
    link_dir = Path(__file__).parent.parent
    config = _build_alembic_config(link_dir)
    _check_db_url()

    redis_service = _get_or_create_redis_service()
    is_locked = redis_service.setnx(LOCK_KEY, "locked", ex=LOCK_TTL_SECONDS)

    if not is_locked:
        logging.info(
            "Skip migration because another instance is holding migration lock"
        )
        return

    _execute_migration(config)
