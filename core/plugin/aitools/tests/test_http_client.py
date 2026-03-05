"""Unit tests for HttpClient class."""

# pylint: disable=redefined-builtin
import os
import sys
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest
from plugin.aitools.api.schemas.types import SuccessResponse
from plugin.aitools.common.clients.aiohttp_client import HttpClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import (
    HTTPClientException,
    ServiceException,
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def make_mock_response(
    *,
    status: int = 200,
    headers: dict | None = None,
    json_data: dict | None = None,
    text_data: str | None = None,
    binary_data: bytes | None = None,
) -> aiohttp.ClientResponse:
    """Build mock response object."""
    resp = AsyncMock(spec=aiohttp.ClientResponse)
    resp.status = status
    resp.headers = headers or {}

    if json_data is not None:
        resp.json = AsyncMock(return_value=json_data)
    if text_data is not None:
        resp.text = AsyncMock(return_value=text_data)
    if binary_data is not None:
        resp.read = AsyncMock(return_value=binary_data)

    if status >= 400:
        resp.raise_for_status.side_effect = aiohttp.ClientResponseError(
            request_info=MagicMock(),
            history=(),
            status=status,
            message="error",
        )
    else:
        resp.raise_for_status = MagicMock()

    return resp


def mock_session_with_response(resp: aiohttp.ClientResponse) -> aiohttp.ClientSession:
    """Build mock session with response object."""
    cm = AsyncMock()
    cm.__aenter__.return_value = resp
    cm.__aexit__.return_value = None

    session = MagicMock()
    session.request.return_value = cm
    return session


class TestHttpClient:
    """Test cases for HttpClient class."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def test_send_http_request(self, method: str) -> None:
        """Test sending HTTP request with default values."""
        mock_resp = make_mock_response(
            headers={"Content-Type": "application/json"},
            json_data={"hello": "world"},
        )

        mock_session = mock_session_with_response(mock_resp)

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            async with HttpClient(method, "http://example.com").start() as client:
                async with client.request() as resp:
                    pass

        assert isinstance(resp, SuccessResponse)
        assert resp.data["content"] == {"hello": "world"}  # type: ignore[index]

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "type, data",
        [
            ("application/json", {"hello": "world"}),
            ("text/plain", "ok"),
            ("image/png", b"\x89PNG"),
        ],
    )
    async def test_http_client_success_response_type(
        self, type: str, data: Any
    ) -> None:
        """Test sending HTTP request with JSON data."""
        mock_resp = make_mock_response(
            headers={"Content-Type": f"{type}"},
            json_data=data if type == "application/json" else None,
            text_data=data if type == "text/plain" else None,
            binary_data=data if type == "image/png" else None,
        )

        mock_session = mock_session_with_response(mock_resp)

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            async with HttpClient(
                "POST", "http://example.com", json={"hello": "world"}
            ).start() as client:
                async with client.request():
                    pass

    @pytest.mark.asyncio
    async def test_http_client_http_error(self) -> None:
        """Test sending HTTP request with HTTP error."""
        mock_resp = make_mock_response(
            status=500,
            headers={"Content-Type": "application/json"},
            json_data={"error": "boom"},
        )

        mock_session = mock_session_with_response(mock_resp)

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            with pytest.raises(ServiceException) as e:
                async with HttpClient(
                    "POST", "http://example.com", json={"hello": "world"}
                ).start() as client:
                    async with client.request():
                        pass

        assert e.value.code == CodeEnums.HTTPClientError.code

    @pytest.mark.asyncio
    async def test_http_client_aiohttp_error(self) -> None:
        """Test sending HTTP request with aiohttp error."""
        mock_session = MagicMock()
        mock_session.request.side_effect = aiohttp.ClientError("network error")

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            with pytest.raises(ServiceException) as e:
                async with HttpClient(
                    "POST", "http://example.com", json={"hello": "world"}
                ).start() as client:
                    async with client.request():
                        pass

        assert e.value.code == CodeEnums.HTTPClientError.code

    @pytest.mark.asyncio
    async def test_http_client_custom_error(self) -> None:
        """Test sending HTTP request with custom error."""
        mock_session = MagicMock()
        mock_session.request.side_effect = HTTPClientException.from_error_code(
            CodeEnums.HTTPClientError
        )

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            with pytest.raises(ServiceException) as e:
                async with HttpClient(
                    "POST", "http://example.com", json={"hello": "world"}
                ).start() as client:
                    async with client.request():
                        pass

        assert e.value.code == CodeEnums.HTTPClientError.code

    @pytest.mark.asyncio
    async def test_http_client_generic_error(self) -> None:
        """Test sending HTTP request with generic error."""
        mock_session = MagicMock()
        mock_session.request.side_effect = Exception("generic error")

        with patch(
            "plugin.aitools.common.clients.aiohttp_client.get_aiohttp_session",
            AsyncMock(return_value=mock_session),
        ):
            with pytest.raises(ServiceException) as e:
                async with HttpClient(
                    "POST", "http://example.com", json={"hello": "world"}
                ).start() as client:
                    async with client.request():
                        pass

        assert e.value.code == CodeEnums.HTTPClientError.code

    @pytest.mark.asyncio
    async def test_start_without_parent_span(self) -> None:
        """Test starting HttpClient without parent span."""
        client = HttpClient("GET", "http://example.com")

        async with client.start() as c:
            assert c is client


class TestAiohttpSession:
    """Test cases for aiohttp session management."""

    @pytest.mark.asyncio
    async def test_get_aiohttp_session_creates_new(self) -> None:
        """Test get_aiohttp_session creates new session."""
        from plugin.aitools.common.clients import aiohttp_client

        # Reset the global session
        aiohttp_client._aiohttp_session = None

        with patch("aiohttp.ClientSession") as mock_session_class:
            mock_session = MagicMock()
            mock_session.closed = False
            mock_session_class.return_value = mock_session

            session = await aiohttp_client.get_aiohttp_session()

            assert session is mock_session
            mock_session_class.assert_called_once()

        # Cleanup
        aiohttp_client._aiohttp_session = None

    @pytest.mark.asyncio
    async def test_get_aiohttp_session_reuses_existing(self) -> None:
        """Test get_aiohttp_session reuses existing session."""
        from plugin.aitools.common.clients import aiohttp_client

        # Set up existing session
        mock_session = MagicMock()
        mock_session.closed = False
        aiohttp_client._aiohttp_session = mock_session

        session = await aiohttp_client.get_aiohttp_session()

        assert session is mock_session

        # Cleanup
        aiohttp_client._aiohttp_session = None

    @pytest.mark.asyncio
    async def test_get_aiohttp_session_creates_new_when_closed(self) -> None:
        """Test get_aiohttp_session creates new session when closed."""
        from plugin.aitools.common.clients import aiohttp_client

        # Set up closed session
        mock_session = MagicMock()
        mock_session.closed = True
        aiohttp_client._aiohttp_session = mock_session

        with patch("aiohttp.ClientSession") as mock_session_class:
            new_session = MagicMock()
            new_session.closed = False
            mock_session_class.return_value = new_session

            session = await aiohttp_client.get_aiohttp_session()

            assert session is new_session

        # Cleanup
        aiohttp_client._aiohttp_session = None

    @pytest.mark.asyncio
    async def test_close_aiohttp_session(self) -> None:
        """Test close_aiohttp_session closes session."""
        from plugin.aitools.common.clients import aiohttp_client

        # Set up existing session
        mock_session = MagicMock()
        mock_session.closed = False
        mock_session.close = AsyncMock()
        aiohttp_client._aiohttp_session = mock_session

        await aiohttp_client.close_aiohttp_session()

        mock_session.close.assert_called_once()
        assert aiohttp_client._aiohttp_session is None

    @pytest.mark.asyncio
    async def test_close_aiohttp_session_already_closed(self) -> None:
        """Test close_aiohttp_session when already closed."""
        from plugin.aitools.common.clients import aiohttp_client

        # Set up already closed session
        mock_session = MagicMock()
        mock_session.closed = True
        aiohttp_client._aiohttp_session = mock_session

        await aiohttp_client.close_aiohttp_session()

        mock_session.close.assert_not_called()
        assert aiohttp_client._aiohttp_session is None

    @pytest.mark.asyncio
    async def test_close_aiohttp_session_none(self) -> None:
        """Test close_aiohttp_session when session is None."""
        from plugin.aitools.common.clients import aiohttp_client

        aiohttp_client._aiohttp_session = None

        # Should not raise
        await aiohttp_client.close_aiohttp_session()


class TestHttpClientAuth:
    """Test cases for HttpClient authentication."""

    @pytest.mark.asyncio
    async def test_auth_ase_success(self) -> None:
        """Test ASE authentication builds URL successfully."""
        from common.utils.hmac_auth import HMACAuth

        with patch.object(HMACAuth, "build_auth_request_url") as mock_build:
            mock_build.return_value = "http://authenticated.example.com"

            client = HttpClient(
                "GET",
                "http://example.com",
                auth="ASE",
                api_key="key",
                api_secret="secret",
            )

            # Access the private _auth method
            client._auth()

            mock_build.assert_called_once()

    @pytest.mark.asyncio
    async def test_auth_ase_failure(self) -> None:
        """Test ASE authentication failure."""
        from common.utils.hmac_auth import HMACAuth

        with patch.object(HMACAuth, "build_auth_request_url") as mock_build:
            mock_build.return_value = None

            client = HttpClient(
                "GET",
                "http://example.com",
                auth="ASE",
                api_key="key",
                api_secret="secret",
            )

            with pytest.raises(ServiceException):
                client._auth()
