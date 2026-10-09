"""Tests for transport-aware MCP tool listing and execution."""

import importlib
import sys
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mcp import types
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolResponse,
    MCPGetPromptRequest,
    MCPListPromptsRequest,
    MCPListResourcesRequest,
    MCPReadResourceRequest,
    MCPTransport,
)
from plugin.link.service.community.tools.mcp.mcp_content import (
    DEFAULT_MAX_BYTES,
    ResultLimits,
    build_call_tool_data,
)
from plugin.link.service.community.tools.mcp.mcp_transport import MCPTransportError
from plugin.link.utils.errors.code import ErrCode


@pytest.fixture
def mcp_server() -> Iterator[Any]:
    """Import mcp_server with unrelated infrastructure boundaries isolated."""
    module_name = "plugin.link.service.community.tools.mcp.mcp_server"
    previous = sys.modules.pop(module_name, None)
    boundaries = {
        "common.otlp.log_trace.node_trace_log": Mock(NodeTraceLog=Mock, Status=Mock),
        "common.otlp.metrics.meter": Mock(Meter=Mock),
        "common.otlp.trace.span": Mock(Span=Mock),
        "opentelemetry.trace": Mock(Status=Mock, StatusCode=Mock()),
        "plugin.link.domain.models.manager": Mock(get_db_engine=Mock()),
        "plugin.link.infra.kafka_telemetry": Mock(send_telemetry_sync=Mock()),
        "plugin.link.infra.tool_crud.process": Mock(ToolCrudOperation=Mock),
        "plugin.link.utils.security.access_interceptor": Mock(
            is_in_blacklist=Mock(return_value=False),
            is_local_url=Mock(return_value=False),
        ),
    }

    try:
        with patch.dict(sys.modules, boundaries):
            yield importlib.import_module(module_name)
    finally:
        sys.modules.pop(module_name, None)
        if previous is not None:
            sys.modules[module_name] = previous


class FakeResult:
    def __init__(self, value: dict[str, Any]) -> None:
        self.value = value

    def model_dump(self, **_: Any) -> dict[str, Any]:
        return self.value


class FakeSession:
    def __init__(self) -> None:
        self.list_tools = AsyncMock(
            return_value=FakeResult(
                {
                    "tools": [
                        {
                            "name": "echo",
                            "description": "Echo input",
                            "inputSchema": {"type": "object"},
                        }
                    ]
                }
            )
        )
        self.call_tool = AsyncMock(
            return_value=FakeResult(
                {
                    "isError": False,
                    "content": [{"type": "text", "text": "hello"}],
                }
            )
        )
        self.list_resources = AsyncMock(
            return_value=FakeResult(
                {
                    "resources": [{"uri": "gitnexus://repos", "name": "repos"}],
                    "nextCursor": "r2",
                }
            )
        )
        self.read_resource = AsyncMock(
            return_value=FakeResult(
                {
                    "contents": [
                        {
                            "uri": "gitnexus://repos",
                            "mimeType": "application/json",
                            "text": "[]",
                        }
                    ]
                }
            )
        )
        self.list_prompts = AsyncMock(
            return_value=FakeResult(
                {
                    "prompts": [{"name": "detect_impact", "arguments": []}],
                    "nextCursor": "p2",
                }
            )
        )
        self.get_prompt = AsyncMock(
            return_value=FakeResult(
                {
                    "description": "impact",
                    "messages": [
                        {"role": "user", "content": {"type": "text", "text": "review"}}
                    ],
                }
            )
        )


def initialized_session(
    calls: list[tuple[str, MCPTransport]], session: FakeSession
) -> Any:
    @asynccontextmanager
    async def connector(
        url: str, transport: MCPTransport
    ) -> AsyncIterator[tuple[FakeSession, MCPTransport]]:
        calls.append((url, transport))
        yield session, transport

    return connector


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize("transport", [MCPTransport.STREAMABLE_HTTP, MCPTransport.SSE])
async def test_list_tools_uses_selected_initialized_transport(
    monkeypatch: pytest.MonkeyPatch,
    mcp_server: Any,
    transport: MCPTransport,
) -> None:
    calls: list[tuple[str, MCPTransport]] = []
    session = FakeSession()
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session(calls, session)
    )

    result = await mcp_server._connect_and_get_tools(
        "https://example.com/mcp",
        server_url="https://example.com/mcp",
        transport=transport,
    )

    assert calls == [("https://example.com/mcp", transport)]
    assert result.server_status == ErrCode.SUCCESSES.code
    assert result.tools is not None
    assert result.tools[0].name == "echo"
    session.list_tools.assert_awaited_once_with()


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize("transport", [MCPTransport.STREAMABLE_HTTP, MCPTransport.SSE])
async def test_call_tool_uses_selected_initialized_transport(
    monkeypatch: pytest.MonkeyPatch,
    mcp_server: Any,
    transport: MCPTransport,
) -> None:
    calls: list[tuple[str, MCPTransport]] = []
    session = FakeSession()
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session(calls, session)
    )
    span_context = Mock()

    result = await mcp_server._call_mcp_tool(
        "https://example.com/sse",
        "echo",
        {"value": "hello"},
        "session-id",
        span_context,
        Mock(),
        "server-id",
        Mock(),
        transport,
    )

    assert calls == [("https://example.com/sse", transport)]
    assert result.code == ErrCode.SUCCESSES.code
    assert result.data.content is not None
    assert result.data.content[0].type == "text"
    session.call_tool.assert_awaited_once_with("echo", arguments={"value": "hello"})


@pytest.mark.unit
@pytest.mark.asyncio
async def test_call_tool_preserves_structured_and_forward_content(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    session = FakeSession()
    session.call_tool.return_value = FakeResult(
        {
            "isError": False,
            "structuredContent": {"risk": "HIGH"},
            "content": [
                {"type": "audio", "data": "YQ==", "mimeType": "audio/wav"},
                {"type": "resource_link", "uri": "gitnexus://repos", "name": "repos"},
                {"type": "future_block", "value": 7},
                {"type": "image", "data": "aQ==", "mimeType": "image/png"},
            ],
        }
    )
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )

    result = await mcp_server._call_mcp_tool(
        "https://example.com/mcp", "impact", {}, "sid", Mock(), Mock(), "server", Mock()
    )

    assert result.data.structuredContent == {"risk": "HIGH"}
    assert [block.type for block in result.data.content or []] == [
        "audio",
        "resource_link",
        "future_block",
        "image",
    ]
    image = (result.data.content or [])[-1].model_dump()
    assert image["mimeType"] == "image/png"
    assert image["mineType"] == "image/png"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resource_and_prompt_operations_preserve_sdk_payloads(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    session = FakeSession()
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )
    span = MagicMock()
    span.start.return_value.__enter__.return_value = MagicMock()
    monkeypatch.setattr(mcp_server, "Span", MagicMock(return_value=span))
    monkeypatch.setattr(mcp_server, "new_sid", lambda: "sid")
    monkeypatch.setattr(
        mcp_server,
        "_resolve_protocol_url",
        lambda request, context: (ErrCode.SUCCESSES, "https://example.com/mcp"),
    )

    resources = await mcp_server.list_resources(MCPListResourcesRequest(cursor="r1"))
    resource = await mcp_server.read_resource(
        MCPReadResourceRequest(uri="gitnexus://repos")
    )
    prompts = await mcp_server.list_prompts(MCPListPromptsRequest(cursor="p1"))
    prompt = await mcp_server.get_prompt(
        MCPGetPromptRequest(name="detect_impact", arguments={"scope": "all"})
    )

    assert resources.data and resources.data["nextCursor"] == "r2"
    assert (
        resource.data and resource.data["contents"][0]["mimeType"] == "application/json"
    )
    assert prompts.data and prompts.data["nextCursor"] == "p2"
    assert prompt.data and prompt.data["messages"][0]["role"] == "user"
    session.list_resources.assert_awaited_once_with(cursor="r1")
    session.read_resource.assert_awaited_once_with(uri="gitnexus://repos")
    session.list_prompts.assert_awaited_once_with(cursor="p1")
    session.get_prompt.assert_awaited_once_with(
        name="detect_impact", arguments={"scope": "all"}
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_transport_initialization_failure_keeps_existing_error_code(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    @asynccontextmanager
    async def failing_connector(
        url: str, transport: MCPTransport
    ) -> AsyncIterator[None]:
        raise MCPTransportError(
            "initialization", transport, RuntimeError("initialize failed")
        )
        yield  # pragma: no cover

    monkeypatch.setattr(mcp_server, "initialized_mcp_session", failing_connector)

    result = await mcp_server._connect_and_get_tools(
        "https://example.com/mcp", transport=MCPTransport.AUTO
    )

    assert result.server_status == ErrCode.MCP_SERVER_INITIAL_ERR.code
    assert result.server_message == ErrCode.MCP_SERVER_INITIAL_ERR.msg


@pytest.mark.unit
@pytest.mark.asyncio
async def test_url_processing_forwards_transport_selector(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    connect = AsyncMock(return_value=Mock(server_status=ErrCode.SUCCESSES.code))
    monkeypatch.setattr(mcp_server, "is_local_url", lambda _: False)
    monkeypatch.setattr(mcp_server, "is_in_blacklist", lambda **_: False)
    monkeypatch.setattr(mcp_server, "_connect_and_get_tools", connect)

    await mcp_server._process_mcp_server_by_url(
        "https://example.com/mcp", MCPTransport.STREAMABLE_HTTP
    )

    connect.assert_awaited_once_with(
        "https://example.com/mcp",
        server_url="https://example.com/mcp",
        transport=MCPTransport.STREAMABLE_HTTP,
    )


def _sdk_tool_result(**overrides: Any) -> Any:
    fields: dict[str, Any] = {
        "content": [
            types.TextContent(
                type="text",
                text="summary",
                annotations=types.Annotations(audience=["user"], priority=0.5),
                _meta={"trace": "t1"},
            ),
            types.ImageContent(type="image", data="aQ==", mimeType="image/png"),
            types.AudioContent(type="audio", data="YQ==", mimeType="audio/wav"),
            types.EmbeddedResource(
                type="resource",
                resource=types.TextResourceContents(
                    uri="file:///report.json", mimeType="application/json", text="{}"
                ),
            ),
            types.EmbeddedResource(
                type="resource",
                resource=types.BlobResourceContents(
                    uri="file:///chart.png", mimeType="image/png", blob="Yg=="
                ),
            ),
            types.ResourceLink(
                type="resource_link",
                uri="gitnexus://repos",
                name="repos",
                mimeType="application/json",
                size=42,
            ),
        ],
        "structuredContent": {"risk": "HIGH", "count": 2},
        "isError": False,
        "_meta": {"requestCost": 3},
    }
    fields.update(overrides)
    return types.CallToolResult(**fields)


def _sdk_session(result: Any) -> FakeSession:
    session = FakeSession()
    session.call_tool.return_value = result
    return session


async def _call(mcp_server: Any) -> Any:
    return await mcp_server._call_mcp_tool(
        "https://example.com/mcp", "impact", {}, "sid", Mock(), Mock(), "server", Mock()
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_call_tool_round_trips_standard_sdk_content_blocks(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    """Standard SDK blocks keep their types, fields, annotations and _meta."""
    session = _sdk_session(_sdk_tool_result())
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )

    result = await _call(mcp_server)

    assert result.code == ErrCode.SUCCESSES.code
    data = result.data
    assert data.isError is False
    assert data.structuredContent == {"risk": "HIGH", "count": 2}
    assert data.meta == {"requestCost": 3}
    assert data.truncation is None
    text, image, audio, text_res, blob_res, link = data.content
    assert type(text).__name__ == "MCPTextBlock"
    assert text.text == "summary"
    assert text.annotations == {"audience": ["user"], "priority": 0.5}
    assert text.meta == {"trace": "t1"}
    assert (image.mimeType, image.mineType) == ("image/png", "image/png")
    assert type(audio).__name__ == "MCPAudioBlock"
    assert (audio.data, audio.mimeType) == ("YQ==", "audio/wav")
    assert text_res.resource.text == "{}"
    assert text_res.resource.mimeType == "application/json"
    assert blob_res.resource.blob == "Yg=="
    assert type(link).__name__ == "MCPResourceLinkBlock"
    assert (link.uri, link.name, link.size) == ("gitnexus://repos", "repos", 42)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_call_tool_api_serializes_public_schema(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    """The FastAPI route serializes the typed public schema losslessly."""

    api = importlib.import_module("plugin.link.api.v1.community.tools.mcp.mcp_tools")
    session = _sdk_session(_sdk_tool_result())
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )
    response = await _call(mcp_server)
    monkeypatch.setattr(api, "call_tool", AsyncMock(return_value=response))
    app = FastAPI()
    app.include_router(api.mcp_router)

    body = TestClient(app).post("/mcp/call_tool", json={"tool_name": "impact"}).json()

    data = body["data"]
    assert data["structuredContent"] == {"risk": "HIGH", "count": 2}
    assert data["_meta"] == {"requestCost": 3}
    assert "truncation" not in data
    blocks = data["content"]
    assert [block["type"] for block in blocks] == [
        "text",
        "image",
        "audio",
        "resource",
        "resource",
        "resource_link",
    ]
    assert blocks[0]["_meta"] == {"trace": "t1"}
    assert blocks[1]["mimeType"] == blocks[1]["mineType"] == "image/png"
    assert "mineType" not in blocks[2]
    assert blocks[3]["resource"] == {
        "uri": "file:///report.json",
        "mimeType": "application/json",
        "text": "{}",
    }
    assert blocks[5]["uri"] == "gitnexus://repos"
    # The serialized JSON validates back into the same typed models.
    reparsed = MCPCallToolResponse.model_validate(body)
    assert [type(block).__name__ for block in reparsed.data.content or []] == [
        "MCPTextBlock",
        "MCPImageBlock",
        "MCPAudioBlock",
        "MCPEmbeddedResourceBlock",
        "MCPEmbeddedResourceBlock",
        "MCPResourceLinkBlock",
    ]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_unknown_block_type_is_flagged_not_dropped(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    """Unmodelled block types pass through with an explicit flag."""
    session = FakeSession()
    session.call_tool.return_value = FakeResult(
        {"isError": False, "content": [{"type": "future_block", "value": 7}]}
    )
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )

    block = (await _call(mcp_server)).data.content[0]

    assert type(block).__name__ == "MCPUnsupportedBlock"
    assert block.model_dump(by_alias=True, exclude_none=True) == {
        "type": "future_block",
        "unsupported": True,
        "value": 7,
    }


@pytest.mark.unit
@pytest.mark.asyncio
async def test_tool_level_error_is_distinct_from_call_failure(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    """Tool isError stays in data; call failures use the envelope code."""
    failing = _sdk_tool_result(
        content=[types.TextContent(type="text", text="bad input")],
        structuredContent=None,
        isError=True,
    )
    session = _sdk_session(failing)
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )

    tool_error = await _call(mcp_server)

    assert tool_error.code == ErrCode.SUCCESSES.code
    assert tool_error.data.isError is True
    assert tool_error.data.content[0].text == "bad input"

    monkeypatch.setattr(mcp_server, "OTelStatus", MagicMock())
    session.call_tool.side_effect = RuntimeError("session dropped")
    call_failure = await _call(mcp_server)
    assert call_failure.code == ErrCode.MCP_SERVER_CALL_TOOL_ERR.code
    assert call_failure.data.content is None


@pytest.mark.unit
def test_result_limits_truncate_explicitly() -> None:
    """Size limits withhold data only with explicit truncation metadata."""

    blocks = [types.TextContent(type="text", text=f"block-{i}") for i in range(5)]
    by_count = build_call_tool_data(
        types.CallToolResult(content=blocks),
        ResultLimits(max_blocks=2, max_bytes=1_000_000),
    )
    assert [block.text for block in by_count.content or []] == ["block-0", "block-1"]
    assert by_count.truncation is not None
    assert by_count.truncation.model_dump() == {
        "reason": "max_blocks",
        "maxBlocks": 2,
        "maxBytes": 1_000_000,
        "originalBlockCount": 5,
        "returnedBlockCount": 2,
        "structuredContentOmitted": False,
    }

    # structuredContent is budgeted first; blocks stop once bytes run out.
    by_bytes = build_call_tool_data(
        types.CallToolResult(content=blocks, structuredContent={"ok": True}),
        ResultLimits(max_blocks=100, max_bytes=80),
    )
    assert by_bytes.structuredContent == {"ok": True}
    assert by_bytes.truncation is not None
    assert by_bytes.truncation.reason == "max_bytes"
    assert 0 < by_bytes.truncation.returnedBlockCount < 5

    oversized = build_call_tool_data(
        types.CallToolResult(content=[], structuredContent={"blob": "x" * 200}),
        ResultLimits(max_blocks=100, max_bytes=100),
    )
    assert oversized.structuredContent is None
    assert oversized.truncation is not None
    assert oversized.truncation.structuredContentOmitted is True
    assert oversized.truncation.reason == "max_bytes"


@pytest.mark.unit
def test_result_limits_read_positive_env_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Env overrides apply only when they are positive integers."""

    monkeypatch.setenv("MCP_TOOL_RESULT_MAX_BLOCKS", "7")
    monkeypatch.setenv("MCP_TOOL_RESULT_MAX_BYTES", "-1")
    assert ResultLimits.from_env() == ResultLimits(7, DEFAULT_MAX_BYTES)
