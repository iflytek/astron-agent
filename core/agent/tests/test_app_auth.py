"""Test authentication functionality of app_auth module"""

import base64
import datetime
import os
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

import agent.infra.app_auth as app_auth
from agent.exceptions import middleware_exc
from agent.infra.app_auth import APPAuth, AuthConfig, MaasAuth, hashlib_256, http_date


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


class _TestAppAuthFailedExc(Exception):
    """AppAuthFailedExc type used in testing environment."""


@pytest.fixture(autouse=True)
def _setup_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    - Replace `AppAuthFailedExc` used everywhere with a real exception class.
    """
    # 1) Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]

    # 2) Fix AppAuthFailedExc: in source code it's an instance, here replace with a real exception type
    monkeypatch.setattr(
        app_auth, "AppAuthFailedExc", _TestAppAuthFailedExc, raising=False
    )
    monkeypatch.setattr(
        middleware_exc, "AppAuthFailedExc", _TestAppAuthFailedExc, raising=False
    )


class TestHttpDate:
    """Test HTTP date formatting"""

    def test_http_date_format(self) -> None:
        """Test HTTP date format"""
        dt = datetime.datetime(2024, 1, 15, 10, 30, 45)
        result = http_date(dt)
        assert "Mon, 15 Jan 2024" in result
        assert "10:30:45 GMT" in result

    def test_http_date_weekday(self) -> None:
        """Test format for different weekdays"""
        # 2024-01-15 is Monday
        dt = datetime.datetime(2024, 1, 15)
        result = http_date(dt)
        assert result.startswith("Mon,")


class TestHashlib256:
    """Test SHA256 hash function"""

    def test_hashlib_256_basic(self) -> None:
        """Test basic hash functionality"""
        result = hashlib_256("test_string")
        assert result.startswith("SHA256=")
        assert len(result) > 10

    def test_hashlib_256_consistency(self) -> None:
        """Test hash consistency"""
        result1 = hashlib_256("same_string")
        result2 = hashlib_256("same_string")
        assert result1 == result2

    def test_hashlib_256_different_inputs(self) -> None:
        """Test that different inputs produce different hash values"""
        result1 = hashlib_256("string1")
        result2 = hashlib_256("string2")
        assert result1 != result2


class TestAuthConfig:
    """Test authentication configuration class"""

    def test_auth_config_url(self) -> None:
        """Test URL property"""
        config = AuthConfig(
            host="example.com",
            route="/api/auth",
            prot="https",
            api_key="key",
            secret="secret",
        )
        assert config.url == "https://example.com/api/auth"

    def test_auth_config_defaults(self) -> None:
        """Test default values"""
        config = AuthConfig(
            host="host",
            route="/route",
            prot="http",
            api_key="key",
            secret="secret",
        )
        assert config.method == "GET"
        assert config.algorithm == "hmac-sha256"
        assert config.http_proto == "HTTP/1.1"


class TestAPPAuth:
    """Test APPAuth class"""

    @pytest.fixture
    def app_auth(self) -> APPAuth:
        """Create APPAuth instance for testing"""
        with patch.dict(
            os.environ,
            {
                "APP_AUTH_HOST": "test.example.com",
                "APP_AUTH_ROUTER": "/api/auth",
                "APP_AUTH_PROT": "https",
                "APP_AUTH_API_KEY": "test_key",
                "APP_AUTH_SECRET": "test_secret",
            },
        ):
            return APPAuth()

    def test_generate_signature(self, app_auth: APPAuth) -> None:
        """Test signature generation"""
        digest = "SHA256=test_digest"
        signature = app_auth.generate_signature(digest)

        assert isinstance(signature, str)
        assert len(signature) > 0

        # Verify signature format (base64)
        try:
            base64.b64decode(signature)
        except Exception:
            pytest.fail("Signature should be valid base64 encoded")

    def test_init_header(self, app_auth: APPAuth) -> None:
        """Test request header initialization"""
        data = "test_data"
        headers = app_auth.init_header(data)

        assert "Content-Type" in headers
        assert "Authorization" in headers
        assert "Digest" in headers
        assert "Host" in headers
        assert "Date" in headers
        assert headers["Content-Type"] == "application/json"
        assert "api_key" in headers["Authorization"]
        assert "signature" in headers["Authorization"]

    @pytest.mark.asyncio
    async def test_app_detail_success(self, app_auth: APPAuth) -> None:
        """Test successful retrieval of app details"""
        mock_response_data = {
            "code": 0,
            "data": [{"auth_list": [{"api_key": "key1", "api_secret": "secret1"}]}],
        }

        def mock_get(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001, D401
            """Synchronous mock, returns response object supporting async context manager protocol."""
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response_data)
            mock_resp.raise_for_status = MagicMock()
            # Support `async with session.get(...) as resp`
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch("aiohttp.ClientSession.get", new=mock_get):
            result = await app_auth.app_detail("test_app_id")

            assert result is not None
            assert result["code"] == 0

    @pytest.mark.asyncio
    async def test_app_detail_failure_status(self, app_auth: APPAuth) -> None:
        """Test failure to retrieve app details (non-200 status code)"""

        def mock_get(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001, D401
            """Synchronous mock, returns 404 response object."""
            mock_resp = AsyncMock()
            mock_resp.status = 404
            mock_resp.raise_for_status = MagicMock()
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch("aiohttp.ClientSession.get", new=mock_get):
            # In source code, the actual exception thrown is the replaced exception class instance in conftest, here catch as base exception
            with pytest.raises(Exception):
                await app_auth.app_detail("test_app_id")

    @pytest.mark.asyncio
    async def test_app_detail_timeout(self, app_auth: APPAuth) -> None:
        """Test timeout when retrieving app details"""

        async def mock_get(
            *args: Any, **kwargs: Any
        ) -> AsyncMock:  # noqa: ANN001, D401
            raise aiohttp.ClientError("timeout")

        with patch("aiohttp.ClientSession.get", new=mock_get):
            with pytest.raises(Exception):
                await app_auth.app_detail("test_app_id")


class TestMaasAuth:
    """Test MaasAuth class"""

    @pytest.fixture
    def maas_auth(self) -> MaasAuth:
        """Create MaasAuth instance for testing"""
        return MaasAuth(app_id="test_app", model_name="test_model")

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.mark.asyncio
    async def test_sk_success(self, maas_auth: MaasAuth, span: Span) -> None:
        """Test successful retrieval of SK"""
        mock_app_detail = {
            "code": 0,
            "data": [
                {"auth_list": [{"api_key": "test_key", "api_secret": "test_secret"}]}
            ],
        }

        with patch.object(APPAuth, "app_detail", return_value=mock_app_detail):
            sk = await maas_auth.sk(span)

            assert sk == "test_key:test_secret"

    @pytest.mark.asyncio
    async def test_sk_app_detail_none(self, maas_auth: MaasAuth, span: Span) -> None:
        """Test when app details are None"""
        with patch.object(APPAuth, "app_detail", return_value=None):
            with pytest.raises(Exception):
                await maas_auth.sk(span)

    @pytest.mark.asyncio
    async def test_sk_app_detail_code_not_zero(
        self, maas_auth: MaasAuth, span: Span
    ) -> None:
        """Test when app details return code is not 0"""
        mock_app_detail = {"code": 1, "message": "error message"}

        with patch.object(APPAuth, "app_detail", return_value=mock_app_detail):
            with pytest.raises(Exception):
                await maas_auth.sk(span)

    @pytest.mark.asyncio
    async def test_sk_empty_data(self, maas_auth: MaasAuth, span: Span) -> None:
        """Test empty data list"""
        mock_app_detail = {"code": 0, "data": []}

        with patch.object(APPAuth, "app_detail", return_value=mock_app_detail):
            with pytest.raises(Exception):
                await maas_auth.sk(span)

    @pytest.mark.asyncio
    async def test_sk_empty_auth_list(self, maas_auth: MaasAuth, span: Span) -> None:
        """Test empty authentication list"""
        mock_app_detail = {"code": 0, "data": [{"auth_list": []}]}

        with patch.object(APPAuth, "app_detail", return_value=mock_app_detail):
            with pytest.raises(Exception):
                await maas_auth.sk(span)
