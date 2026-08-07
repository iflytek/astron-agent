"""Data transfer objects for MCP (Model Context Protocol) manager operations.

This module defines Pydantic models for handling MCP manager requests and responses
in the enterprise extension API.
"""

from pydantic import BaseModel


class MCPManagerRequest(BaseModel):
    """Request model for MCP manager operations.

    Defines the structure for requests to create or manage MCP server configurations,
    including application details, server connection information, and flow associations.
    """

    app_id: str
    name: str
    description: str
    mcp_schema: str = ""
    mcp_server_url: str = ""
    type: str
    flow_id: str = ""


class MCPManagerResponse(BaseModel):
    """Response model for MCP manager operations.

    Defines the structure for responses from MCP manager operations, including
    status codes, messages, session identifiers, and optional data payloads.
    """

    code: int
    message: str
    sid: str
    data: dict | None = None
