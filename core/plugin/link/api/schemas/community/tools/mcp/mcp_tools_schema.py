"""MCP (Model Context Protocol) tools data transfer objects.

This module contains Pydantic models for MCP tool operations including
tool listing and tool execution requests and responses.
"""

from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Discriminator, Field, Tag


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
    """Base MCP content block.

    Unknown protocol fields are preserved (``extra="allow"``) so newer
    servers do not lose data when passing through the plugin link.
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    type: str
    annotations: dict[str, Any] | None = None
    meta: dict[str, Any] | None = Field(default=None, alias="_meta")


class MCPTextBlock(MCPContentBlock):
    type: Literal["text"] = "text"
    text: str


class MCPImageBlock(MCPContentBlock):
    type: Literal["image"] = "image"
    data: str
    mimeType: str
    mineType: str | None = Field(
        default=None,
        description=(
            "Deprecated misspelling of mimeType, kept for clients of the previous "
            "response schema. Read mimeType instead; mineType will be removed."
        ),
    )


class MCPAudioBlock(MCPContentBlock):
    type: Literal["audio"] = "audio"
    data: str
    mimeType: str


class MCPResourceContents(BaseModel):
    """Embedded resource contents: exactly one of ``text`` or ``blob``."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    uri: str
    mimeType: str | None = None
    text: str | None = None
    blob: str | None = None
    meta: dict[str, Any] | None = Field(default=None, alias="_meta")


class MCPEmbeddedResourceBlock(MCPContentBlock):
    type: Literal["resource"] = "resource"
    resource: MCPResourceContents


class MCPResourceLinkBlock(MCPContentBlock):
    type: Literal["resource_link"] = "resource_link"
    uri: str
    name: str
    title: str | None = None
    description: str | None = None
    mimeType: str | None = None
    size: int | None = None


class MCPUnsupportedBlock(MCPContentBlock):
    """A content block type this service does not model yet.

    It is passed through with all of its fields and flagged explicitly
    instead of being dropped.
    """

    unsupported: bool = True


KNOWN_CONTENT_TYPES = frozenset({"text", "image", "audio", "resource", "resource_link"})


def _content_tag(value: Any) -> str:
    block_type = (
        value.get("type") if isinstance(value, dict) else getattr(value, "type", None)
    )
    return block_type if block_type in KNOWN_CONTENT_TYPES else "unsupported"


MCPContent = Annotated[
    Annotated[MCPTextBlock, Tag("text")]
    | Annotated[MCPImageBlock, Tag("image")]
    | Annotated[MCPAudioBlock, Tag("audio")]
    | Annotated[MCPEmbeddedResourceBlock, Tag("resource")]
    | Annotated[MCPResourceLinkBlock, Tag("resource_link")]
    | Annotated[MCPUnsupportedBlock, Tag("unsupported")],
    Discriminator(_content_tag),
]


class MCPResultTruncation(BaseModel):
    """Explains which parts of a tool result were withheld by size limits."""

    reason: Literal["max_blocks", "max_bytes"]
    maxBlocks: int
    maxBytes: int
    originalBlockCount: int
    returnedBlockCount: int
    structuredContentOmitted: bool = False


class MCPCallToolData(BaseModel):
    """Data payload for MCP tool execution response.

    ``isError`` is the tool-level error flag reported by the MCP server; it
    is independent of the envelope ``code``, which reports transport and
    session failures.
    """

    model_config = ConfigDict(populate_by_name=True)

    isError: bool | None = None
    content: list[MCPContent] | None = None
    structuredContent: dict[str, Any] | None = None
    meta: dict[str, Any] | None = Field(default=None, alias="_meta")
    truncation: MCPResultTruncation | None = None


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
