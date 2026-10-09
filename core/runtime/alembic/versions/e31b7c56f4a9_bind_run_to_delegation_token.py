"""bind run creation to a delegation token

Revision ID: e31b7c56f4a9
Revises: c940d359a82b
Create Date: 2026-10-09 18:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "e31b7c56f4a9"
down_revision: Union[str, None] = "c940d359a82b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_runs",
        sa.Column("delegation_issuer", sa.String(length=256), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column("delegation_jti", sa.String(length=256), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE agent_runs SET delegation_issuer = 'legacy', "
            "delegation_jti = 'legacy-' || id"
        )
    )
    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.alter_column("delegation_issuer", nullable=False)
        batch_op.alter_column("delegation_jti", nullable=False)
        batch_op.create_unique_constraint(
            "uq_run_delegation_token", ["delegation_issuer", "delegation_jti"]
        )


def downgrade() -> None:
    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.drop_constraint("uq_run_delegation_token", type_="unique")
        batch_op.drop_column("delegation_jti")
        batch_op.drop_column("delegation_issuer")
