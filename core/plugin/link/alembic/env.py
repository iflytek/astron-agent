import os
import sys
from pathlib import Path
from typing import Literal

from loguru import logger
from plugin.link.domain.entity.tool_schema import Tools  # noqa: F401
from sqlalchemy import engine_from_config, pool
from sqlalchemy.sql.schema import SchemaItem
from sqlmodel import SQLModel

from alembic import context

project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def get_database_url() -> str:
    host = os.getenv("MYSQL_HOST")
    port = os.getenv("MYSQL_PORT")
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DB")

    missing = [
        key
        for key, value in [
            ("MYSQL_HOST", host),
            ("MYSQL_PORT", port),
            ("MYSQL_USER", user),
            ("MYSQL_PASSWORD", password),
            ("MYSQL_DB", db),
        ]
        if not value
    ]
    if missing:
        raise ValueError(
            "Missing required environment variables for Alembic: " + ", ".join(missing)
        )

    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"


config.set_main_option("sqlalchemy.url", get_database_url())


def get_metadata():  # type: ignore[no-untyped-def]
    return SQLModel.metadata


def include_object(
    object: SchemaItem,
    name: str | None,
    type_: Literal[
        "schema",
        "table",
        "column",
        "index",
        "unique_constraint",
        "foreign_key_constraint",
    ],
    reflected: bool,
    compare_to: SchemaItem | None,
) -> bool:
    if type_ == "foreign_key_constraint":
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        transaction_per_migration=False,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    def process_revision_directives(
        context: object, revision: object, directives: list
    ) -> None:  # type: ignore[no-untyped-def]
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    configuration = config.get_section(config.config_ini_section) or {}

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            process_revision_directives=process_revision_directives,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
            transaction_per_migration=False,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
