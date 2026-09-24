"""MCP (Model Context Protocol) tools API endpoints.

This module provides API endpoints for interacting with MCP tools,
including listing available tools and calling specific MCP tool functions.
"""

from fastapi import APIRouter, Body
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolRequest,
    MCPCallToolResponse,
    MCPGetPromptRequest,
    MCPListPromptsRequest,
    MCPListResourcesRequest,
    MCPProtocolResponse,
    MCPReadResourceRequest,
    MCPToolListRequest,
    MCPToolListResponse,
)
from plugin.link.service.community.tools.mcp.mcp_server import (
    call_tool,
    get_prompt,
    list_prompts,
    list_resources,
    read_resource,
    tool_list,
)

# MCP tools router
mcp_router = APIRouter(tags=["mcp tools api"])


@mcp_router.post("/mcp/tool_list", response_model_exclude_none=True)
async def tool_list_api(list_info: MCPToolListRequest = Body()) -> MCPToolListResponse:
    """
    Call MCP tool's tool list
    """
    return await tool_list(list_info=list_info)


@mcp_router.post("/mcp/call_tool", response_model_exclude_none=True)
async def call_tool_api(call_info: MCPCallToolRequest = Body()) -> MCPCallToolResponse:
    """
    Call MCP tool's call tool
    """
    return await call_tool(call_info=call_info)


@mcp_router.post("/mcp/list_resources", response_model_exclude_none=True)
async def list_resources_api(
    request: MCPListResourcesRequest = Body(),
) -> MCPProtocolResponse:
    return await list_resources(request=request)


@mcp_router.post("/mcp/read_resource", response_model_exclude_none=True)
async def read_resource_api(
    request: MCPReadResourceRequest = Body(),
) -> MCPProtocolResponse:
    return await read_resource(request=request)


@mcp_router.post("/mcp/list_prompts", response_model_exclude_none=True)
async def list_prompts_api(
    request: MCPListPromptsRequest = Body(),
) -> MCPProtocolResponse:
    return await list_prompts(request=request)


@mcp_router.post("/mcp/get_prompt", response_model_exclude_none=True)
async def get_prompt_api(request: MCPGetPromptRequest = Body()) -> MCPProtocolResponse:
    return await get_prompt(request=request)
