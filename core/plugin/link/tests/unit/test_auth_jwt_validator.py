"""Unit tests for JWT validation helpers."""

import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Literal
from unittest.mock import patch

import jwt
import pytest
from plugin.link.utils.auth.jwt_validator import (
    _JWKS_CACHE,
    _JWKS_FETCH_LOCKS,
    JwtValidationConfig,
    JwtValidationError,
    _fetch_jwks,
    validate_jwt_token,
)


@pytest.mark.unit
class TestJwtValidator:
    """Validate success/failure paths for JWT verification."""

    def test_validate_jwt_with_shared_secret_success(self) -> None:
        """HS256 token should be validated with matching secret and claims."""
        secret = "unit-test-secret"
        token = jwt.encode(
            {
                "sub": "user-1",
                "iss": "issuer-a",
                "aud": "aud-a",
                "exp": int(time.time()) + 300,
            },
            secret,
            algorithm="HS256",
        )

        config = JwtValidationConfig(
            issuer="issuer-a",
            audience="aud-a",
            algorithms=("HS256",),
            shared_secret=secret,
        )
        payload = validate_jwt_token(token, config)
        assert payload["sub"] == "user-1"

    def test_validate_jwt_with_shared_secret_signature_error(self) -> None:
        """Token signed with different secret should fail verification."""
        token = jwt.encode(
            {
                "sub": "user-2",
                "exp": int(time.time()) + 300,
            },
            "secret-a",
            algorithm="HS256",
        )

        config = JwtValidationConfig(
            algorithms=("HS256",),
            shared_secret="secret-b",
        )

        with pytest.raises(JwtValidationError):
            validate_jwt_token(token, config)

    def test_validate_jwt_requires_secret_or_jwks(self) -> None:
        """Validation should fail when both secret and JWKS URL are missing."""
        token = jwt.encode(
            {
                "sub": "user-3",
                "exp": int(time.time()) + 300,
            },
            "secret-a",
            algorithm="HS256",
        )
        config = JwtValidationConfig(algorithms=("HS256",))

        with pytest.raises(JwtValidationError):
            validate_jwt_token(token, config)

    def test_fetch_jwks_deduplicates_concurrent_refresh(self) -> None:
        """Concurrent cache misses for same URL should trigger only one remote fetch."""

        class _FakeResponse:
            def __enter__(self) -> "_FakeResponse":
                return self

            def __exit__(
                self,
                exc_type: Any,
                exc_val: Any,
                exc_tb: Any,
            ) -> Literal[False]:
                return False

            def read(self) -> bytes:
                return b'{"keys": []}'

        call_counter = {"count": 0}

        def _slow_urlopen(*args: Any, **kwargs: Any) -> _FakeResponse:
            call_counter["count"] += 1
            time.sleep(0.05)
            return _FakeResponse()

        _JWKS_CACHE.clear()
        _JWKS_FETCH_LOCKS.clear()

        with patch(
            "plugin.link.utils.auth.jwt_validator.urlopen", side_effect=_slow_urlopen
        ):
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = [
                    executor.submit(_fetch_jwks, "https://auth.example.com/jwks", 300)
                    for _ in range(8)
                ]
                results = [future.result() for future in futures]

        assert call_counter["count"] == 1
        assert all(result == {"keys": []} for result in results)
