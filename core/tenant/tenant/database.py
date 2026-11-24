"""MySQL tables, migration history and startup credential reconciliation."""

import hmac
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Connection,
    DateTime,
    Engine,
    MetaData,
    String,
    Table,
    create_engine,
    func,
    select,
    text,
)
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.pool import NullPool

from .config import (
    LEGACY_TENANT_KEY,
    LEGACY_TENANT_SECRET,
    BootstrapCredentials,
    Settings,
)
from .schema import INITIAL_SCHEMA

LOGGER = logging.getLogger(__name__)
MIGRATION_VERSION = "20260326_0001"
MIGRATION_LOCK = "tenant_database_migration_lock"
MANAGED_CREDENTIAL = "astron-bootstrap-managed-v1"

metadata = MetaData()
apps = Table(
    "tb_app",
    metadata,
    Column("app_id", String, primary_key=True),
    Column("app_name", String),
    Column("dev_id", BigInteger),
    Column("channel_id", String),
    Column("source", String),
    Column("is_disable", Boolean),
    Column("app_desc", String),
    Column("is_delete", Boolean),
    Column("registration_time", DateTime),
    Column("update_time", DateTime),
    Column("extend", String),
)
keys = Table(
    "tb_auth",
    metadata,
    Column("app_id", String, primary_key=True),
    Column("api_key", String, primary_key=True),
    Column("api_secret", String),
    Column("source", BigInteger),
    Column("is_delete", Boolean),
    Column("registration_time", DateTime),
    Column("update_time", DateTime),
    Column("extend", String),
)


class StartupError(RuntimeError):
    """Startup error safe to report to operators."""


def open_database(settings: Settings) -> Engine:
    """Create the database if needed and reconcile it before serving requests."""
    admin = create_engine(
        settings.database.set(database=""),
        poolclass=NullPool,
        hide_parameters=True,
        connect_args=settings.connect_args,
    )
    try:
        with admin.begin() as connection:
            name = connection.dialect.identifier_preparer.quote_identifier(
                settings.database.database or ""
            )
            connection.exec_driver_sql(f"CREATE DATABASE IF NOT EXISTS {name}")
    finally:
        admin.dispose()

    # QueuePool uses zero for an unlimited pool. NullPool handles a request
    # to retain no idle connections when there is also no open-connection cap.
    idle = max(1, settings.max_idle)
    if settings.max_open > 0:
        idle = min(idle, settings.max_open)
    pool_options: dict[str, Any] = {
        "pool_size": idle,
        "max_overflow": settings.max_open - idle if settings.max_open > 0 else -1,
    }
    if settings.max_idle <= 0 and settings.max_open <= 0:
        pool_options = {"poolclass": NullPool}
    engine = create_engine(
        settings.database,
        hide_parameters=True,
        pool_pre_ping=True,
        connect_args=settings.connect_args,
        **pool_options,
    )
    try:
        migrate(engine)
        with engine.begin() as connection:
            reconcile_bootstrap(connection, settings.bootstrap)
    except BaseException:
        engine.dispose()
        raise
    LOGGER.info("Tenant schema and startup credentials reconciled")
    return engine


def migrate(engine: Engine) -> None:
    with engine.connect() as connection:
        lock = {"name": MIGRATION_LOCK}
        acquired = connection.scalar(text("SELECT GET_LOCK(:name, 60)"), lock)
        if acquired != 1:
            raise StartupError("could not acquire Tenant migration lock")
        try:
            apply_initial_migration(connection)
            connection.commit()
        finally:
            # Advisory locks belong to the physical connection, independent
            # of transaction boundaries and connection pool check-in.
            try:
                connection.execute(text("SELECT RELEASE_LOCK(:name)"), lock)
            except Exception:
                connection.invalidate()
                raise


def apply_initial_migration(connection: Connection) -> None:
    connection.exec_driver_sql(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version varchar(64) NOT NULL PRIMARY KEY,
            description varchar(255) NOT NULL,
            applied_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tenant schema migration history'
        """
    )
    version = {"version": MIGRATION_VERSION}
    if connection.scalar(
        text("SELECT version FROM schema_migrations WHERE version = :version"), version
    ):
        return
    # These original statements are idempotent even if MySQL implicitly
    # committed a previous partial DDL run or this is an unstamped legacy DB.
    for statement in INITIAL_SCHEMA:
        connection.exec_driver_sql(statement)
    connection.execute(
        text(
            "INSERT INTO schema_migrations (version, description) "
            "VALUES (:version, 'init tenant tables and seed data')"
        ),
        version,
    )


def app_lock(connection: Connection, app_id: str) -> dict | None:
    row = (
        connection.execute(
            select(apps).where(apps.c.app_id == app_id).with_for_update()
        )
        .mappings()
        .first()
    )
    return dict(row) if row is not None else None


def reconcile_bootstrap(
    connection: Connection, credentials: BootstrapCredentials
) -> None:
    now = datetime.now().replace(microsecond=0)
    app_id = credentials.app_id
    connection.execute(
        insert(apps)
        .prefix_with("IGNORE")
        .values(
            app_id=app_id,
            app_name="星辰租户",
            dev_id=1,
            channel_id="0",
            source="admin",
            is_disable=False,
            app_desc="星辰租户",
            is_delete=False,
            registration_time=now,
            update_time=now,
            extend="",
        )
    )
    app = app_lock(connection, app_id)
    if app is None or app["is_disable"] is not False or app["is_delete"] is not False:
        raise StartupError("reserved Tenant app is disabled or deleted")

    api_key = credentials.api_key
    collision = connection.scalar(
        select(keys.c.app_id)
        .where(
            keys.c.api_key == api_key,
            keys.c.app_id != app_id,
            keys.c.is_delete.is_(False),
        )
        .limit(1)
        .with_for_update()
    )
    if collision is not None:
        raise StartupError("Tenant startup API key is assigned to another active app")

    unmanaged = connection.execute(
        select(keys.c.api_secret, keys.c.is_delete)
        .where(
            keys.c.app_id == app_id,
            keys.c.api_key == api_key,
            func.coalesce(keys.c["extend"], "") != MANAGED_CREDENTIAL,
        )
        .with_for_update()
    ).first()
    if unmanaged is not None and (
        unmanaged.is_delete is not False
        or unmanaged.api_secret is None
        or not hmac.compare_digest(
            unmanaged.api_secret.encode(), credentials.secret.encode()
        )
    ):
        raise StartupError(
            "Tenant startup API key conflicts with an unmanaged credential"
        )

    connection.execute(
        keys.update()
        .where(
            keys.c.api_key == LEGACY_TENANT_KEY,
            keys.c.api_secret == LEGACY_TENANT_SECRET,
        )
        .values(is_delete=True, update_time=now)
    )
    connection.execute(
        keys.update()
        .where(
            keys.c.app_id == app_id,
            keys.c["extend"] == MANAGED_CREDENTIAL,
            keys.c.api_key != api_key,
        )
        .values(is_delete=True, update_time=now)
    )
    connection.execute(
        insert(keys)
        .values(
            app_id=app_id,
            api_key=api_key,
            api_secret=credentials.secret,
            source=0,
            is_delete=False,
            registration_time=now,
            update_time=now,
            extend=MANAGED_CREDENTIAL,
        )
        .on_duplicate_key_update(
            api_secret=credentials.secret,
            source=0,
            is_delete=False,
            update_time=now,
            extend=MANAGED_CREDENTIAL,
        )
    )
