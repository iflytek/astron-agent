"""Unit tests for WebSocketClient class."""

# pylint: disable=unnecessary-lambda
import asyncio
from typing import Any, Coroutine, Iterable, List, Optional, TypeVar
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import websockets
from plugin.aitools.common.clients.websockets_client import WebSocketClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import WebSocketClientException

T = TypeVar("T")


def make_mock_ws(
    *, recv_data: Optional[Iterable[Any] | BaseException] = None
) -> AsyncMock:
    """Build mock WebSocket."""
    ws = AsyncMock()
    ws.send = AsyncMock()
    ws.close = AsyncMock()

    if recv_data is None:
        ws.recv = AsyncMock(side_effect=asyncio.CancelledError)
    else:
        ws.recv = AsyncMock(side_effect=recv_data)

    return ws


class InlineTaskFactory:  # pylint: disable=too-few-public-methods
    """Task factory that creates tasks inline."""

    def __init__(self) -> None:
        """Initialize task factory."""
        self.created: List = []

    def create(self, coro: Coroutine[Any, Any, T]) -> asyncio.Task:
        """Create task inline."""
        self.created.append(coro)
        return asyncio.create_task(coro)


class TestWebSocketClient:
    """Test cases for WebSocketClient class."""

    @pytest.mark.asyncio
    async def test_websocket_client_start_with_parent_span(self) -> None:
        """Test WebSocketClient start with parent span."""
        ws = make_mock_ws(recv_data=[asyncio.CancelledError()])
        span = MagicMock()

        span_ctx = MagicMock()
        span.start.return_value.__enter__.return_value = span_ctx
        span.start.return_value.__exit__.return_value = None

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com", span=span).start():
                pass

        span.start.assert_called_once()

    @pytest.mark.asyncio
    async def test_websocket_client_send_and_recv(self) -> None:
        """Test WebSocketClient send and recv."""
        ws = make_mock_ws(recv_data=["hello", "world", asyncio.CancelledError()])

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                await client.send({"msg": "hi"})

                msgs = []
                async for msg in client.recv():
                    msgs.append(msg)

        ws.send.assert_called()
        assert msgs == ["hello", "world"]

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "data",
        [
            "str",
            b"bytes",
            {"k": "v"},
            [1, 2, 3],
        ],
    )
    async def test_websocket_client_send_valid_types(self, data: Any) -> None:
        """Test WebSocketClient send with valid types."""
        ws = make_mock_ws()

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                await client.send(data)
                await asyncio.sleep(0.02)

        ws.send.assert_called()

    @pytest.mark.asyncio
    async def test_websocket_client_send_invalid_type(self) -> None:
        """Test WebSocketClient send with invalid type."""
        ws = make_mock_ws()

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                with pytest.raises(WebSocketClientException) as e:
                    await client.send(object())

        assert e.value.code == CodeEnums.WebSocketClientDataFormatError.code

    @pytest.mark.asyncio
    async def test_websocket_client_send_without_connect(self) -> None:
        """Test WebSocketClient send without connect."""
        client = WebSocketClient("ws://example.com")

        with pytest.raises(WebSocketClientException) as e:
            await client.send("hi")

        assert e.value.code == CodeEnums.WebSocketClientNotConnectedError.code

    @pytest.mark.asyncio
    async def test_websocket_client_connect_error(self) -> None:
        """Test WebSocketClient connect error."""
        with patch("websockets.connect", AsyncMock(side_effect=Exception("boom"))):
            client = WebSocketClient("ws://example.com")
            with pytest.raises(WebSocketClientException) as e:
                await client.connect()

        assert e.value.code == CodeEnums.WebSocketClientNotConnectedError.code

    @pytest.mark.asyncio
    async def test_task_factory_called_for_loops(self) -> None:
        """Test task factory called for loops."""
        ws = make_mock_ws()
        factory = MagicMock()

        factory.create.side_effect = lambda coro: asyncio.create_task(coro)

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient(
                "ws://example.com",
                task_factory=factory,
            ).start():
                pass

        assert factory.create.call_count == 2

    @pytest.mark.asyncio
    async def test_websocket_client_recv_loop_error(self) -> None:
        """Test WebSocketClient recv loop error."""
        ws = make_mock_ws(recv_data=Exception("recv error"))

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient(
                "ws://example.com", task_factory=InlineTaskFactory()  # type: ignore[arg-type]
            ).start() as client:
                with pytest.raises(WebSocketClientException) as e:
                    async for _ in client.recv():
                        pass

        assert e.value.code == CodeEnums.WebSocketClientRecvLoopError.code

    @pytest.mark.asyncio
    async def test_websocket_client_recv_loop_put_none(self) -> None:
        """Test WebSocketClient recv loop put None."""
        ws = make_mock_ws(recv_data=asyncio.CancelledError())

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient(
                "ws://example.com", task_factory=InlineTaskFactory()  # type: ignore[arg-type]
            ).start() as client:
                msg = await client.recv_queue.get()

        assert msg is None

    @pytest.mark.asyncio
    async def test_websocket_client_recv_loop_closed_error(self) -> None:
        """Test WebSocketClient recv loop closed error."""
        ws = make_mock_ws(
            recv_data=websockets.exceptions.ConnectionClosedError(None, None)
        )

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            with pytest.raises(WebSocketClientException) as e:
                async with WebSocketClient(
                    "ws://example.com", task_factory=InlineTaskFactory()  # type: ignore[arg-type]
                ).start() as client:
                    async for _ in client.recv():
                        pass

        assert e.value.code == CodeEnums.WebSocketClientNotConnectedError.code

    @pytest.mark.asyncio
    async def test_websocket_client_recv_stop_on_none(self) -> None:
        """Test WebSocketClient recv stop on None."""
        client = WebSocketClient("ws://example.com")
        client._running = True  # pylint: disable=protected-access
        await client.recv_queue.put(None)

        msgs = []
        async for msg in client.recv():
            msgs.append(msg)

        assert not msgs

    @pytest.mark.asyncio
    async def test_websocket_client_send_loop_error(self) -> None:
        """Test WebSocketClient send loop error."""
        ws = make_mock_ws()
        ws.send.side_effect = Exception("send error")

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                with pytest.raises(WebSocketClientException) as e:
                    await client.send("hi")
                    async for _ in client.recv():
                        pass

        assert e.value.code == CodeEnums.WebSocketClientSendLoopError.code

    @pytest.mark.asyncio
    async def test_websocket_client_send_loop_eof(self) -> None:
        """Test WebSocketClient send loop EOF."""
        ws = make_mock_ws()

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                await client.send_queue.put("EOF")
                await asyncio.sleep(0.02)

        ws.send.assert_not_called()

    @pytest.mark.asyncio
    async def test_websocket_client_send_loop_closed_ok(self) -> None:
        """Test WebSocketClient send loop closed OK."""
        ws = make_mock_ws()
        ws.send.side_effect = websockets.exceptions.ConnectionClosedOK

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            async with WebSocketClient("ws://example.com").start() as client:
                await client.send("hi")
                await asyncio.sleep(0.02)

    @pytest.mark.asyncio
    async def test_websocket_client_close_idempotent(self) -> None:
        """Test WebSocketClient close idempotent."""
        ws = make_mock_ws()

        with patch("websockets.connect", AsyncMock(return_value=ws)):
            client = WebSocketClient("ws://example.com")
            await client.connect()
            await client.close()
            await client.close()  # second time

        ws.close.assert_called_once()
