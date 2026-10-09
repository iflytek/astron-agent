"""Transport selection and backwards-compatible connection handling for MCP."""

import ssl
from collections.abc import AsyncIterator, Iterator
from contextlib import AsyncExitStack, asynccontextmanager

import anyio
import httpx
from loguru import logger
from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamable_http_client
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import MCPTransport
from plugin.link.service.community.tools.mcp.mcp_auth import (
    MCPAuthConfigurationError,
    resolve_mcp_auth_headers,
)

_FALLBACK_HTTP_STATUSES = frozenset({404, 405})
_AUTH_HTTP_STATUSES = frozenset({401, 403})


class MCPTransportError(Exception):
    """Failure while opening or initializing an MCP transport."""

    def __init__(
        self, phase: str, transport: MCPTransport, cause: BaseException
    ) -> None:
        super().__init__(f"MCP {phase} failed using {transport.value}")
        self.phase = phase
        self.transport = transport
        self.cause = cause


def _walk_exceptions(error: BaseException) -> Iterator[BaseException]:
    """Yield an exception and its nested group/cause/context exceptions."""
    pending = [error]
    seen: set[int] = set()

    while pending:
        current = pending.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        yield current

        if isinstance(current, BaseExceptionGroup):
            pending.extend(current.exceptions)
        if current.__cause__ is not None:
            pending.append(current.__cause__)
        if current.__context__ is not None:
            pending.append(current.__context__)


def _fallback_reason(
    error: BaseException, response_status: int | None = None
) -> str | None:
    """Return a credential-free fallback category for negotiation failures."""
    nested = tuple(_walk_exceptions(error))

    if any(isinstance(item, ssl.SSLError) for item in nested):
        return None

    statuses = {
        item.response.status_code
        for item in nested
        if isinstance(item, httpx.HTTPStatusError)
    }
    if response_status is not None:
        statuses.add(response_status)

    if statuses & _AUTH_HTTP_STATUSES:
        return None
    if statuses:
        if statuses <= _FALLBACK_HTTP_STATUSES:
            return "http_" + "_or_".join(str(status) for status in sorted(statuses))
        return None

    if any(isinstance(item, (httpx.TimeoutException, TimeoutError)) for item in nested):
        return "timeout"
    if any(isinstance(item, httpx.TransportError) for item in nested):
        return "network_error"
    if any(
        isinstance(
            item,
            (anyio.BrokenResourceError, anyio.ClosedResourceError, anyio.EndOfStream),
        )
        for item in nested
    ):
        return "connection_closed"
    if any(isinstance(item, (ConnectionError, OSError)) for item in nested):
        return "connection_error"

    return None


def _transport_candidates(transport: MCPTransport) -> tuple[MCPTransport, ...]:
    if transport is MCPTransport.AUTO:
        return (MCPTransport.STREAMABLE_HTTP, MCPTransport.SSE)
    return (transport,)


def _resolve_transport_auth(url: str, transport: MCPTransport) -> dict[str, str]:
    try:
        auth_headers = resolve_mcp_auth_headers(url)
    except MCPAuthConfigurationError as auth_error:
        raise MCPTransportError(
            "authentication configuration", transport, auth_error
        ) from auth_error

    if auth_headers and transport is MCPTransport.SSE:
        transport_error = MCPAuthConfigurationError(
            "Configured Bearer credentials require Streamable HTTP"
        )
        raise MCPTransportError(
            "authentication configuration", transport, transport_error
        ) from transport_error
    return auth_headers


def _raise_if_fallback_disallowed(
    error: Exception,
    *,
    initialized: bool,
    authenticated: bool,
    requested: MCPTransport,
    candidate: MCPTransport,
    phase: str,
) -> None:
    if initialized:
        raise error
    if authenticated or requested is not MCPTransport.AUTO:
        raise MCPTransportError(phase, candidate, error) from error


@asynccontextmanager
async def initialized_mcp_session(
    url: str, transport: MCPTransport = MCPTransport.AUTO
) -> AsyncIterator[tuple[ClientSession, MCPTransport]]:
    """Yield one initialized MCP session using the selected transport.

    Automatic fallback is limited to Streamable HTTP connection and initialization.
    Exceptions raised by operations after initialization are never retried through SSE.
    """
    auth_headers = _resolve_transport_auth(url, transport)

    for candidate in _transport_candidates(transport):
        initialized = False
        response_status: int | None = None
        phase = "connection"

        async def capture_response(response: httpx.Response) -> None:
            # Once an endpoint accepts an HTTP exchange, a later timeout is no
            # longer transport discovery and must not trigger a second protocol.
            nonlocal response_status
            response_status = response.status_code

        try:
            async with AsyncExitStack() as stack:
                if candidate is MCPTransport.STREAMABLE_HTTP:
                    http_client = httpx.AsyncClient(
                        headers=auth_headers,
                        follow_redirects=not auth_headers,
                        timeout=httpx.Timeout(30.0, read=300.0),
                        event_hooks={"response": [capture_response]},
                    )
                    await stack.enter_async_context(http_client)
                    streams = await stack.enter_async_context(
                        streamable_http_client(url, http_client=http_client)
                    )
                else:
                    streams = await stack.enter_async_context(sse_client(url=url))

                read, write = streams[:2]
                phase = "session creation"
                session = await stack.enter_async_context(
                    ClientSession(read, write, logging_callback=None)
                )
                phase = "initialization"
                await session.initialize()
                initialized = True
                logger.info("MCP transport selected: {}", candidate.value)
                yield session, candidate
                return
        except Exception as error:
            _raise_if_fallback_disallowed(
                error,
                initialized=initialized,
                authenticated=bool(auth_headers),
                requested=transport,
                candidate=candidate,
                phase=phase,
            )

            reason = _fallback_reason(error, response_status)
            if candidate is not MCPTransport.STREAMABLE_HTTP or reason is None:
                raise MCPTransportError(phase, candidate, error) from error

            logger.warning(
                "MCP Streamable HTTP initialization failed; falling back to legacy "
                "SSE (reason={})",
                reason,
            )

    raise RuntimeError("No MCP transport candidates were available")
