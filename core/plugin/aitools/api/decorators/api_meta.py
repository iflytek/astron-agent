"""
ApiMeta module for defining API metadata such as
method, path, query, body, response, summary, description, tags,
and deprecated.
"""

# pylint: disable=too-many-instance-attributes
from dataclasses import dataclass
from typing import Generic, Literal, Optional, Type, TypeVar

from plugin.aitools.api.schemas.types import BaseResponse
from pydantic import BaseModel

QueryT = TypeVar("QueryT", bound=BaseModel)
BodyT = TypeVar("BodyT", bound=BaseModel)
RespT = TypeVar("RespT", bound=BaseResponse)


@dataclass(frozen=True)
class ApiMeta(Generic[QueryT, BodyT, RespT]):
    """HTTP API metadata."""

    method: str
    path: str
    query: Optional[Type[QueryT]] = None
    body: Optional[Type[BodyT]] = None
    response: Optional[Type[RespT]] = None

    # API metadata
    summary: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[
        Literal["public_cn", "public_global", "local", "intranet", "unclassified"]
    ] = None

    # API configuration
    deprecated: bool = False
