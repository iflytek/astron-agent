"""HTTP execution DTO definitions for community tools.

This module defines Pydantic data transfer objects (DTOs) used for HTTP-based
tool execution requests and responses within the community tools framework.
"""

from typing import Any, Dict, Optional

from pydantic import BaseModel


class HttpRunHeader(BaseModel):
    """Header information for HTTP tool execution requests.

    Contains authentication and identification data required for tool execution.
    """

    app_id: str
    uid: str | None = None


class HttpRunParameter(BaseModel):
    """Parameters for HTTP tool execution.

    Specifies which tool, operation, and version to execute.
    """

    tool_id: Optional[str] = None
    operation_id: Optional[str] = None
    version: Optional[str] = None


class HttpRunPayload(BaseModel):
    """Payload data for HTTP tool execution.

    Contains the actual message or data to be processed by the tool.
    """

    message: Optional[Dict[Any, Any]] = None


class HttpRunRequest(BaseModel):
    """Complete HTTP tool execution request.

    Combines header, parameter, and payload information for tool execution.
    """

    header: Optional[HttpRunHeader] = None
    parameter: Optional[HttpRunParameter] = None
    payload: Optional[HttpRunPayload] = None


class HttpRunResponseHeader(BaseModel):
    """Header information for HTTP tool execution responses.

    Contains response status, message, and session identifier.
    """

    code: int
    message: str
    sid: str


class HttpRunResponse(BaseModel):
    """Complete HTTP tool execution response.

    Contains both header information and the actual response payload.
    """

    header: HttpRunResponseHeader
    payload: dict


class ToolDebugRequest(BaseModel):
    """Request data for tool debugging operations.

    Contains HTTP request details and OpenAPI schema for debugging purposes.
    """

    server: Optional[str] = None
    method: Optional[str] = None
    path: Optional[Dict[Any, Any]] = None
    query: Optional[Dict[Any, Any]] = None
    header: Optional[Dict[Any, Any]] = None
    body: Optional[Dict[Any, Any]] = None
    openapi_schema: str = ""


class ToolDebugResponseHeader(BaseModel):
    """Header information for tool debugging responses.

    Contains debug operation status, message, and session identifier.
    """

    code: int
    message: str
    sid: str


class ToolDebugResponse(BaseModel):
    """Complete tool debugging response.

    Contains both header information and debugging payload data.
    """

    header: ToolDebugResponseHeader
    payload: dict
