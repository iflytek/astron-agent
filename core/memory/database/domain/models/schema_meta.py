"""Module defining the SchemaMeta model for database schema metadata management."""

from datetime import datetime
from typing import Optional

from common.utils.snowfake import get_id
from memory.database.domain.models.base import SQLModelSerializable
from memory.database.repository.middleware.adapters import get_adapter
from sqlalchemy import BigInteger, Column
from sqlmodel import Field


def _get_table_args() -> dict:
    """Get table_args based on the configured database adapter."""
    return get_adapter().get_model_table_args()


class SchemaMeta(
    SQLModelSerializable, table=True  # type: ignore[call-arg]
):  # pylint: disable=too-few-public-methods
    """Database schema metadata model representing schema information and ownership.

    Attributes:
        id: Primary key identifier (auto-generated)
        database_id: Reference to the parent database ID
        schema_name: Name of the schema
        create_at: Timestamp of creation
        update_at: Timestamp of last update
        create_by: Creator identifier
        update_by: Last updater identifier
    """

    __tablename__ = "schema_meta"
    __table_args__ = _get_table_args()
    id: int = Field(
        default_factory=get_id, sa_column=Column(BigInteger, primary_key=True)
    )
    database_id: str = Field(sa_column=Column(BigInteger, nullable=False))
    schema_name: Optional[str] = Field(default="", index=True)
    create_at: datetime = Field(default_factory=datetime.now)
    update_at: datetime = Field(default_factory=datetime.now)
    create_by: Optional[str] = Field(default="")
    update_by: Optional[str] = Field(default="")
