import os
import sys
from pathlib import Path
from typing import Literal

from loguru import logger
from sqlalchemy import engine_from_config, pool
from sqlalchemy.sql.schema import SchemaItem
from sqlmodel import SQLModel

from alembic import context  # type: ignore[attr-defined]

alembic_env_path = Path(__file__).resolve()
alembic_dir = alembic_env_path.parent
database_dir = alembic_dir.parent
memory_dir = database_dir.parent
project_root = memory_dir.parent

sys.path.append(str(project_root))

try:
    # Import all models for SQLModel metadata registration
    from memory.database.domain.models.database_meta import DatabaseMeta  # noqa: F401
    from memory.database.domain.models.schema_meta import SchemaMeta  # noqa: F401

    print("✅ SQLModel and models load success!")
except ImportError as e:
    print(f"❌ load failed: {e}")
    sys.exit(1)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def get_database_url() -> str:
    user = os.getenv("PGSQL_USER", "")
    password = os.getenv("PGSQL_PASSWORD", "")
    database = os.getenv("PGSQL_DATABASE", "")
    host = os.getenv("PGSQL_HOST", "")
    port = int(os.getenv("PGSQL_PORT", ""))
    # Use psycopg2 (sync) driver for Alembic migrations instead of asyncpg
    database_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"
    return database_url


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
    """
    Determine whether to include a schema object in migration.

    :param object: The schema object
    :param name: The name of the object
    :param type_: The type of schema object
    :param reflected: Whether the object was reflected from the database
    :param compare_to: The object to compare to (if any)
    :return: True if the object should be included, False otherwise
    """
    if type_ == "foreign_key_constraint":
        return False

    # Only include objects from sparkdb_manager schema
    if type_ == "schema":
        return name == "sparkdb_manager"

    # For table objects, check the schema
    if type_ == "table" and hasattr(object, "schema"):
        return object.schema == "sparkdb_manager"

    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        version_table_schema="sparkdb_manager",
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context: object, revision: object, directives: list) -> None:  # type: ignore[no-untyped-def]
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
            version_table_schema="sparkdb_manager",
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
