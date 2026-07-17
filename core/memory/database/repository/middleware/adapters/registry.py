"""Adapter registry for selecting and managing database adapters."""

import os
from typing import Optional

from memory.database.repository.middleware.adapters.base import DatabaseAdapter

_adapter_instance: Optional[DatabaseAdapter] = None


def get_adapter() -> DatabaseAdapter:
    """Get the configured database adapter based on DB_TYPE environment variable.

    Returns:
        DatabaseAdapter: The configured database adapter instance.

    Raises:
        ValueError: If DB_TYPE is not a supported database type.
    """
    global _adapter_instance  # noqa: PLW0603

    if _adapter_instance is not None:
        return _adapter_instance

    db_type = os.getenv("DB_TYPE", "postgresql").lower()

    if db_type == "postgresql":
        from memory.database.repository.middleware.adapters.postgresql_adapter import (
            PostgreSQLAdapter,
        )

        _adapter_instance = PostgreSQLAdapter()
    elif db_type == "mysql":
        from memory.database.repository.middleware.adapters.mysql_adapter import (
            MySQLAdapter,
        )

        _adapter_instance = MySQLAdapter()
    else:
        raise ValueError(
            f"Unsupported DB_TYPE: '{db_type}'. Supported types: postgresql, mysql"
        )

    return _adapter_instance


def reset_adapter() -> None:
    """Reset the cached adapter instance. Useful for testing."""
    global _adapter_instance  # noqa: PLW0603
    _adapter_instance = None
