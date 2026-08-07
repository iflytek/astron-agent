"""Data transfer objects for deprecated community management tool operations.

This module contains Pydantic models for handling tool manager requests and responses
in the deprecated community management API.
"""

from pydantic import BaseModel


class ToolManagerHeader(BaseModel):
    """Header information for tool manager requests.

    Contains application identification data required for tool management operations.
    """

    app_id: str


class ToolManagerPayload(BaseModel):
    """Payload data for tool manager requests.

    Contains the list of tools to be processed in the management operation.
    """

    tools: list[dict]


class ToolManagerRequest(BaseModel):
    """Complete tool manager request structure.

    Combines header and payload information for tool management API calls.
    """

    header: ToolManagerHeader
    payload: ToolManagerPayload


class ToolManagerResponse(BaseModel):
    """Response structure for tool manager operations.

    Contains status info and optional data returned from tool management requests.
    """

    code: int
    message: str
    sid: str
    data: dict | None = None
