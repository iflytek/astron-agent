"""
Test cases for API module.

This module tests API functionality including:
- OTLP middleware
- Exception handling
- Dynamic API route registration
"""

from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware, get_host_ip
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException


class FakeService:  # pylint: disable=too-few-public-methods
    """Fake service for testing."""

    __api_meta__: ApiMeta

    def __init__(self, *, path: str, method: str) -> None:
        self.__api_meta__ = ApiMeta(
            path=path,
            method=method,
            response=None,
            summary="fake service",
            description="fake dynamically registered service",
            tags=["public_cn"],
            deprecated=False,
        )

        self.__name__ = "fake_service"

    def __call__(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return {"ok": True}


def make_fake_service(
    *,
    path: str,
    method: str = "POST",
) -> FakeService:
    """Make a fake service with given path and method."""
    return FakeService(path=path, method=method)


class TestGetHostIP:
    """Test cases for get_host_ip function."""

    @patch("socket.socket")
    def test_get_host_ip_success(self, mock_socket: MagicMock) -> None:
        """Test get_host_ip returns IP successfully."""
        mock_sock = MagicMock()
        mock_sock.getsockname.return_value = ("192.168.1.1", 12345)
        mock_socket.return_value = mock_sock

        result = get_host_ip()
        assert result == "192.168.1.1"
        mock_sock.connect.assert_called_once_with(("8.8.8.8", 80))
        mock_sock.close.assert_called_once()

    @patch("socket.socket")
    def test_get_host_ip_exception(self, mock_socket: MagicMock) -> None:
        """Test get_host_ip raises exception on error."""
        mock_socket.side_effect = Exception("socket error")

        with pytest.raises(Exception) as exc_info:
            get_host_ip()
        assert "failed to get local ip" in str(exc_info.value)


class TestOTLPMiddleware:
    """Test cases for OTLPMiddleware class."""

    def test_middleware_init_default(self) -> None:
        """Test middleware initialization with defaults."""
        app = MagicMock()
        middleware = OTLPMiddleware(app)

        assert middleware.enabled is False
        assert middleware.sample_rate == 1.0
        assert middleware.include_paths == ["/aitools/v1"]

    def test_middleware_init_custom(self) -> None:
        """Test middleware initialization with custom values."""
        app = MagicMock()
        middleware = OTLPMiddleware(
            app,
            enabled=True,
            sample_rate=0.5,
            include_paths=["/custom"],
        )

        assert middleware.enabled is True
        assert middleware.sample_rate == 0.5
        assert middleware.include_paths == ["/custom"]

    def test_should_skip_when_disabled(self) -> None:
        """Test should_skip returns True when disabled."""
        app = MagicMock()
        middleware = OTLPMiddleware(app, enabled=False)

        mock_request = MagicMock()
        mock_request.url.path = "/aitools/v1/test"

        assert middleware._should_skip(mock_request) is True

    def test_should_skip_with_sampling(self) -> None:
        """Test should_skip with sampling."""
        app = MagicMock()
        middleware = OTLPMiddleware(app, enabled=True, sample_rate=0.0)

        mock_request = MagicMock()
        mock_request.url.path = "/aitools/v1/test"

        # With sample_rate=0, should always skip
        result = middleware._should_skip(mock_request)
        assert result is True

    def test_should_skip_path_not_matching(self) -> None:
        """Test should_skip when path doesn't match include_paths."""
        app = MagicMock()
        middleware = OTLPMiddleware(app, enabled=True, include_paths=["/aitools/v1"])

        mock_request = MagicMock()
        mock_request.url.path = "/other/path"

        assert middleware._should_skip(mock_request) is True

    def test_should_skip_path_matching(self) -> None:
        """Test should_skip when path matches include_paths."""
        app = MagicMock()
        middleware = OTLPMiddleware(app, enabled=True, include_paths=["/aitools/v1"])

        mock_request = MagicMock()
        mock_request.url.path = "/aitools/v1/test"

        assert middleware._should_skip(mock_request) is False

    def test_build_span_attributes(self) -> None:
        """Test _build_span_attributes builds correct attributes."""
        app = MagicMock()
        middleware = OTLPMiddleware(app, enabled=True)

        mock_request = MagicMock()
        mock_request.method = "POST"
        mock_request.url = MagicMock()
        mock_request.url.__str__ = MagicMock(return_value="http://test.com/path")

        attrs = middleware._build_span_attributes(mock_request)

        assert attrs["http.method"] == "POST"
        assert "http.url" in attrs


class TestOTLPMiddlewareWithDynamicRoutes:
    """
    Integration tests for:
    - OTLPMiddleware
    - Dynamic API route registration
    """

    @pytest.fixture
    def app(self, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
        """
        FastAPI app with:
        - OTLPMiddleware enabled
        - Dynamically registered routes
        """
        fake_services = [
            make_fake_service(path="/ocr"),
            make_fake_service(path="/translation"),
        ]

        monkeypatch.setattr(
            "plugin.aitools.api.routes.register.iter_api_services",
            lambda: fake_services,
        )

        app = FastAPI()
        app.add_middleware(
            OTLPMiddleware,
            enabled=False,  # For Unit tests, we disable OTLP
        )

        router = APIRouter(prefix="/aitools/v1")
        register_api_services(router)
        app.include_router(router)

        # normal routes (non-dynamic)
        @app.get("/ok")
        async def ok() -> Dict[str, Any]:
            return {"msg": "ok"}

        @app.get("/health")
        async def health() -> Dict[str, Any]:
            return {"status": "ok"}

        @app.get("/http_error")
        async def http_error() -> None:
            raise HTTPException(status_code=404, detail="not found")

        @app.get("/service_error")
        async def service_error() -> None:
            raise ServiceException(code=1234, message="service failed")

        @app.get("/crash")
        async def crash() -> None:
            raise RuntimeError("boom")

        return app

    @pytest.fixture
    def client(self, app: FastAPI) -> TestClient:
        """Client"""
        return TestClient(app, raise_server_exceptions=False)

    def test_normal_request_passes_through(self, client: TestClient) -> None:
        """normal request passes through"""
        resp = client.get("/ok")
        assert resp.status_code == 200
        assert resp.json()["msg"] == "ok"

    def test_excluded_path_skips_middleware(self, client: TestClient) -> None:
        """skip middleware for excluded path"""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_service_exception_handled(self, client: TestClient) -> None:
        """Service exception is handled"""
        resp = client.get("/service_error")
        body = resp.json()

        assert resp.status_code == 200
        assert body["code"] == 1234
        assert body["message"] == "service failed"
        assert "sid" in body

    def test_generic_exception_handled(self, client: TestClient) -> None:
        """Generic exception is handled"""
        resp = client.get("/crash")
        body = resp.json()

        assert resp.status_code == 200
        assert body["code"] == CodeEnums.ServiceInernalError.code
        assert "boom" in body["message"]
        assert "sid" in body

    def test_dynamic_route_exists(self, client: TestClient) -> None:
        """Dynamic route exists"""
        resp = client.post("/aitools/v1/ocr", json={})
        assert resp.status_code in (200, 422)

    def test_dynamic_route_prefix_applied(self, client: TestClient) -> None:
        """Dynamic route prefix is applied"""
        resp = client.post("/aitools/v1/translation", json={})
        assert resp.status_code in (200, 422)

    def test_invalid_dynamic_route_returns_404(self, client: TestClient) -> None:
        """Invalid dynamic route returns 404"""
        resp = client.get("/aitools/v1/not-exist")
        assert resp.status_code == 404

    def test_http_exception_propagates(self, client: TestClient) -> None:
        """HTTP exception propagates to FastAPI"""
        # Note: HTTPException is not caught by OTLPMiddleware's exception handlers
        # It propagates as a 404 response
        resp = client.get("/http_error")
        assert resp.status_code == 404
