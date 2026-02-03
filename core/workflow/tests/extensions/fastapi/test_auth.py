"""
Authentication middleware unit tests.

This module contains comprehensive unit tests for the AuthMiddleware class,
covering all core functionality including authentication flow, header validation,
API key verification, cache operations, and error handling scenarios.
"""

import os
from typing import List
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.base import AUTH_OPEN_API_PATHS, JSONResponseBase
from workflow.extensions.fastapi.middleware.auth import AuthMiddleware

pytestmark = pytest.mark.asyncio


def create_mock_span_context() -> tuple[AsyncMock, Mock]:
    """Create a properly configured mock span context."""
    mock_span_ctx = Mock()
    mock_span_ctx.__enter__ = Mock(return_value=mock_span_ctx)
    mock_span_ctx.__exit__ = Mock(return_value=None)
    mock_span_ctx.sid = ""
    mock_span_ctx.record_exception = Mock()
    mock_span_ctx.add_info_event_async = Mock()

    mock_span = AsyncMock()
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
        {"APP_MANAGE_PLAT_KEY": "test_key", "APP_MANAGE_PLAT_SECRET": "test_secret"},
    )
    def test_init_with_env_vars(self, mock_app: ASGIApp) -> None:
        """Test AuthMiddleware initialization with environment variables."""
        middleware = AuthMiddleware(mock_app)

        assert middleware.api_key == "test_key"
        assert middleware.api_secret == "test_secret"

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

    async def test_dispatch_with_x_consumer_username(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
    ) -> None:
        """Test dispatch bypasses auth when x-consumer-username header is present."""
        mock_request.headers = {"x-consumer-username": "test_user"}

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            result = await auth_middleware.dispatch(mock_request, mock_call_next)

            assert result == mock_call_next.return_value
            mock_call_next.assert_called_once_with(mock_request)

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

            assert result == {"Authorization": "test_auth_header"}
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

    async def test_get_app_id_with_cache(self, auth_middleware: AuthMiddleware) -> None:
        """Test _get_app_id_with_cache method."""
        with patch(
            "workflow.extensions.fastapi.middleware.auth.get_cache_service"
        ) as mock_get_cache:
            mock_cache = {"workflow:app:api_key:test_key": "cached_app_id"}
            mock_get_cache.return_value = mock_cache

            result = auth_middleware._get_app_id_with_cache("test_key")

            assert result == "cached_app_id"

    async def test_set_app_id_with_cache(self, auth_middleware: AuthMiddleware) -> None:
        """Test _set_app_id_with_cache method."""
        with patch(
            "workflow.extensions.fastapi.middleware.auth.get_cache_service"
        ) as mock_get_cache:
            mock_cache: dict = {}
            mock_get_cache.return_value = mock_cache

            auth_middleware._set_app_id_with_cache("test_key", "test_app_id")

            assert mock_cache["workflow:app:api_key:test_key"] == "test_app_id"

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
    async def test_dispatch_x_consumer_username_values(
        self,
        auth_middleware: AuthMiddleware,
        mock_request: Mock,
        mock_call_next: AsyncMock,
        x_consumer_username: str,
    ) -> None:
        """Test dispatch with various x-consumer-username header values."""
        mock_request.headers = {"x-consumer-username": x_consumer_username}

        with patch("workflow.extensions.otlp.trace.span.Span") as mock_span_class:
            mock_span, mock_span_ctx = create_mock_span_context()
            mock_span_class.return_value = mock_span

            result = await auth_middleware.dispatch(mock_request, mock_call_next)

            assert result == mock_call_next.return_value
            mock_call_next.assert_called_once_with(mock_request)

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
        "authorization_header,expected_api_key",
        [
            ("Bearer test_key:test_secret", "test_key"),
            ("Bearer api_key_123:secret_456", "api_key_123"),
            ("Bearer key:value:extra", "key"),
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_api_key_parsing(
        self,
        auth_middleware: AuthMiddleware,
        authorization_header: str,
        expected_api_key: str,
    ) -> None:
        """Test API key parsing from authorization header."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch("httpx.AsyncClient.get") as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    "code": 0,
                    "data": {"appid": "test_app_id"},
                }
                mock_response.text = "success"
                mock_get.return_value = mock_response

                with patch.object(auth_middleware, "_set_app_id_with_cache"):
                    result = await auth_middleware._get_app_source_detail_with_api_key(
                        authorization_header, mock_span
                    )

                    assert result == "test_app_id"
                    mock_get_cache.assert_called_once_with(expected_api_key)

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
        mock_span = AsyncMock()

        with patch.dict(
            os.environ,
            {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
            clear=False,
        ):
            # For "Bearer key:" case, this will not raise an exception as api_key will be "key"
            if authorization_header == "Bearer key:":
                with patch.object(
                    auth_middleware, "_get_app_id_with_cache"
                ) as mock_get_cache:
                    mock_get_cache.return_value = None

                    with patch("httpx.AsyncClient.get") as mock_get:
                        mock_response = Mock()
                        mock_response.status_code = 404
                        mock_response.text = "Not found"
                        mock_get.return_value = mock_response

                        with pytest.raises(CustomException):
                            await auth_middleware._get_app_source_detail_with_api_key(
                                authorization_header, mock_span
                            )
            else:
                with pytest.raises((CustomException, IndexError)):
                    await auth_middleware._get_app_source_detail_with_api_key(
                        authorization_header, mock_span
                    )

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_with_cache_hit(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test _get_app_source_detail_with_api_key returns cached result."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = "cached_app_id"

            result = await auth_middleware._get_app_source_detail_with_api_key(
                "Bearer test_key:test_secret", mock_span
            )

            assert result == "cached_app_id"
            mock_get_cache.assert_called_once_with("test_key")

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_http_error_status(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test _get_app_source_detail_with_api_key with HTTP error status."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch("httpx.AsyncClient.get") as mock_get:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.text = "Not found"
                mock_get.return_value = mock_response

                with pytest.raises(CustomException) as exc_info:
                    await auth_middleware._get_app_source_detail_with_api_key(
                        "Bearer test_key:test_secret", mock_span
                    )

                assert (
                    exc_info.value.code
                    == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
                )
                mock_span.add_info_event_async.assert_called_once_with(
                    "Application management platform response: Not found"
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
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_api_error_codes(
        self, auth_middleware: AuthMiddleware, response_code: int, expected_error: str
    ) -> None:
        """Test _get_app_source_detail_with_api_key with various API error codes."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch("httpx.AsyncClient.get") as mock_get:
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

                assert (
                    exc_info.value.code
                    == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
                )

    @pytest.mark.parametrize(
        "response_data,expected_appid",
        [
            ({"data": {"appid": "valid_app_123"}}, "valid_app_123"),
            ({"data": {"appid": "another_app_456"}}, "another_app_456"),
        ],
    )
    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_valid_responses(
        self, auth_middleware: AuthMiddleware, response_data: dict, expected_appid: str
    ) -> None:
        """Test _get_app_source_detail_with_api_key with valid API responses."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch("httpx.AsyncClient.get") as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"code": 0, **response_data}
                mock_response.text = "success"
                mock_get.return_value = mock_response

                with patch.object(
                    auth_middleware, "_set_app_id_with_cache"
                ) as mock_set_cache:
                    result = await auth_middleware._get_app_source_detail_with_api_key(
                        "Bearer test_key:test_secret", mock_span
                    )

                    assert result == expected_appid
                    mock_set_cache.assert_called_once_with("test_key", expected_appid)

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
        {"APP_MANAGE_PLAT_APP_DETAILS_WITH_API_KEY": "https://api.example.com/app"},
        clear=False,
    )
    async def test_get_app_source_detail_missing_appid(
        self, auth_middleware: AuthMiddleware, response_data: dict
    ) -> None:
        """Test _get_app_source_detail_with_api_key with missing or invalid appid."""
        mock_span = AsyncMock()

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch("httpx.AsyncClient.get") as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"code": 0, **response_data}
                mock_response.text = "success"
                mock_get.return_value = mock_response

                with pytest.raises(CustomException) as exc_info:
                    await auth_middleware._get_app_source_detail_with_api_key(
                        "Bearer test_key:test_secret", mock_span
                    )

                assert (
                    exc_info.value.code
                    == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
                )
                assert "appid is null" in exc_info.value.message

    async def test_get_app_id_with_cache_missing_key(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test _get_app_id_with_cache with missing cache key raises KeyError."""
        with patch(
            "workflow.extensions.fastapi.middleware.auth.get_cache_service"
        ) as mock_get_cache:
            mock_cache: dict = {}
            mock_get_cache.return_value = mock_cache

            with pytest.raises(KeyError):
                auth_middleware._get_app_id_with_cache("nonexistent_key")

    @patch.dict(
        os.environ,
        {"APP_MANAGE_PLAT_BASE_URL": "https://api.example.com"},
        clear=False,
    )
    async def test_get_app_source_detail_auth_header_generation(
        self, auth_middleware: AuthMiddleware
    ) -> None:
        """Test that _get_app_source_detail_with_api_key calls _gen_app_auth_header."""
        mock_span = AsyncMock()
        auth_middleware.api_key = "test_key"
        auth_middleware.api_secret = "test_secret"

        with patch.object(auth_middleware, "_get_app_id_with_cache") as mock_get_cache:
            mock_get_cache.return_value = None

            with patch.object(auth_middleware, "_gen_app_auth_header") as mock_gen_auth:
                mock_gen_auth.return_value = {"Authorization": "test_header"}

                with patch("httpx.AsyncClient.get") as mock_get:
                    mock_response = Mock()
                    mock_response.status_code = 200
                    mock_response.json.return_value = {
                        "code": 0,
                        "data": {"appid": "test_app_id"},
                    }
                    mock_response.text = "success"
                    mock_get.return_value = mock_response

                    with patch.object(auth_middleware, "_set_app_id_with_cache"):
                        await auth_middleware._get_app_source_detail_with_api_key(
                            "Bearer test_key:test_secret", mock_span
                        )

                        mock_gen_auth.assert_called_once_with(
                            "https://api.example.com/v2/app/key/api_key/test_key"
                        )
                        mock_get.assert_called_once_with(
                            "https://api.example.com/v2/app/key/api_key/test_key",
                            headers={"Authorization": "test_header"},
                        )
