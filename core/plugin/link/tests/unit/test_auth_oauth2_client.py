"""Unit tests for OAuth2 client credentials helper."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from plugin.link.utils.auth.oauth2_client import (
    _TOKEN_CACHE,
    _TOKEN_LOCKS,
    OAuth2ClientConfig,
    OAuth2TokenError,
    _build_form_data,
    _cache_key,
    get_client_credentials_token,
)


@pytest.mark.unit
class TestOAuth2Client:
    """Verify OAuth2 token fetch, cache and validation behavior."""

    def setup_method(self) -> None:
        """Reset in-memory cache before each test."""
        _TOKEN_CACHE.clear()
        _TOKEN_LOCKS.clear()

    def test_get_token_uses_cache(self) -> None:
        """Second call should hit cache and avoid extra remote requests."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            scope="scope-a",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.return_value = ("access-token-1", 300)

            token_1 = asyncio.run(get_client_credentials_token(config))
            token_2 = asyncio.run(get_client_credentials_token(config))

            assert token_1 == "access-token-1"
            assert token_2 == "access-token-1"
            assert mock_request.await_count == 1

    def test_get_token_refreshes_when_expired(self) -> None:
        """Expired cache entry should trigger token re-fetch."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.side_effect = [
                ("access-token-1", 1),
                ("access-token-2", 300),
            ]

            _ = asyncio.run(get_client_credentials_token(config))

            # Force cache entry expiration and validate refresh path.
            for _, entry in _TOKEN_CACHE.items():
                entry["expires_at"] = 0

            token_2 = asyncio.run(get_client_credentials_token(config))

            assert token_2 == "access-token-2"
            assert mock_request.await_count == 2

    def test_get_token_raises_on_missing_required_config(self) -> None:
        """Missing token URL or client credentials should be rejected."""
        bad_config = OAuth2ClientConfig(
            token_url="",
            client_id="",
            client_secret="",
        )

        with pytest.raises(OAuth2TokenError):
            asyncio.run(get_client_credentials_token(bad_config))

    def test_build_form_data_contains_optional_audience_scope(self) -> None:
        """Form payload should include optional audience/scope when configured."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            audience="https://api.example.com",
            scope="read write",
        )

        data = _build_form_data(config)
        assert data["grant_type"] == "client_credentials"
        assert data["audience"] == "https://api.example.com"
        assert data["scope"] == "read write"

    def test_build_form_data_with_client_secret_basic(self) -> None:
        """client_secret_basic should not duplicate credentials in POST form."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            token_endpoint_auth_method="client_secret_basic",
        )

        data = _build_form_data(config)
        assert data["grant_type"] == "client_credentials"
        assert "client_id" not in data
        assert "client_secret" not in data

    def test_build_form_data_with_none_auth_method(self) -> None:
        """none auth method should include client_id but not client_secret."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            token_endpoint_auth_method="none",
            grant_type="urn:ietf:params:oauth:grant-type:token-exchange",
        )

        data = _build_form_data(config)
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:token-exchange"
        assert data["client_id"] == "client-id"
        assert "client_secret" not in data

    def test_get_token_raises_on_invalid_auth_method(self) -> None:
        """Unsupported token endpoint auth method should fail fast."""
        bad_config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            token_endpoint_auth_method="private_key_jwt",
        )

        with pytest.raises(OAuth2TokenError):
            asyncio.run(get_client_credentials_token(bad_config))

    def test_get_token_none_auth_method_without_secret(self) -> None:
        """none auth method should not require client_secret."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="",
            token_endpoint_auth_method="none",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.return_value = ("access-token-1", 300)
            token = asyncio.run(get_client_credentials_token(config))
            assert token == "access-token-1"

    def test_get_token_auth_method_is_case_insensitive(self) -> None:
        """Auth method value should be normalized for validation compatibility."""
        config = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="client-secret",
            token_endpoint_auth_method="Client_Secret_Post",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.return_value = ("access-token-1", 300)
            token = asyncio.run(get_client_credentials_token(config))
            assert token == "access-token-1"

    def test_get_token_does_not_share_cache_across_different_secrets(self) -> None:
        """Different client_secret values should map to isolated cache entries."""
        config_a = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="secret-a",
            audience="audience-a",
            scope="scope-a",
            grant_type="client_credentials",
            token_endpoint_auth_method="client_secret_post",
        )
        config_b = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-id",
            client_secret="secret-b",
            audience="audience-a",
            scope="scope-a",
            grant_type="client_credentials",
            token_endpoint_auth_method="client_secret_post",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.side_effect = [
                ("access-token-secret-a", 300),
                ("access-token-secret-b", 300),
            ]

            token_a = asyncio.run(get_client_credentials_token(config_a))
            token_b = asyncio.run(get_client_credentials_token(config_b))

            assert token_a == "access-token-secret-a"
            assert token_b == "access-token-secret-b"
            assert mock_request.await_count == 2

    def test_lazy_cleanup_removes_expired_cache_and_lock(self) -> None:
        """Accessing another key should lazily evict expired entries and stale locks."""
        config_a = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-a",
            client_secret="secret-a",
        )
        config_b = OAuth2ClientConfig(
            token_url="https://auth.example.com/token",
            client_id="client-b",
            client_secret="secret-b",
        )

        with patch(
            "plugin.link.utils.auth.oauth2_client._request_token",
            new_callable=AsyncMock,
        ) as mock_request:
            mock_request.side_effect = [
                ("token-a", 300),
                ("token-b", 300),
            ]

            _ = asyncio.run(get_client_credentials_token(config_a))
            key_a = _cache_key(config_a)
            assert key_a in _TOKEN_CACHE
            assert key_a in _TOKEN_LOCKS

            _TOKEN_CACHE[key_a]["expires_at"] = 0

            _ = asyncio.run(get_client_credentials_token(config_b))

            assert key_a not in _TOKEN_CACHE
            assert key_a not in _TOKEN_LOCKS
