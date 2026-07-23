"""Tests for MCP client transport selection and fallback behavior."""

import ssl
from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from typing import Any, cast

import httpx
import pytest
from mcp import ClientSession as RealClientSession
from mcp.server.fastmcp import FastMCP
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolRequest,
    MCPToolListRequest,
    MCPTransport,
)
from plugin.link.service.community.tools.mcp import mcp_transport
from pydantic import ValidationError


@dataclass
class FakeReadStream:
    initialize_error: BaseException | None = None


class FakeSession:
    def __init__(self, read: FakeReadStream, write: object, **_: Any) -> None:
        self.read = read

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def initialize(self) -> None:
        if self.read.initialize_error is not None:
            raise self.read.initialize_error


def http_status_error(status_code: int) -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://example.com/mcp")
    response = httpx.Response(status_code, request=request)
    return httpx.HTTPStatusError(
        f"HTTP {status_code}", request=request, response=response
    )


def transport_factory(
    attempts: list[str],
    name: str,
    *,
    initialize_error: BaseException | None = None,
    include_session_callback: bool = False,
) -> Callable[..., AbstractAsyncContextManager[tuple[object, ...]]]:
    @asynccontextmanager
    async def transport(*_: Any, **__: Any) -> AsyncIterator[tuple[object, ...]]:
        attempts.append(name)
        streams: tuple[object, ...] = (
            FakeReadStream(initialize_error),
            object(),
        )
        if include_session_callback:
            streams += (lambda: "session-id",)
        yield streams

    return transport


def sdk_session_factory(
    read: object, write: object, **kwargs: Any
) -> FakeSession | RealClientSession:
    """Use a fake session for fake streams and the SDK session for real streams."""
    if isinstance(read, FakeReadStream):
        return FakeSession(read, write, **kwargs)
    return RealClientSession(cast(Any, read), cast(Any, write), **kwargs)


def mock_http_client_factory(status_code: int) -> Callable[..., httpx.AsyncClient]:
    """Create an AsyncClient factory that preserves connector event hooks."""
    real_async_client = httpx.AsyncClient

    def create_client(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        def respond(request: httpx.Request) -> httpx.Response:
            return httpx.Response(status_code, request=request)

        kwargs["transport"] = httpx.MockTransport(respond)
        return real_async_client(*args, **kwargs)

    return create_client


@pytest.fixture
def fake_session(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mcp_transport, "ClientSession", FakeSession)


@pytest.mark.unit
def test_timeout_after_accepted_http_response_does_not_fallback() -> None:
    request = httpx.Request("POST", "https://example.com/mcp")
    timeout = httpx.ReadTimeout("timed out", request=request)

    assert mcp_transport._fallback_reason(timeout, response_status=200) is None


@pytest.mark.unit
def test_transport_selector_is_backwards_compatible_and_validated() -> None:
    assert MCPToolListRequest().transport is MCPTransport.AUTO
    assert (
        MCPCallToolRequest(tool_name="echo", transport="streamable_http").transport
        is MCPTransport.STREAMABLE_HTTP
    )

    with pytest.raises(ValidationError):
        MCPCallToolRequest(tool_name="echo", transport="websocket")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_falls_back_from_streamable_http_405_to_sse(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(
            attempts,
            "streamable_http",
            initialize_error=http_status_error(405),
            include_session_callback=True,
        ),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    async with mcp_transport.initialized_mcp_session(
        "https://example.com/mcp", MCPTransport.AUTO
    ) as (_, selected):
        assert selected is MCPTransport.SSE

    assert attempts == ["streamable_http", "sse"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_real_sdk_405_response_falls_back_to_sse(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(mcp_transport, "ClientSession", sdk_session_factory)
    monkeypatch.setattr(
        mcp_transport.httpx, "AsyncClient", mock_http_client_factory(405)
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    async with mcp_transport.initialized_mcp_session(
        "https://example.com/mcp", MCPTransport.AUTO
    ) as (_, selected):
        assert selected is MCPTransport.SSE

    assert attempts == ["sse"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_real_sdk_401_response_does_not_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(mcp_transport, "ClientSession", sdk_session_factory)
    monkeypatch.setattr(
        mcp_transport.httpx, "AsyncClient", mock_http_client_factory(401)
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "initialization"
    assert attempts == []


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_falls_back_after_streamable_http_timeout(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    request = httpx.Request("POST", "https://example.com/mcp")
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(
            attempts,
            "streamable_http",
            initialize_error=httpx.ConnectTimeout("timed out", request=request),
        ),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    async with mcp_transport.initialized_mcp_session(
        "https://example.com/mcp", MCPTransport.AUTO
    ) as (_, selected):
        assert selected is MCPTransport.SSE

    assert attempts == ["streamable_http", "sse"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_does_not_fallback_on_authentication_failure(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(
            attempts, "streamable_http", initialize_error=http_status_error(401)
        ),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "initialization"
    assert isinstance(exc_info.value.cause, httpx.HTTPStatusError)
    assert attempts == ["streamable_http"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_does_not_fallback_on_certificate_failure(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    request = httpx.Request("POST", "https://example.com/mcp")
    error = httpx.ConnectError("certificate verify failed", request=request)
    error.__cause__ = ssl.SSLCertVerificationError(1, "certificate verify failed")
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(attempts, "streamable_http", initialize_error=error),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "initialization"
    assert isinstance(exc_info.value.cause, httpx.ConnectError)
    assert attempts == ["streamable_http"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_does_not_fallback_on_tls_handshake_failure(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    request = httpx.Request("POST", "https://example.com/mcp")
    error = httpx.ConnectError("TLS handshake failed", request=request)
    error.__cause__ = ssl.SSLError(1, "tlsv1 alert protocol version")
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(attempts, "streamable_http", initialize_error=error),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "initialization"
    assert isinstance(exc_info.value.cause, httpx.ConnectError)
    assert attempts == ["streamable_http"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_real_sdk_streamable_http_success_round_trip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    server = FastMCP("test-server", host="testserver", stateless_http=True)

    @server.tool()
    def echo(value: str) -> str:
        return value

    app = server.streamable_http_app()
    real_async_client = httpx.AsyncClient

    def create_client(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs["transport"] = httpx.ASGITransport(app=app)
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(mcp_transport.httpx, "AsyncClient", create_client)

    async with app.router.lifespan_context(app):
        async with mcp_transport.initialized_mcp_session(
            "http://testserver/mcp", MCPTransport.STREAMABLE_HTTP
        ) as (session, selected):
            tools = await session.list_tools()
            result = await session.call_tool("echo", arguments={"value": "hello"})

    assert selected is MCPTransport.STREAMABLE_HTTP
    assert [tool.name for tool in tools.tools] == ["echo"]
    assert result.isError is False
    assert result.content[0].type == "text"
    assert result.content[0].text == "hello"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_explicit_streamable_http_never_falls_back(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(
            attempts, "streamable_http", initialize_error=http_status_error(405)
        ),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.STREAMABLE_HTTP
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "initialization"
    assert attempts == ["streamable_http"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_explicit_sse_uses_only_sse(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(attempts, "streamable_http"),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    async with mcp_transport.initialized_mcp_session(
        "https://example.com/sse", MCPTransport.SSE
    ) as (_, selected):
        assert selected is MCPTransport.SSE

    assert attempts == ["sse"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_auto_reports_final_sse_connection_failure(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    request = httpx.Request("GET", "https://example.com/mcp")
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(
            attempts,
            "streamable_http",
            initialize_error=http_status_error(405),
        ),
    )

    @asynccontextmanager
    async def failing_sse(*_: Any, **__: Any) -> AsyncIterator[None]:
        attempts.append("sse")
        raise httpx.ConnectError("connection refused", request=request)
        yield  # pragma: no cover

    monkeypatch.setattr(mcp_transport, "sse_client", failing_sse)

    with pytest.raises(mcp_transport.MCPTransportError) as exc_info:
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ):
            pytest.fail("the session should not initialize")

    assert exc_info.value.phase == "connection"
    assert exc_info.value.transport is MCPTransport.SSE
    assert attempts == ["streamable_http", "sse"]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_operation_failure_after_initialization_does_not_retry(
    monkeypatch: pytest.MonkeyPatch, fake_session: None
) -> None:
    attempts: list[str] = []
    monkeypatch.setattr(
        mcp_transport,
        "streamable_http_client",
        transport_factory(attempts, "streamable_http", include_session_callback=True),
    )
    monkeypatch.setattr(mcp_transport, "sse_client", transport_factory(attempts, "sse"))

    with pytest.raises(RuntimeError, match="tool failed"):
        async with mcp_transport.initialized_mcp_session(
            "https://example.com/mcp", MCPTransport.AUTO
        ) as (_, selected):
            assert selected is MCPTransport.STREAMABLE_HTTP
            raise RuntimeError("tool failed")

    assert attempts == ["streamable_http"]
