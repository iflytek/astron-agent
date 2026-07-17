"""init

Revision ID: 5c4f1b5ab83d
Revises:
Create Date: 2026-03-06 02:57:51.383278

"""

from typing import Sequence, Union

import sqlalchemy as sa
from plugin.link.alembic.default_tools import DEFAULT_TOOL_INSERT_STATEMENTS

from alembic import op  # type: ignore[attr-defined]

# revision identifiers, used by Alembic.
revision: str = "5c4f1b5ab83d"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tools_schema",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "app_id", sa.String(length=32), nullable=True, comment="Application ID"
        ),
        sa.Column("tool_id", sa.String(length=32), nullable=True, comment="Tool ID"),
        sa.Column("name", sa.String(length=128), nullable=True, comment="Tool name"),
        sa.Column(
            "description",
            sa.String(length=512),
            nullable=True,
            comment="Tool description",
        ),
        sa.Column(
            "open_api_schema",
            sa.Text(),
            nullable=True,
            comment="OpenAPI schema, JSON format",
        ),
        sa.Column(
            "create_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "update_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "mcp_server_url",
            sa.String(length=255),
            nullable=True,
            comment="mcp_server_url",
        ),
        sa.Column("schema", sa.Text(), nullable=True, comment="Schema, JSON format"),
        sa.Column(
            "version",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'V1.0'"),
            comment="Version number",
        ),
        sa.Column(
            "is_deleted",
            sa.BigInteger(),
            nullable=False,
            server_default=sa.text("'0'"),
            comment="Is deleted",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tool_id", "version", "is_deleted", name="unique_tool_version"
        ),
    )

    for statement in DEFAULT_TOOL_INSERT_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    op.drop_table("tools_schema")
