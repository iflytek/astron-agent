"""Database adapter module for multi-database support."""

from memory.database.repository.middleware.adapters.registry import get_adapter

__all__ = ["get_adapter"]
