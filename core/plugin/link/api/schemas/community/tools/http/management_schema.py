"""Data transfer objects for tool management API endpoints.

This module contains Pydantic models used for serializing and deserializing
data in tool management operations including creation, updates, and responses.
"""

from pydantic import BaseModel


class ToolManagerHeader(BaseModel):
    """Header information for tool management requests.

    Contains authentication and identification data required for tool operations.
    """

    app_id: str


class CreateInfo(BaseModel):
    """
    description: 新增工具
    """

    name: str | None = None
    description: str | None = None
    schema_type: int | None = None
    openapi_schema: str | None = None


class UpdateInfo(BaseModel):
    """
    description: 更新工具
    """

    id: str | None = None
    name: str | None = None
    version: str | None = None
    description: str | None = None
    schema_type: int | None = None
    openapi_schema: str | None = None


class ToolCreatePayload(BaseModel):
    """Payload containing tools to be created.

    Wraps a list of CreateInfo objects for batch tool creation operations.
    """

    tools: list[CreateInfo]


class ToolUpdatePayload(BaseModel):
    """Payload containing tools to be updated.

    Wraps a list of UpdateInfo objects for batch tool update operations.
    """

    tools: list[UpdateInfo]


class ToolCreateRequest(BaseModel):
    """Complete request structure for creating tools.

    Combines header information with the payload of tools to be created.
    """

    header: ToolManagerHeader
    payload: ToolCreatePayload


class ToolUpdateRequest(BaseModel):
    """Complete request structure for updating tools.

    Combines header information with the payload of tools to be updated.
    """

    header: ToolManagerHeader
    payload: ToolUpdatePayload


class ToolManagerResponse(BaseModel):
    """Standard response structure for tool management operations.

    Contains operation result code, message, session ID, and optional data.
    """

    code: int
    message: str
    sid: str
    data: dict | None = None
