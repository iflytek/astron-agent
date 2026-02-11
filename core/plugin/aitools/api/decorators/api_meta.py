"""
ApiMeta module for defining API metadata such as
method, path, query, body, response, summary, description, tags,
and deprecated.
"""

from dataclasses import dataclass
from typing import Any, Generic, List, Literal, Optional, Type, TypeVar

from pydantic import BaseModel

QueryT = TypeVar("QueryT", bound=BaseModel)
BodyT = TypeVar("BodyT", bound=BaseModel)
HeadersT = TypeVar("HeadersT", bound=BaseModel)

Tag = Literal["public_cn", "public_global", "local", "intranet", "unclassified"]


@dataclass(frozen=True)
class ApiMeta(Generic[QueryT, BodyT, HeadersT]):
    """HTTP API metadata."""

    method: str
    path: str
    headers: Optional[Type[HeadersT]] = None
    query: Optional[Type[QueryT]] = None
    body: Optional[Type[BodyT]] = None
    response: Optional[Type[Any]] = None

    # API metadata
    summary: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[Tag]] = None

    # API configuration
    deprecated: bool = False
