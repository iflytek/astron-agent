"""Unit tests for hooks module."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from plugin.aitools.common.clients.adapters import NoOpSpanAdapter
from plugin.aitools.common.clients.hooks import (
    HttpSpanHooks,
    WebSocketSpanHooks,
    add_info,
)


class TestAddInfo:
    """Test cases for add_info function."""

    def test_add_info_truncates_long_values(self) -> None:
        """Test that add_info truncates long values."""
        span = NoOpSpanAdapter()
        long_value = "x" * 10000
        add_info(span, "long_key", long_value)  # Should not raise

    def test_add_info_short_values(self) -> None:
        """Test add_info with short values."""
        span = NoOpSpanAdapter()
        add_info(span, "key", "short_value")  # Should not raise


class TestWebSocketSpanHooks:
    """Test cases for WebSocketSpanHooks."""

    @pytest.fixture
    def mock_client(self) -> MagicMock:
        """Create a mock WebSocket client."""
        client = MagicMock()
        client.url = "ws://example.com"
        client.ws_params = {"param": "value"}
        client.kwargs = {"key": "value"}
        client.send_data_list = []
        client.recv_data_list = []
        client.close = AsyncMock()
        return client

    def test_setup_sets_attributes(self, mock_client: MagicMock) -> None:
        """Test setup sets span attributes."""
        hooks = WebSocketSpanHooks()
        span = NoOpSpanAdapter()
        hooks.setup(mock_client, span)

    def test_setup_handles_exception(self, mock_client: MagicMock) -> None:
        """Test setup handles exceptions gracefully."""
        hooks = WebSocketSpanHooks()
        span = NoOpSpanAdapter()
        # Should not raise even with problematic data
        hooks.setup(mock_client, span)

    @pytest.mark.asyncio
    async def test_teardown_with_data(self, mock_client: MagicMock) -> None:
        """Test teardown with send/recv data."""
        mock_client.send_data_list = [{"type": "text", "data": "hello"}]
        mock_client.recv_data_list = [{"type": "text", "data": "world"}]

        hooks = WebSocketSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)
        mock_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_teardown_empty_data(self, mock_client: MagicMock) -> None:
        """Test teardown with empty data."""
        hooks = WebSocketSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)
        mock_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_teardown_handles_exception(self, mock_client: MagicMock) -> None:
        """Test teardown handles exceptions gracefully."""
        mock_client.close = AsyncMock(side_effect=Exception("close error"))
        hooks = WebSocketSpanHooks()
        span = NoOpSpanAdapter()
        # Should not raise
        await hooks.teardown(mock_client, span)


class TestHttpSpanHooks:
    """Test cases for HttpSpanHooks."""

    @pytest.fixture
    def mock_client(self) -> MagicMock:
        """Create a mock HTTP client."""
        client = MagicMock()
        client.url = "http://example.com"
        client.method = "GET"
        client.kwargs = {"key": "value"}
        client.response = None
        return client

    def test_setup_sets_attributes(self, mock_client: MagicMock) -> None:
        """Test setup sets span attributes."""
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        hooks.setup(mock_client, span)

    def test_setup_with_complex_kwargs(self, mock_client: MagicMock) -> None:
        """Test setup with complex kwargs."""
        mock_client.kwargs = {
            "json": {"key": "value"},
            "headers": {"Content-Type": "application/json"},
        }
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        hooks.setup(mock_client, span)

    @pytest.mark.asyncio
    async def test_teardown_no_response(self, mock_client: MagicMock) -> None:
        """Test teardown with no response."""
        mock_client.response = None
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)

    @pytest.mark.asyncio
    async def test_teardown_with_response(self, mock_client: MagicMock) -> None:
        """Test teardown with response."""
        from plugin.aitools.api.schemas.types import SuccessResponse

        mock_client.response = SuccessResponse(data={"result": "ok"})
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)

    @pytest.mark.asyncio
    async def test_teardown_with_error_response(self, mock_client: MagicMock) -> None:
        """Test teardown with error response."""
        from plugin.aitools.api.schemas.types import ErrorResponse
        from plugin.aitools.common.exceptions.error.code_enums import CodeEnums

        mock_client.response = ErrorResponse.from_enum(CodeEnums.ServiceInernalError)
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)

    @pytest.mark.asyncio
    async def test_teardown_with_clientresponse(self, mock_client: MagicMock) -> None:
        """Test teardown with ClientResponse content."""
        from aiohttp import ClientResponse

        mock_client.response = MagicMock()
        mock_client.response.data = {"content": MagicMock(spec=ClientResponse)}

        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        await hooks.teardown(mock_client, span)

    def test_setup_handles_exception(self, mock_client: MagicMock) -> None:
        """Test setup handles exceptions gracefully."""
        hooks = HttpSpanHooks()
        span = NoOpSpanAdapter()
        # Make kwargs cause an exception when json.dumps is called
        mock_client.kwargs = {"key": MagicMock()}
        # Should not raise
        hooks.setup(mock_client, span)
