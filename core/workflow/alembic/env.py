"""
Alembic环境配置文件
"""

import logging
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# 导入workflow配置系统，确保环境变量已正确加载
from workflow.configs import workflow_config  # noqa: F401

# 导入所有模型，确保SQLModel能够识别所有表结构
from workflow.domain.models.ai_app import App
from workflow.domain.models.app_source import AppSource
from workflow.domain.models.flow import Flow
from workflow.domain.models.history import History
from workflow.domain.models.license import License

# Alembic Config对象，提供对.ini文件值的访问
config = context.config

# 解释Python日志配置文件
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger("alembic.env")


# 设置MetaData对象供'autogenerate'支持
# 从SQLModel中获取所有表的元数据
def get_metadata():
    """获取所有模型的元数据"""
    return SQLModel.metadata


target_metadata = get_metadata()


def get_database_url() -> str:
    """
    从workflow配置系统获取数据库连接URL
    """
    # 首先尝试从环境变量获取完整URL
    mysql_url = os.getenv("MYSQL_URL")
    if mysql_url:
        # 转义%符号，避免alembic配置解析问题
        logger.info(f"Using MYSQL_URL from environment")
        return mysql_url.replace("%", "%%")

    # 从各个组件构建URL（与DatabaseServiceFactory保持一致）
    mysql_host = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_user = os.getenv("MYSQL_USER", "admin")
    mysql_password = os.getenv("MYSQL_PASSWORD", "admin")
    mysql_db = os.getenv("MYSQL_DB", "workflow")

    logger.info(
        f"Building database URL from components: {mysql_user}@{mysql_host}:{mysql_port}/{mysql_db}"
    )

    # 构建URL并转义%符号
    url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
    return url.replace("%", "%%")


def include_object(object, name, type_, reflected, compare_to):
    """
    决定哪些数据库对象应该包含在迁移中
    Args:
        object: 数据库对象
        name: 对象名称
        type_: 对象类型
        reflected: 是否从数据库反射得到
        compare_to: 比较目标

    Returns:
        bool: 是否包含该对象
    """
    if type_ == "foreign_key_constraint":
        return False
    return True


def run_migrations_offline() -> None:
    """
    在'离线'模式下运行迁移

    这种模式下，只需要配置URL而不需要实际的数据库连接。
    生成的SQL脚本可以直接在数据库上执行。
    适用于生成SQL脚本供DBA审核的场景。
    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    在'在线'模式下运行迁移

    这种模式下需要创建实际的数据库连接，并在该连接上运行迁移。
    适用于直接对数据库进行迁移的场景。
    """

    def process_revision_directives(context, revision, directives):
        """
        处理修订指令的回调函数

        当使用autogenerate且没有检测到schema变更时，防止生成空的迁移文件
        参考：http://alembic.zzzcomputing.com/en/latest/cookbook.html
        """
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    # 获取数据库URL并设置到配置中
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()

    # 创建连接引擎
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # 对于迁移，使用NullPool避免连接池问题
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives,
            include_object=include_object,
            # 比较类型，确保检测到类型变更
            compare_type=True,
            # 比较服务器默认值
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# 根据上下文选择运行模式
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
