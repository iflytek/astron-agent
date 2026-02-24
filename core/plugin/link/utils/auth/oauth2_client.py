"""OAuth2 client-credentials helper utilities.

This module keeps a lightweight in-memory cache for access tokens to avoid
requesting a new token on every outbound call.
"""

import asyncio
import base64
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import aiohttp


class OAuth2TokenError(Exception):
    """Raised when OAuth2 token retrieval fails."""


@dataclass(frozen=True)
class OAuth2ClientConfig:
    """Configuration for OAuth2 client-credentials flow."""

    token_url: str
    client_id: str
    client_secret: str
    audience: str = ""
    scope: str = ""
    grant_type: str = "client_credentials"
    token_endpoint_auth_method: str = "client_secret_post"
    timeout_seconds: int = 10


_TOKEN_CACHE: Dict[str, Dict[str, float | str]] = {}
_TOKEN_LOCKS: Dict[str, asyncio.Lock] = {}


def _has_pending_waiters(lock: asyncio.Lock) -> bool:
    """Return True when the lock still has waiting tasks."""
    waiters = getattr(lock, "_waiters", None)
    return bool(waiters)


def _cleanup_expired_cache_entries() -> None:
    """Lazily remove expired cache entries and best-effort stale locks."""
    now = time.time()
    expired_keys = []

    for key, cache_entry in list(_TOKEN_CACHE.items()):
        expires_at = cache_entry.get("expires_at")
        if not isinstance(expires_at, (int, float)) or float(expires_at) <= now:
            expired_keys.append(key)

    for key in expired_keys:
        _TOKEN_CACHE.pop(key, None)
        lock = _TOKEN_LOCKS.get(key)
        if lock is not None and not lock.locked() and not _has_pending_waiters(lock):
            _TOKEN_LOCKS.pop(key, None)


def _cleanup_unused_lock(key: str, lock: asyncio.Lock) -> None:
    """Drop per-key lock when cache entry is gone/expired and nobody is waiting."""
    if lock.locked() or _has_pending_waiters(lock):
        return

    cache_entry = _TOKEN_CACHE.get(key)
    if _is_token_valid(cache_entry):
        return

    if _TOKEN_LOCKS.get(key) is lock:
        _TOKEN_LOCKS.pop(key, None)


def _normalized_auth_method(config: OAuth2ClientConfig) -> str:
    """Return normalized token endpoint auth method for consistent behavior."""
    return config.token_endpoint_auth_method.strip().lower()


def _cache_key(config: OAuth2ClientConfig) -> str:
    """Build a stable cache key for one OAuth2 client configuration."""
    client_secret_hash = hashlib.sha256(
        config.client_secret.encode("utf-8")
    ).hexdigest()
    return (
        f"{config.token_url}::{config.client_id}::{config.audience}::"
        f"{config.scope}::{config.grant_type}::"
        f"{config.token_endpoint_auth_method}::{client_secret_hash}::"
        f"{config.timeout_seconds}"
    )


def _is_token_valid(cache_entry: Optional[Dict[str, float | str]]) -> bool:
    """Check if cached token exists and has not expired."""
    if not cache_entry:
        return False

    expires_at = cache_entry.get("expires_at")
    if not isinstance(expires_at, (int, float)):
        return False

    # Leave a small safety window to avoid edge expiration at request time.
    return float(expires_at) > time.time() + 5


def _build_form_data(config: OAuth2ClientConfig) -> Dict[str, str]:
    """Build RFC6749 client-credentials request form data."""
    token_endpoint_auth_method = _normalized_auth_method(config)
    form_data = {
        "grant_type": config.grant_type,
    }
    if token_endpoint_auth_method == "client_secret_post":
        form_data["client_id"] = config.client_id
        form_data["client_secret"] = config.client_secret
    elif token_endpoint_auth_method == "none":
        form_data["client_id"] = config.client_id

    if config.audience:
        form_data["audience"] = config.audience
    if config.scope:
        form_data["scope"] = config.scope
    return form_data


def _build_auth_headers(config: OAuth2ClientConfig) -> Dict[str, str]:
    """Build HTTP headers for token request."""
    headers = {"Accept": "application/json"}
    if _normalized_auth_method(config) != "client_secret_basic":
        return headers

    basic = base64.b64encode(
        f"{config.client_id}:{config.client_secret}".encode("utf-8")
    ).decode("utf-8")
    headers["Authorization"] = f"Basic {basic}"
    return headers


def _parse_token_payload(response_text: str) -> Dict[str, str | int | float]:
    """Parse token endpoint response payload."""
    try:
        payload = json.loads(response_text) if response_text else {}
    except Exception:
        payload = {"raw": response_text}
    if isinstance(payload, dict):
        return payload
    return {"raw": response_text}


def _extract_token_with_expiry(
    payload: Dict[str, str | int | float],
) -> Tuple[str, int]:
    """Extract and normalize access token and expires_in from payload."""
    access_token = payload.get("access_token")
    if not access_token:
        raise OAuth2TokenError("OAuth2 token response missing 'access_token'")

    expires_in_raw = payload.get("expires_in", 300)
    try:
        expires_in = int(expires_in_raw)
    except Exception as exc:
        raise OAuth2TokenError(
            f"Invalid expires_in value in token response: {expires_in_raw}"
        ) from exc

    return str(access_token), max(expires_in, 30)


def _validate_oauth2_config(config: OAuth2ClientConfig) -> str:
    """Validate OAuth2 configuration and return normalized auth method."""
    if not config.token_url:
        raise OAuth2TokenError("OAuth2 token_url is required")
    if not config.client_id:
        raise OAuth2TokenError("OAuth2 client_id is required")

    token_endpoint_auth_method = _normalized_auth_method(config)
    if token_endpoint_auth_method not in {
        "client_secret_post",
        "client_secret_basic",
        "none",
    }:
        raise OAuth2TokenError(
            "Unsupported token_endpoint_auth_method, supported values are "
            "client_secret_post/client_secret_basic/none"
        )

    if (
        token_endpoint_auth_method in {"client_secret_post", "client_secret_basic"}
        and not config.client_secret
    ):
        raise OAuth2TokenError(
            "OAuth2 client_secret is required for configured auth method"
        )
    if not config.grant_type:
        raise OAuth2TokenError("OAuth2 grant_type is required")

    return token_endpoint_auth_method


def _get_cached_token(key: str) -> Optional[str]:
    """Get valid cached token by key, if any."""
    cache_entry = _TOKEN_CACHE.get(key)
    if not _is_token_valid(cache_entry) or cache_entry is None:
        return None

    cached_token = cache_entry.get("access_token")
    if isinstance(cached_token, str):
        return cached_token
    return None


async def _request_token(config: OAuth2ClientConfig) -> Tuple[str, int]:
    """Request access token from authorization server.

    Returns:
        tuple[str, int]: access_token and expires_in(seconds)
    """
    timeout = aiohttp.ClientTimeout(total=config.timeout_seconds)
    headers = _build_auth_headers(config)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                config.token_url,
                data=_build_form_data(config),
                headers=headers,
            ) as res:
                response_text = await res.text()
                payload = _parse_token_payload(response_text)

                if res.status != 200:
                    raise OAuth2TokenError(
                        f"OAuth2 token request failed with status {res.status}"
                    )
    except asyncio.TimeoutError as exc:
        raise OAuth2TokenError("OAuth2 token request timed out") from exc
    except aiohttp.ClientError as exc:
        raise OAuth2TokenError(f"OAuth2 token request network error: {exc}") from exc

    return _extract_token_with_expiry(payload)


async def get_client_credentials_token(config: OAuth2ClientConfig) -> str:
    """Get OAuth2 access token using client-credentials flow.

    This function is cache-aware and deduplicates concurrent refreshes
    via per-key async locks.
    """
    _validate_oauth2_config(config)

    key = _cache_key(config)
    _cleanup_expired_cache_entries()
    cached_token = _get_cached_token(key)
    if cached_token:
        return cached_token

    lock = _TOKEN_LOCKS.setdefault(key, asyncio.Lock())
    try:
        async with lock:
            _cleanup_expired_cache_entries()
            cached_token = _get_cached_token(key)
            if cached_token:
                return cached_token

            access_token, expires_in = await _request_token(config)
            _TOKEN_CACHE[key] = {
                "access_token": access_token,
                "expires_at": time.time() + expires_in,
            }
            return access_token
    finally:
        _cleanup_expired_cache_entries()
        _cleanup_unused_lock(key, lock)
