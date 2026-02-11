"""
Test cases for API module.

This module tests API functionality including:
- OTLP middleware
- Exception handling
- Dynamic API route registration
"""

from typing import Any, Dict

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import (
    ServiceException,
    register_exception_handlers,
)


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
            enabled="0",  # For Unit tests, we disable OTLP
        )

        router = APIRouter(prefix="/aitools/v1")
        register_api_services(router)
        register_exception_handlers(app)
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

    def test_http_exception_handled(self, client: TestClient) -> None:
        """HTTP exception is handled"""
        resp = client.get("/http_error")
        body = resp.json()

        assert resp.status_code == 200
        assert body["code"] == 404
        assert body["message"] == "not found"
        assert "sid" in body

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
