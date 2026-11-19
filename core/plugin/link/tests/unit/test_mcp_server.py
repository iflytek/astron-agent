"""Tests for transport-aware MCP tool listing and execution."""

import importlib
import sys
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import MCPTransport
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
        "plugin.link.utils.security.access_interceptor": Mock(),
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

    def model_dump(self) -> dict[str, Any]:
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
    monkeypatch.setattr(
        mcp_server, "_reject_unsafe_mcp_url", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(mcp_server, "_connect_and_get_tools", connect)

    await mcp_server._process_mcp_server_by_url(
        "https://example.com/mcp", MCPTransport.STREAMABLE_HTTP
    )

    connect.assert_awaited_once_with(
        "https://example.com/mcp",
        server_url="https://example.com/mcp",
        transport=MCPTransport.STREAMABLE_HTTP,
    )


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("http://127.0.0.1/mcp", ErrCode.MCP_SERVER_LOCAL_URL_ERR),
        ("http://10.0.0.8/mcp", ErrCode.MCP_SERVER_LOCAL_URL_ERR),
    ],
)
async def test_url_processing_rejects_restricted_literals(
    monkeypatch: pytest.MonkeyPatch,
    mcp_server: Any,
    url: str,
    expected: ErrCode,
) -> None:
    connect = AsyncMock()
    monkeypatch.setattr(mcp_server, "_connect_and_get_tools", connect)

    result = await mcp_server._process_mcp_server_by_url(url, MCPTransport.AUTO)

    connect.assert_not_awaited()
    assert result.server_status == expected.code
    assert result.server_message == expected.msg
    assert result.tools == []


@pytest.mark.unit
@pytest.mark.asyncio
async def test_url_processing_maps_blocked_flag_not_message_text(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    connect = AsyncMock()
    monkeypatch.setattr(mcp_server, "_connect_and_get_tools", connect)

    async def raise_blocked(_url: str) -> None:
        raise mcp_server.OutboundPolicyError("custom wording", blocked=True)

    async def raise_unblocked(_url: str) -> None:
        raise mcp_server.OutboundPolicyError("contains blocked text", blocked=False)

    monkeypatch.setattr(
        mcp_server, "validate_resolved_destination_async", raise_blocked
    )
    blocked = await mcp_server._process_mcp_server_by_url(
        "https://example.com/mcp", MCPTransport.AUTO
    )
    assert blocked.server_status == ErrCode.MCP_SERVER_BLACKLIST_URL_ERR.code

    monkeypatch.setattr(
        mcp_server, "validate_resolved_destination_async", raise_unblocked
    )
    local = await mcp_server._process_mcp_server_by_url(
        "https://example.com/mcp", MCPTransport.AUTO
    )
    assert local.server_status == ErrCode.MCP_SERVER_LOCAL_URL_ERR.code
    connect.assert_not_awaited()


@pytest.mark.asyncio
async def test_official_mcp_contents_and_structured_output_are_preserved(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    from mcp.types import AudioContent, CallToolResult, ImageContent, ResourceLink

    session = FakeSession()
    official = CallToolResult(
        content=[
            ImageContent(type="image", data="aGVsbG8=", mimeType="image/png"),
            AudioContent(type="audio", data="aGVsbG8=", mimeType="audio/wav"),
            ResourceLink(
                type="resource_link", uri="https://example.com/file", name="file"
            ),
        ],
        structuredContent={"items": [1, 2]},
        isError=True,
    )
    session.call_tool.return_value = official
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )
    result = await mcp_server._call_mcp_tool(
        "https://example.com/mcp", "echo", {}, "sid", Mock(), Mock(), "server", Mock()
    )
    assert result.data.model_dump() == official.model_dump()
    assert result.data.isError is True


@pytest.mark.asyncio
async def test_discovery_reads_all_pages_and_preserves_tool_metadata(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    from mcp.types import ListToolsResult, Tool

    session = FakeSession()
    session.list_tools.side_effect = [
        ListToolsResult(
            tools=[
                Tool(
                    name="first",
                    inputSchema={"type": "object"},
                    outputSchema={"type": "object"},
                )
            ],
            nextCursor="second-page",
        ),
        ListToolsResult(tools=[Tool(name="second", inputSchema={"type": "object"})]),
    ]
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )
    result = await mcp_server._connect_and_get_tools("https://example.com/mcp")
    assert result.server_status == 0
    assert [tool.name for tool in result.tools] == ["first", "second"]
    assert result.tools[0].outputSchema == {"type": "object"}
    assert session.list_tools.await_args_list[1].kwargs == {"cursor": "second-page"}


@pytest.mark.asyncio
async def test_repeated_pagination_cursor_fails_instead_of_looping(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    from mcp.types import ListToolsResult

    session = FakeSession()
    session.list_tools.return_value = ListToolsResult(tools=[], nextCursor="same")
    monkeypatch.setattr(
        mcp_server, "initialized_mcp_session", initialized_session([], session)
    )
    result = await mcp_server._connect_and_get_tools("https://example.com/mcp")
    assert result.server_status == ErrCode.MCP_SERVER_TOOL_LIST_ERR.code
    assert session.list_tools.await_count == 2


@pytest.mark.asyncio
async def test_multi_server_discovery_is_bounded_and_isolates_failures(
    monkeypatch: pytest.MonkeyPatch, mcp_server: Any
) -> None:
    import asyncio

    from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
        MCPItemInfo,
        MCPToolListRequest,
    )

    active = peak = 0

    async def discover(url: str, transport: MCPTransport) -> MCPItemInfo:
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        try:
            await asyncio.sleep(0)
            if url == "broken":
                raise RuntimeError("connection failed")
            return MCPItemInfo(
                server_url=url, server_status=0, server_message="ok", tools=[]
            )
        finally:
            active -= 1

    monkeypatch.setattr(mcp_server, "_process_mcp_server_by_url", discover)
    urls = ["one", "two", "broken", "four", "five", "six"]
    result = await mcp_server._discover_servers(
        MCPToolListRequest(mcp_server_urls=urls), Mock()
    )
    assert 1 < peak <= 4
    assert [item.server_url for item in result] == urls
    assert [item.server_status == 0 for item in result] == [
        True,
        True,
        False,
        True,
        True,
        True,
    ]
