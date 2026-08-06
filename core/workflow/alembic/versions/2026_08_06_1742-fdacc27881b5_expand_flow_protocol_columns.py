"""expand flow protocol columns

Use MySQL LONGTEXT for serialized workflow protocols instead of the 64 KiB TEXT
limit. The Core payload includes wrapper fields and JSON escaping beyond the
Console's protocol-data byte limit, so LONGTEXT preserves that serialization
headroom.

Revision ID: fdacc27881b5
Revises: b13356244aea
Create Date: 2026-08-06 17:42:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op  # type: ignore[attr-defined]

# revision identifiers, used by Alembic.
revision: str = "fdacc27881b5"
down_revision: Union[str, None] = "b13356244aea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PROTOCOL_COLUMN_COMMENTS = {
    "data": "编排标准协议",
    "release_data": "发布后的数据",
}


def upgrade() -> None:
    for column_name, comment in _PROTOCOL_COLUMN_COMMENTS.items():
        op.alter_column(
            "flow",
            column_name,
            existing_type=sa.Text(),
            type_=mysql.LONGTEXT(),
            existing_nullable=True,
            existing_server_default=None,
            existing_comment=comment,
        )


def downgrade() -> None:
    # Once a protocol larger than 65,535 bytes is stored, shrinking these columns
    # can fail or truncate data depending on MySQL SQL mode. Keeping LONGTEXT is
    # backward-compatible with older application code, so this schema migration is
    # deliberately irreversible rather than risking protocol corruption.
    raise RuntimeError(
        "This migration is irreversible: flow.data and flow.release_data may contain "
        "values that do not fit in MySQL TEXT."
    )
