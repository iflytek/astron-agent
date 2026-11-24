"""
Authentication middleware unit tests.

This module contains comprehensive unit tests for the AuthMiddleware class,
covering all core functionality including authentication flow, header validation,
API key verification and error handling scenarios.
"""

import hashlib
import hmac
import os
import time
from typing import List
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.base import (
    AUTH_OPEN_API_PATHS,
    CHAT_OPEN_API_PATHS,
    JSONResponseBase,
)
from workflow.extensions.fastapi.middleware.auth import (
    WORKFLOW_GATEWAY_SIGNATURE_HEADER,
    WORKFLOW_GATEWAY_TIMESTAMP_HEADER,
    WORKFLOW_INTERNAL_API_KEY_ENV,
    WORKFLOW_INTERNAL_API_KEY_HEADER,
    AuthMiddleware,
)
from workflow.utils.credentials import TENANT_INTERNAL_API_KEY_HEADER

pytestmark = pytest.mark.asyncio


def gateway_signature(
    key: str, method: str, path: str, app_id: str, timestamp: str
) -> str:
    payload = f"{method.upper()}\n{path}\n{app_id}\n{timestamp}".encode()
    return hmac.new(key.encode(), payload, hashlib.sha256).hexdigest()


def create_mock_span_context() -> tuple[Mock, Mock]:
    """Create a properly configured mock span context."""
    mock_span_ctx = Mock()
    mock_span_ctx.__enter__ = Mock(return_value=mock_span_ctx)
    mock_span_ctx.__exit__ = Mock(return_value=None)
    mock_span_ctx.sid = ""
    mock_span_ctx.record_exception = Mock()
    mock_span_ctx.add_info_event_async = AsyncMock()

    mock_span = Mock()
    mock_span.start.return_value = mock_span_ctx

    return mock_span, mock_span_ctx


class MockASGIApp:
    """Mock ASGI application for testing purposes."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": 200,
                "headers": [],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b"test response",
            }
        )


class TestAuthMiddleware:
    """Test cases for AuthMiddleware class."""

    @pytest.fixture
    def mock_app(self) -> ASGIApp:
        """Create a mock ASGI application."""
        return MockASGIApp()

    @pytest.fixture
    def auth_middleware(self, mock_app: ASGIApp) -> AuthMiddleware:
        """Create an AuthMiddleware instance for testing."""
        return AuthMiddleware(mock_app)

    @pytest.fixture
    def mock_request(self) -> Mock:
        """Create a mock request object."""
        request = Mock(spec=Request)
        request.url.path = "/api/test"
        request.headers = {}
        request.scope = {"headers": []}
        return request

    @pytest.fixture
    def mock_call_next(self) -> AsyncMock:
        """Create a mock call_next function."""
        mock_response = Mock()
        mock_response.status_code = 200
        call_next = AsyncMock(return_value=mock_response)
        return call_next

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_KEY": "k" * 32, "APP_MANAGE_PLAT_SECRET": "s" * 32},
        clear=True,
    )
    def test_init_with_env_vars(self, mock_app: ASGIApp) -> None:
        """Test AuthMiddleware initialization with environment variables."""
        middleware = AuthMiddleware(mock_app)

        assert middleware.api_key == "k" * 32
        assert middleware.api_secret == "s" * 32

    @pytest.mark.parametrize(
        ("api_key", "api_secret"),
        [
            ("short", "also-short"),
            (
                "7b709739e8da44536127a333c7603a83",
                "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy",
            ),
        ],
    )
    def test_init_rejects_weak_or_published_management_credentials(
        self,
        mock_app: ASGIApp,
        api_key: str,
        api_secret: str,
    ) -> None:
        with patch.dict(
            os.environ,
            {
                "APP_MANAGE_PLAT_KEY": api_key,
                "APP_MANAGE_PLAT_SECRET": api_secret,
            },
            clear=True,
        ):
            middleware = AuthMiddleware(mock_app)

        assert middleware.api_key == ""
        assert middleware.api_secret == ""

    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_env_vars(self, mock_app: ASGIApp) -> None:
        """Test AuthMiddleware initialization without environment variables."""
        middleware = AuthMiddleware(mock_app)

        assert middleware.api_key == ""
        assert middleware.api_secret == ""

    async def test_dispatch_excluded_path(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch skips authentication for excluded paths."""
        auth_middleware.need_auth_paths = ["/health", "/metrics"]
        mock_request.url.path = "/health/check"

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            result = await auth_middleware.dispatch(mock_request, mock_call_next)

            assert result == mock_call_next.return_value
            mock_call_next.assert_called_once_with(mock_request)

    async def test_dispatch_rejects_untrusted_x_consumer_username(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """A caller cannot bypass a protected route with a forged identity header."""
        mock_request.headers = {"x-consumer-username": "test_user"}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span
            with patch.object(
                JSONResponseBase, "generate_error_response"
            ) as mock_error_response:
                mock_error_response.return_value = {"error": "authorization required"}

                result = await auth_middleware.dispatch(mock_request, mock_call_next)

                assert result == {"error": "authorization required"}
                mock_call_next.assert_not_called()

    @patch.dict(
        os.environ,
        {WORKFLOW_INTERNAL_API_KEY_ENV: "i" * 32},
        clear=False,
    )
    async def test_dispatch_trusts_consumer_from_authenticated_internal_peer(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        mock_request.headers = {
            "x-consumer-username": "test_user",
            WORKFLOW_INTERNAL_API_KEY_HEADER: "i" * 32,
        }
        mock_request.scope["headers"] = [
            (b"x-consumer-username", b"test_user"),
            (WORKFLOW_INTERNAL_API_KEY_HEADER.lower().encode(), b"i" * 32),
        ]
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        result = await auth_middleware.dispatch(mock_request, mock_call_next)

        assert result == mock_call_next.return_value
        mock_call_next.assert_called_once_with(mock_request)
        assert mock_request.scope["headers"] == [(b"x-consumer-username", b"test_user")]

    @patch.dict(
        os.environ,
        {WORKFLOW_INTERNAL_API_KEY_ENV: "g" * 32},
        clear=False,
    )
    async def test_dispatch_trusts_short_lived_gateway_identity_signature(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        timestamp = "1700000000"
        app_id = "gateway-app"
        path = CHAT_OPEN_API_PATHS[0]
        signature = gateway_signature("g" * 32, "POST", path, app_id, timestamp)
        assert (
            signature
            == "6261d5595286ac9407951e6c4c690bd1c50c2fbfe4f29addc50e3f437ef6a871"
        )
        mock_request.method = "POST"
        mock_request.url.path = path
        mock_request.headers = {
            "x-consumer-username": app_id,
            WORKFLOW_GATEWAY_TIMESTAMP_HEADER: timestamp,
            WORKFLOW_GATEWAY_SIGNATURE_HEADER: signature,
        }
        mock_request.scope["headers"] = [
            (b"x-consumer-username", app_id.encode()),
            (WORKFLOW_GATEWAY_TIMESTAMP_HEADER.lower().encode(), timestamp.encode()),
            (WORKFLOW_GATEWAY_SIGNATURE_HEADER.lower().encode(), signature.encode()),
        ]

        with patch(
            "workflow.extensions.fastapi.middleware.auth.time.time",
            return_value=1700000000,
        ):
            result = await auth_middleware.dispatch(mock_request, mock_call_next)

        assert result == mock_call_next.return_value
        assert mock_request.scope["headers"] == [
            (b"x-consumer-username", app_id.encode())
        ]

    @pytest.mark.parametrize("invalid_assertion", ["expired", "wrong-signature"])
    @patch.dict(
        os.environ,
        {WORKFLOW_INTERNAL_API_KEY_ENV: "g" * 32},
        clear=False,
    )
    async def test_dispatch_rejects_invalid_gateway_identity_signature(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
        invalid_assertion: str,
    ) -> None:
        timestamp = str(
            int(time.time()) - 120
            if invalid_assertion == "expired"
            else int(time.time())
        )
        path = CHAT_OPEN_API_PATHS[0]
        signature = gateway_signature("g" * 32, "POST", path, "forged-app", timestamp)
        if invalid_assertion == "wrong-signature":
            signature = "0" * 64
        mock_request.method = "POST"
        mock_request.url.path = path
        mock_request.headers = {
            "authorization": "Bearer public-key:public-secret",
            "x-consumer-username": "forged-app",
            WORKFLOW_GATEWAY_TIMESTAMP_HEADER: timestamp,
            WORKFLOW_GATEWAY_SIGNATURE_HEADER: signature,
        }
        mock_request.scope["headers"] = [
            (b"authorization", b"Bearer public-key:public-secret"),
            (b"x-consumer-username", b"forged-app"),
            (WORKFLOW_GATEWAY_TIMESTAMP_HEADER.lower().encode(), timestamp.encode()),
            (WORKFLOW_GATEWAY_SIGNATURE_HEADER.lower().encode(), signature.encode()),
        ]

        with patch.object(
            auth_middleware,
            "_get_app_source_detail_with_api_key",
            new=AsyncMock(return_value="verified-app"),
        ):
            await auth_middleware.dispatch(mock_request, mock_call_next)

        assert (b"x-consumer-username", b"verified-app") in mock_request.scope[
            "headers"
        ]
        assert (b"x-consumer-username", b"forged-app") not in mock_request.scope[
            "headers"
        ]
        assert not any(
            name.lower()
            in {
                WORKFLOW_GATEWAY_TIMESTAMP_HEADER.lower().encode(),
                WORKFLOW_GATEWAY_SIGNATURE_HEADER.lower().encode(),
            }
            for name, _ in mock_request.scope["headers"]
        )

    async def test_dispatch_missing_authorization_header(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch returns error when authorization header is missing."""
        mock_request.headers = {}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            with patch.object(
                JSONResponseBase, "generate_error_response"
            ) as mock_error_response:
                mock_error_response.return_value = {"error": "authorization required"}

                result = await auth_middleware.dispatch(mock_request, mock_call_next)

                assert result == {"error": "authorization required"}
                mock_error_response.assert_called_once_with(
                    AUTH_OPEN_API_PATHS[0], "authorization header is required", ""
                )
                mock_call_next.assert_not_called()

    async def test_dispatch_successful_authentication(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test successful authentication flow."""
        mock_request.headers = {"authorization": "Bearer test_key:test_value"}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            with patch.object(
                auth_middleware, "_get_app_source_detail_with_api_key"
            ) as mock_get_app:
                mock_get_app.return_value = "test_app_id"

                result = await auth_middleware.dispatch(mock_request, mock_call_next)

                assert result == mock_call_next.return_value
                mock_call_next.assert_called_once_with(mock_request)

                # Verify x-consumer-username header is added
                headers = dict(mock_request.scope["headers"])
                assert b"x-consumer-username" in headers
                assert headers[b"x-consumer-username"] == b"test_app_id"

    def test_gen_app_auth_header_with_credentials(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test authentication header generation with valid credentials."""
        auth_middleware.api_key = "test_key"
        auth_middleware.api_secret = "test_secret"

        with patch(
            "common.utils.hmac_auth.HMACAuth.build_auth_header"
        ) as mock_build_auth:
            mock_build_auth.return_value = {"Authorization": "test_auth_header"}

            result = auth_middleware._gen_app_auth_header(
                "https://api.test.com/endpoint"
            )

            assert result == {
                "Authorization": "test_auth_header",
                TENANT_INTERNAL_API_KEY_HEADER: "test_secret",
            }
            mock_build_auth.assert_called_once_with(
                request_url="https://api.test.com/endpoint",
                api_key="test_key",
                api_secret="test_secret",
            )

    def test_gen_app_auth_header_without_credentials(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test authentication header generation without credentials."""
        auth_middleware.api_key = ""
        auth_middleware.api_secret = ""

        result = auth_middleware._gen_app_auth_header("https://api.test.com/endpoint")

        assert result == {}

    @pytest.mark.parametrize(
        "api_key,api_secret",
        [("", "secret"), ("key", ""), (None, "secret"), ("key", None)],
    )
    def test_gen_app_auth_header_partial_credentials(
        self, auth_middleware: AuthMiddleware, api_key: str, api_secret: str
    ) -> None:
        """Test authentication header generation with partial credentials."""
        auth_middleware.api_key = api_key
        auth_middleware.api_secret = api_secret

        result = auth_middleware._gen_app_auth_header("https://api.test.com/endpoint")

        assert result == {}

    @pytest.mark.parametrize(
        "need_auth_paths,request_path,should_skip",
        [
            (["/health", "/metrics"], "/health", False),
            (["/health", "/metrics"], "/health/check", True),
            (["/health", "/metrics"], "/metrics", False),
            (["/health", "/metrics"], "/api/test", True),
            ([], "/health", True),
            (["/api/v1"], "/api/v2/test", True),
        ],
    )
    async def test_dispatch_need_auth_paths_parametrized(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
        need_auth_paths: List[str],
        request_path: str,
        should_skip: bool,
    ) -> None:
        """Test dispatch exclude paths with various scenarios."""
        auth_middleware.need_auth_paths = need_auth_paths
        mock_request.url.path = request_path

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            if should_skip:
                result = await auth_middleware.dispatch(mock_request, mock_call_next)
                assert result == mock_call_next.return_value
                mock_call_next.assert_called_once_with(mock_request)
            else:
                # For non-skipped paths, need to handle missing auth header
                with patch.object(
                    JSONResponseBase, "generate_error_response"
                ) as mock_error_response:
                    mock_error_response.return_value = {"error": "auth required"}
                    result = await auth_middleware.dispatch(
                        mock_request, mock_call_next
                    )
                    mock_call_next.assert_not_called()

    @pytest.mark.parametrize(
        "x_consumer_username",
        [
            "user123",
            "test@example.com",
            "user-with-dashes",
            "user_with_underscores",
            "123456",
        ],
    )
    @patch.dict(
        os.environ,
        {WORKFLOW_INTERNAL_API_KEY_ENV: "t" * 32},
        clear=False,
    )
    async def test_dispatch_x_consumer_username_values(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
        x_consumer_username: str,
    ) -> None:
        """Authenticated internal peers may supply supported consumer ID values."""
        mock_request.headers = {
            "x-consumer-username": x_consumer_username,
            WORKFLOW_INTERNAL_API_KEY_HEADER: "t" * 32,
        }
        mock_request.scope["headers"] = [
            (b"x-consumer-username", x_consumer_username.encode()),
            (WORKFLOW_INTERNAL_API_KEY_HEADER.lower().encode(), b"t" * 32),
        ]
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            result = await auth_middleware.dispatch(mock_request, mock_call_next)

            assert result == mock_call_next.return_value
            mock_call_next.assert_called_once_with(mock_request)
            assert mock_request.scope["headers"] == [
                (b"x-consumer-username", x_consumer_username.encode())
            ]

    async def test_dispatch_wrong_internal_key_uses_verified_bearer_identity(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        mock_request.headers = {
            "authorization": "Bearer public-key:public-secret",
            "x-consumer-username": "forged-app",
            WORKFLOW_INTERNAL_API_KEY_HEADER: "wrong-internal-key",
        }
        mock_request.scope["headers"] = [
            (b"authorization", b"Bearer public-key:public-secret"),
            (b"x-consumer-username", b"forged-app"),
            (WORKFLOW_INTERNAL_API_KEY_HEADER.lower().encode(), b"wrong-internal-key"),
        ]
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch.object(
            auth_middleware,
            "_get_app_source_detail_with_api_key",
            new=AsyncMock(return_value="verified-app"),
        ):
            await auth_middleware.dispatch(mock_request, mock_call_next)

        raw_headers = mock_request.scope["headers"]
        assert raw_headers.count((b"x-consumer-username", b"verified-app")) == 1
        assert not any(
            name.lower() == WORKFLOW_INTERNAL_API_KEY_HEADER.lower().encode()
            for name, _ in raw_headers
        )
        assert (b"x-consumer-username", b"forged-app") not in raw_headers

    async def test_dispatch_x_consumer_username_empty_string(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch with empty x-consumer-username header requires auth."""
        mock_request.headers = {"x-consumer-username": ""}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            with patch.object(
                JSONResponseBase, "generate_error_response"
            ) as mock_error_response:
                mock_error_response.return_value = {"error": "authorization required"}

                result = await auth_middleware.dispatch(mock_request, mock_call_next)

                assert result == {"error": "authorization required"}
                mock_error_response.assert_called_once_with(
                    AUTH_OPEN_API_PATHS[0], "authorization header is required", ""
                )
                mock_call_next.assert_not_called()

    async def test_dispatch_custom_exception_handling(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch handles CustomException from _get_app_source_detail_with_api_key."""
        mock_request.headers = {"authorization": "Bearer test_key:test_value"}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]
        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            custom_error = CustomException(
                CodeEnum.PARAM_ERROR, err_msg="Invalid API key format"
            )

            with patch.object(
                auth_middleware, "_get_app_source_detail_with_api_key"
            ) as mock_get_app:
                mock_get_app.side_effect = custom_error

                with patch.object(
                    JSONResponseBase, "generate_error_response"
                ) as mock_error_response:
                    mock_error_response.return_value = {"error": "custom error"}

                    result = await auth_middleware.dispatch(
                        mock_request, mock_call_next
                    )

                    assert result == {"error": "custom error"}
                    mock_error_response.assert_called_once_with(
                        AUTH_OPEN_API_PATHS[0],
                        custom_error.message,
                        "",
                        custom_error.code,
                    )
                    # Exception handling is working as shown by the error response
                    mock_call_next.assert_not_called()

    async def test_dispatch_generic_exception_handling(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch handles generic Exception from _get_app_source_detail_with_api_key."""
        mock_request.headers = {"authorization": "Bearer test_key:test_value"}
        mock_request.url.path = AUTH_OPEN_API_PATHS[0]

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            generic_error = Exception("Network error")

            with patch.object(
                auth_middleware, "_get_app_source_detail_with_api_key"
            ) as mock_get_app:
                mock_get_app.side_effect = generic_error

                with patch.object(
                    JSONResponseBase, "generate_error_response"
                ) as mock_error_response:
                    mock_error_response.return_value = {"error": "generic error"}

                    result = await auth_middleware.dispatch(
                        mock_request, mock_call_next
                    )

                    assert result == {"error": "generic error"}
                    mock_error_response.assert_called_once_with(
                        AUTH_OPEN_API_PATHS[0],
                        CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.msg,
                        "",
                        CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code,
                    )
                    # Exception handling is working as shown by the error response
                    mock_call_next.assert_not_called()

    @pytest.mark.parametrize(
        "authorization_header,expected_api_key,expected_api_secret",
        [
            ("Bearer test_key:test_secret", "test_key", "test_secret"),
            ("Bearer api_key_123:secret_456", "api_key_123", "secret_456"),
            ("Bearer key:value:extra", "key", "value:extra"),
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_api_key_parsing(
        self,
        auth_middleware: AuthMiddleware,
        authorization_header: str,
        expected_api_key: str,
        expected_api_secret: str,
    ) -> None:
        """Test API key parsing from authorization header."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "code": 0,
                "data": {"appid": "test_app_id"},
            }
            mock_response.text = "success"
            mock_post.return_value = mock_response

            result = await auth_middleware._get_app_source_detail_with_api_key(
                authorization_header, mock_span
            )

            assert result == "test_app_id"
            mock_post.assert_called_once_with(
                "https://api.example.com/v2/app/key/verify",
                json={
                    "api_key": expected_api_key,
                    "api_secret": expected_api_secret,
                },
                headers={},
            )

    @pytest.mark.parametrize(
        "authorization_header",
        [
            "Bearer :",
            "Bearer :value",
            "InvalidFormat",
            "Bearer key:",
        ],
    )
    async def test_get_app_source_detail_invalid_auth_format(
        self, auth_middleware: AuthMiddleware, authorization_header: str
    ) -> None:
        """Test _get_app_source_detail_with_api_key with invalid authorization formats."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch.dict(
            os.environ,
            {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
            clear=False,
        ):
            with pytest.raises(CustomException):
                await auth_middleware._get_app_source_detail_with_api_key(
                    authorization_header, mock_span
                )

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_checks_current_tenant_state(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        mock_span = Mock(add_info_event_async=AsyncMock())
        enabled = Mock(status_code=200)
        enabled.json.return_value = {"code": 0, "data": {"appid": "test_app_id"}}
        disabled = Mock(status_code=200)
        disabled.json.return_value = {"code": 3003, "message": "app id not exist"}
        authorization = "Bearer test_key:test_secret"

        with patch("httpx.AsyncClient.post", side_effect=[enabled, disabled]) as post:
            assert (
                await auth_middleware._get_app_source_detail_with_api_key(
                    authorization, mock_span
                )
                == "test_app_id"
            )
            with pytest.raises(CustomException) as exc:
                await auth_middleware._get_app_source_detail_with_api_key(
                    authorization, mock_span
                )

        assert post.await_count == 2
        assert exc.value.code == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_http_error_status(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test _get_app_source_detail_with_api_key with HTTP error status."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch("httpx.AsyncClient.post") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = "Not found"
            mock_get.return_value = mock_response

            with pytest.raises(CustomException) as exc_info:
                await auth_middleware._get_app_source_detail_with_api_key(
                    "Bearer test_key:test_secret", mock_span
                )

            assert exc_info.value.code == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
            mock_span.add_info_event_async.assert_called_once_with(
                "Application management platform credential verification completed"
            )

    @pytest.mark.parametrize(
        "response_code,expected_error",
        [
            (1, "Error from remote API"),
            (-1, "Invalid response code"),
            (404, "Resource not found"),
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_api_error_codes(
        self, auth_middleware: AuthMiddleware, response_code: int, expected_error: str
    ) -> None:
        """Test _get_app_source_detail_with_api_key with various API error codes."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch("httpx.AsyncClient.post") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "code": response_code,
                "message": expected_error,
            }
            mock_response.text = f"Response with code {response_code}"
            mock_get.return_value = mock_response

            with pytest.raises(CustomException) as exc_info:
                await auth_middleware._get_app_source_detail_with_api_key(
                    "Bearer test_key:test_secret", mock_span
                )

            assert exc_info.value.code == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code

    @pytest.mark.parametrize(
        "response_data,expected_appid",
        [
            ({"data": {"appid": "valid_app_123"}}, "valid_app_123"),
            ({"data": {"appid": "another_app_456"}}, "another_app_456"),
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_valid_responses(
        self, auth_middleware: AuthMiddleware, response_data: dict, expected_appid: str
    ) -> None:
        """Test _get_app_source_detail_with_api_key with valid API responses."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch("httpx.AsyncClient.post") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"code": 0, **response_data}
            mock_response.text = "success"
            mock_get.return_value = mock_response

            result = await auth_middleware._get_app_source_detail_with_api_key(
                "Bearer test_key:test_secret", mock_span
            )

            assert result == expected_appid

    @pytest.mark.parametrize(
        "response_data",
        [
            {"data": {}},  # Missing appid
            {"data": {"appid": ""}},  # Empty appid
            {"data": {"appid": None}},  # None appid
            {},  # Missing data key
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_missing_appid(
        self, auth_middleware: AuthMiddleware, response_data: dict
    ) -> None:
        """Test _get_app_source_detail_with_api_key with missing or invalid appid."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()

        with patch("httpx.AsyncClient.post") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"code": 0, **response_data}
            mock_response.text = "success"
            mock_get.return_value = mock_response

            with pytest.raises(CustomException) as exc_info:
                await auth_middleware._get_app_source_detail_with_api_key(
                    "Bearer test_key:test_secret", mock_span
                )

            assert exc_info.value.code == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
            assert "appid is null" in exc_info.value.message

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_auth_header_generation(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test that _get_app_source_detail_with_api_key calls _gen_app_auth_header."""
        mock_span = Mock()
        mock_span.add_info_event_async = AsyncMock()
        auth_middleware.api_key = "test_key"
        auth_middleware.api_secret = "test_secret"

        with patch.object(auth_middleware, "_gen_app_auth_header") as mock_gen_auth:
            mock_gen_auth.return_value = {"Authorization": "test_header"}

            with patch("httpx.AsyncClient.post") as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    "code": 0,
                    "data": {"appid": "test_app_id"},
                }
                mock_response.text = "success"
                mock_get.return_value = mock_response

                await auth_middleware._get_app_source_detail_with_api_key(
                    "Bearer test_key:test_secret", mock_span
                )

                mock_gen_auth.assert_called_once_with(
                    "https://api.example.com/v2/app/key/verify"
                )
                mock_get.assert_called_once_with(
                    "https://api.example.com/v2/app/key/verify",
                    json={"api_key": "test_key", "api_secret": "test_secret"},
                    headers={"Authorization": "test_header"},
                )
