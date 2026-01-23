import os

from loguru import logger
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# Import all models for SQLModel metadata registration
from workflow.configs import workflow_config
from workflow.domain.models.ai_app import App
from workflow.domain.models.app_source import AppSource
from workflow.domain.models.flow import Flow
from workflow.domain.models.history import History
from workflow.domain.models.license import License

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def get_database_url():
    host = os.getenv("MYSQL_HOST")
    port = os.getenv("MYSQL_PORT")
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DB")
    database_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
    return database_url


config.set_main_option("sqlalchemy.url", get_database_url())


def get_metadata():
    return SQLModel.metadata


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "foreign_key_constraint":
        return False
    return True


def run_migrations_offline():
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
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
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
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
