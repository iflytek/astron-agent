"""MCP execution errors must fail direct workflow nodes."""

import json
from typing import Any

import aiohttp
import pytest

from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.nodes.entities.node_run_result import WorkflowNodeExecutionStatus
from workflow.engine.nodes.mcp.mcp_node import MCPNode
from workflow.extensions.otlp.trace.span import Span


@pytest.mark.asyncio
async def test_mcp_tool_is_error_fails_node(monkeypatch: pytest.MonkeyPatch) -> None:
    class Response:
        status = 200

        async def __aenter__(self) -> "Response":
            return self

        async def __aexit__(self, *args: Any) -> bool:
            return False

        async def text(self) -> str:
            return json.dumps(
                {
                    "code": 0,
                    "message": "success",
                    "data": {"isError": True, "content": []},
                }
            )

    monkeypatch.setenv("MCP_BASE_URL", "https://link.example")
    monkeypatch.setattr(
        aiohttp.ClientSession, "post", lambda *args, **kwargs: Response()
    )
    node = MCPNode(
        node_id="mcp",
        node_type="mcp",
        alias_name="MCP",
        input_identifier=[],
        output_identifier=["output"],
        mcpServerUrl="https://example.com/mcp",
        toolName="echo",
    )
    result = await node.execute(VariablePool([]), Span(uid="user"))
    assert result.status == WorkflowNodeExecutionStatus.FAILED
    assert "execution error" in result.error.message
