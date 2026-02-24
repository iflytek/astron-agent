"""Unit tests for OAuth2 authentication integration in execution server."""

import asyncio
from typing import Any, Callable, Coroutine, Dict
from unittest.mock import AsyncMock, patch

import pytest
from plugin.link.consts import const
from plugin.link.exceptions.sparklink_exceptions import SparkLinkBaseException
from plugin.link.utils.auth.oauth2_client import OAuth2TokenError
from plugin.link.utils.errors.code import ErrCode


def _load_process_authentication() -> Callable[
    [Dict[str, Any], Dict[str, Any], Dict[str, Any], str],
    Coroutine[Any, Any, None],
]:
    pytest.importorskip(
        "opentelemetry",
        reason="execution_server imports OTLP runtime dependencies",
    )
    from plugin.link.service.community.tools.http.execution_server import (
        process_authentication,
    )

    return process_authentication


@pytest.mark.unit
class TestExecutionServerOAuth2Auth:
    """Verify OAuth2 process_authentication integration behavior."""

    def test_oauth2_resolves_fallback_config_and_fetches_token(self) -> None:
        """OAuth2 config should resolve env fallbacks and call token provider once."""
        process_authentication = _load_process_authentication()
        operation_id_schema = {
            "security": {
                "oauth_main": {
                    "type": "oauth2",
                    "flows": {
                        "clientCredentials": {
                            "tokenUrl": "https://schema.example.com/token"
                        }
                    },
                    "x-client-id-env": "TOOL_CLIENT_ID",
                    "x-audience": "audience-from-direct",
                    "x-token-endpoint-auth-method-env": "TOKEN_AUTH_METHOD",
                }
            },
            "security_type": "oauth_main",
            "security_scopes": ["scope.read", "scope.write"],
        }
        message_header: Dict[str, Any] = {}
        message_query: Dict[str, Any] = {}

        env = {
            "TOOL_CLIENT_ID": "client-id-from-env",
            "TOKEN_AUTH_METHOD": "client_secret_basic",
            const.OAUTH2_CLIENT_SECRET_ENV_KEY: "GLOBAL_SECRET_ENV",
            "GLOBAL_SECRET_ENV": "client-secret-from-global-env",
            const.OAUTH2_TOKEN_URL_ENV_KEY: "GLOBAL_TOKEN_URL_ENV",
            "GLOBAL_TOKEN_URL_ENV": "https://env.example.com/oauth/token",
        }

        with patch.dict("os.environ", env, clear=False):
            with patch(
                "plugin.link.service.community.tools.http.execution_server.get_client_credentials_token",
                new_callable=AsyncMock,
            ) as mock_get_token:
                mock_get_token.return_value = "oauth2-access-token"

                asyncio.run(
                    process_authentication(
                        operation_id_schema,
                        message_header,
                        message_query,
                        "tool-for-test",
                    )
                )

                assert message_header["Authorization"] == "Bearer oauth2-access-token"
                assert message_query == {}
                assert mock_get_token.await_count == 1

                assert mock_get_token.await_args is not None
                oauth2_config = mock_get_token.await_args.args[0]
                assert oauth2_config.token_url == "https://env.example.com/oauth/token"
                assert oauth2_config.client_id == "client-id-from-env"
                assert oauth2_config.client_secret == "client-secret-from-global-env"
                assert oauth2_config.audience == "audience-from-direct"
                assert oauth2_config.scope == "scope.read scope.write"
                assert oauth2_config.grant_type == "client_credentials"
                assert oauth2_config.token_endpoint_auth_method == "client_secret_basic"

    def test_oauth2_token_error_is_wrapped_to_sparklink_exception(self) -> None:
        """OAuth2TokenError should be wrapped with standardized SparkLink error code."""
        process_authentication = _load_process_authentication()
        operation_id_schema = {
            "security": {
                "oauth_main": {
                    "type": "oauth2",
                    "x-token-url": "https://example.com/oauth/token",
                    "x-client-id": "client-id",
                    "x-client-secret": "client-secret",
                }
            },
            "security_type": "oauth_main",
        }
        message_header: Dict[str, Any] = {}
        message_query: Dict[str, Any] = {}

        with patch(
            "plugin.link.service.community.tools.http.execution_server.get_client_credentials_token",
            new_callable=AsyncMock,
        ) as mock_get_token:
            mock_get_token.side_effect = OAuth2TokenError("network unavailable")

            with pytest.raises(SparkLinkBaseException) as exc_info:
                asyncio.run(
                    process_authentication(
                        operation_id_schema,
                        message_header,
                        message_query,
                        "tool-for-test",
                    )
                )

            assert exc_info.value.code == ErrCode.OAUTH2_TOKEN_ERR.code
            assert "tool_id=tool-for-test" in str(exc_info.value)
            assert "network unavailable" in str(exc_info.value)

    def test_oauth2_unsupported_grant_type_without_preissued_token_raises(
        self,
    ) -> None:
        """Unsupported grant_type without pre-issued token should raise SparkLinkBaseException."""
        process_authentication = _load_process_authentication()
        operation_id_schema = {
            "security": {
                "oauth_main": {
                    "type": "oauth2",
                    "x-token-url": "https://example.com/oauth/token",
                    "x-client-id": "client-id",
                    "x-client-secret": "client-secret",
                    "x-grant-type": "authorization_code",
                }
            },
            "security_type": "oauth_main",
        }
        message_header: Dict[str, Any] = {}
        message_query: Dict[str, Any] = {}

        with pytest.raises(SparkLinkBaseException) as exc_info:
            asyncio.run(
                process_authentication(
                    operation_id_schema,
                    message_header,
                    message_query,
                    "tool-for-test",
                )
            )

        assert exc_info.value.code == ErrCode.OAUTH2_TOKEN_ERR.code
        assert "Only client_credentials is supported" in str(exc_info.value)
