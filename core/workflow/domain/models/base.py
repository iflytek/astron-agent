"""
Base domain model with enhanced serialization capabilities.

This module provides a base SQLModel class with optimized JSON serialization
using orjson for better performance and custom serialization options.
"""

from typing import Any, Optional

import orjson
from sqlmodel import SQLModel  # type: ignore


def orjson_dumps(
    v: Any, *, default: Any = None, sort_keys: bool = False, indent_2: bool = True
) -> str:
    """
    Serialize Python objects to JSON string using orjson with custom options.

    :param v: Object to serialize
    :param default: Default function for non-serializable objects
    :param sort_keys: Whether to sort dictionary keys
    :param indent_2: Whether to use 2-space indentation
    :return: JSON string representation
    """
    option = orjson.OPT_SORT_KEYS if sort_keys else None
    if indent_2:
        if option is None:
            option = orjson.OPT_INDENT_2
        else:
            option |= orjson.OPT_INDENT_2
    if default is None:
        return orjson.dumps(v, option=option).decode()
    return orjson.dumps(v, default=default, option=option).decode()


class SQLModelSerializable(SQLModel):
    """
    Enhanced SQLModel base class with optimized JSON serialization.

    This class extends SQLModel with custom JSON serialization using orjson
    for improved performance and additional serialization options.
    """

    class Config:
        """Configuration for the SQLModel."""

        from_attributes = True

    def json(self, **kwargs: Any) -> str:
        """
        Serialize the model instance to JSON string.

        :param kwargs: Additional arguments passed to dict() method
        :return: JSON string representation of the model
        """
        return orjson_dumps(self.dict(**kwargs))

    @classmethod
    def parse_raw(
        cls,
        b: str | bytes,
        *,
        content_type: Optional[str] = None,
        encoding: str = "utf8",
        allow_pickle: bool = False,
        **kwargs: Any,
    ) -> "SQLModelSerializable":
        """
        Parse raw JSON data into a model instance.

        :param b: Raw JSON data as string or bytes
        :param content_type: Content type (unused, kept for compatibility)
        :param encoding: Text encoding (unused, kept for compatibility)
        :param allow_pickle: Whether to allow pickle (unused, kept for compatibility)
        :param kwargs: Additional arguments passed to model_validate()
        :return: Parsed model instance
        """
        return cls.model_validate(orjson.loads(b))
