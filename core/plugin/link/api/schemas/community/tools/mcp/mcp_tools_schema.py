"""MCP (Model Context Protocol) tools data transfer objects.

This module contains Pydantic models for MCP tool operations including
tool listing and tool execution requests and responses.
"""

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict


class MCPTransport(str, Enum):
    """Supported transports for connecting to an MCP server."""

    AUTO = "auto"
    STREAMABLE_HTTP = "streamable_http"
    SSE = "sse"


# MCPToolList Request and Response
class MCPToolListRequest(BaseModel):
    """Request model for listing available MCP tools from servers.

    Allows filtering by specific server IDs or URLs to get tools from
    particular MCP servers.
    """

    mcp_server_ids: list[str] | None = None
    mcp_server_urls: list[str] | None = None
    transport: MCPTransport = MCPTransport.AUTO


class MCPInfo(BaseModel):
    """Information about an individual MCP tool.

    Contains the tool's name, description, and input schema definition.
    """

    name: str
    description: str | None = None
    inputSchema: Any | None = None


class MCPItemInfo(BaseModel):
    """Information about an MCP server and its available tools.

    Includes server identification, status, and the list of tools
    available from that server.
    """

    server_id: str | None = None
    server_url: str | None = None
    server_status: int
    server_message: str
    tools: list[MCPInfo] | None = None


class MCPToolListData(BaseModel):
    """Data payload for MCP tool list response.

    Contains the list of MCP servers and their tool information.
    """

    servers: list[MCPItemInfo] | None = None


class MCPToolListResponse(BaseModel):
    """Complete response for MCP tool listing requests.

    Standard API response format with code, message, session ID,
    and the tool list data payload.
    """

    code: int
    message: str
    sid: str
    data: MCPToolListData


# MCPCallTool Request and Response
class MCPCallToolRequest(BaseModel):
    """Request model for calling/executing an MCP tool.

    Specifies the target server, tool name, and arguments for
    tool execution.
    """

    mcp_server_id: str | None = None
    mcp_server_url: str | None = None
    tool_name: str
    tool_args: dict[str, Any] | None = None
    transport: MCPTransport = MCPTransport.AUTO


class MCPContentBlock(BaseModel):
    """Forward-compatible MCP content block that preserves protocol fields."""

    model_config = ConfigDict(extra="allow")

    type: str


class MCPCallToolData(BaseModel):
    """Data payload for MCP tool execution response.

    Contains execution status and content (text or image responses)
    from the tool call.
    """

    isError: bool | None = None
    content: list[MCPContentBlock] | None = None
    structuredContent: dict[str, Any] | None = None


class MCPCallToolResponse(BaseModel):
    """Complete response for MCP tool execution requests.

    Standard API response format with code, message, session ID,
    and the tool execution data payload.
    """

    code: int
    message: str
    sid: str
    data: MCPCallToolData


class MCPSingleServerRequest(BaseModel):
    """Select one MCP server for resource or prompt operations."""

    mcp_server_id: str | None = None
    mcp_server_url: str | None = None
    transport: MCPTransport = MCPTransport.AUTO


class MCPListResourcesRequest(MCPSingleServerRequest):
    cursor: str | None = None


class MCPReadResourceRequest(MCPSingleServerRequest):
    uri: str


class MCPListPromptsRequest(MCPSingleServerRequest):
    cursor: str | None = None


class MCPGetPromptRequest(MCPSingleServerRequest):
    name: str
    arguments: dict[str, str] | None = None


class MCPProtocolResponse(BaseModel):
    """Envelope for resource and prompt SDK results."""

    code: int
    message: str
    sid: str
    data: dict[str, Any] | None = None
