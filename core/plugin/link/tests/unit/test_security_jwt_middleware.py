"""Unit tests for optional JWT auth middleware registration."""

import time
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from plugin.link.utils.security.jwt_auth_middleware import register_jwt_auth_middleware


@pytest.mark.unit
class TestJwtAuthMiddleware:
    """Validate middleware pass/fail behavior under feature switch."""

    def _build_app(self) -> FastAPI:
        app = FastAPI()

        @app.get("/ping")
        async def ping() -> dict:
            return {"ok": True}

        register_jwt_auth_middleware(app)
        return app

    def test_middleware_allows_valid_bearer(self) -> None:
        """Request with valid token should be accepted."""
        secret = "jwt-test-secret"
        token = jwt.encode(
            {
                "sub": "test-user",
                "exp": int(time.time()) + 300,
            },
            secret,
            algorithm="HS256",
        )

        with patch.dict(
            "os.environ",
            {
                "JWT_AUTH_ENABLE": "1",
                "JWT_SHARED_SECRET": secret,
                "JWT_ALGORITHMS": "HS256",
                "JWT_AUDIENCE": "",
                "JWT_ISSUER": "",
            },
            clear=False,
        ):
            client = TestClient(self._build_app())
            response = client.get("/ping", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 200
            assert response.json() == {"ok": True}

    def test_middleware_rejects_missing_bearer(self) -> None:
        """Request without Authorization header should be rejected."""
        with patch.dict(
            "os.environ",
            {
                "JWT_AUTH_ENABLE": "1",
                "JWT_SHARED_SECRET": "jwt-test-secret",
                "JWT_ALGORITHMS": "HS256",
                "JWT_AUDIENCE": "",
                "JWT_ISSUER": "",
            },
            clear=False,
        ):
            client = TestClient(self._build_app())
            response = client.get("/ping")
            assert response.status_code == 401

    def test_middleware_uses_to_thread_for_jwt_validation(self) -> None:
        """JWT validation should be offloaded via asyncio.to_thread."""
        with patch.dict(
            "os.environ",
            {
                "JWT_AUTH_ENABLE": "1",
                "JWT_SHARED_SECRET": "jwt-test-secret",
                "JWT_ALGORITHMS": "HS256",
                "JWT_AUDIENCE": "",
                "JWT_ISSUER": "",
            },
            clear=False,
        ):
            with patch(
                "plugin.link.utils.security.jwt_auth_middleware.asyncio.to_thread",
                new_callable=AsyncMock,
            ) as mock_to_thread:
                mock_to_thread.return_value = {"sub": "test-user"}

                client = TestClient(self._build_app())
                response = client.get(
                    "/ping",
                    headers={"Authorization": "Bearer any-token"},
                )

                assert response.status_code == 200
                assert mock_to_thread.await_count == 1
