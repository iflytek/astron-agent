"""JWT validation helpers with optional JWKS caching.

By default this module supports:
- RS/ES verification via JWKS URL
- HS verification via shared secret
"""

import json
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List
from urllib.error import URLError
from urllib.request import Request, urlopen

import jwt
from jwt import InvalidTokenError


class JwtValidationError(Exception):
    """Raised when JWT validation fails."""


@dataclass(frozen=True)
class JwtValidationConfig:
    """Validation options for JWT token parsing and signature checking."""

    issuer: str = ""
    audience: str = ""
    algorithms: tuple[str, ...] = ("RS256",)
    jwks_url: str = ""
    shared_secret: str = ""
    jwks_ttl_seconds: int = 300


_JWKS_CACHE: Dict[str, Dict[str, Any]] = {}
_JWKS_CACHE_LOCK = threading.Lock()
_JWKS_FETCH_LOCKS: Dict[str, threading.Lock] = {}
_JWKS_FETCH_LOCKS_GUARD = threading.Lock()


def _get_fetch_lock(jwks_url: str) -> threading.Lock:
    with _JWKS_FETCH_LOCKS_GUARD:
        if jwks_url not in _JWKS_FETCH_LOCKS:
            _JWKS_FETCH_LOCKS[jwks_url] = threading.Lock()
        return _JWKS_FETCH_LOCKS[jwks_url]


def _fetch_jwks(jwks_url: str, ttl_seconds: int) -> Dict[str, Any]:
    """Fetch JWKS from remote endpoint with local in-memory cache."""
    now = time.time()

    with _JWKS_CACHE_LOCK:
        cache_entry = _JWKS_CACHE.get(jwks_url)
        if cache_entry and float(cache_entry.get("expires_at", 0)) > now:
            return dict(cache_entry.get("jwks", {}))

    fetch_lock = _get_fetch_lock(jwks_url)
    with fetch_lock:
        now = time.time()
        with _JWKS_CACHE_LOCK:
            cache_entry = _JWKS_CACHE.get(jwks_url)
            if cache_entry and float(cache_entry.get("expires_at", 0)) > now:
                return dict(cache_entry.get("jwks", {}))

        request = Request(jwks_url, headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=5) as response:
                payload = response.read().decode("utf-8")
            jwks = json.loads(payload)
        except URLError as exc:
            raise JwtValidationError(f"Failed to fetch JWKS: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise JwtValidationError("JWKS response is not valid JSON") from exc

        if not isinstance(jwks, dict) or not isinstance(jwks.get("keys"), list):
            raise JwtValidationError("Invalid JWKS payload format")

        expires_at = time.time() + max(ttl_seconds, 60)
        with _JWKS_CACHE_LOCK:
            _JWKS_CACHE[jwks_url] = {
                "jwks": jwks,
                "expires_at": expires_at,
            }
        return jwks


def _get_key_from_jwks(token: str, jwks: Dict[str, Any]) -> Any:
    """Select matching JWK by token header kid."""
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise JwtValidationError("Unable to parse JWT header") from exc

    kid = header.get("kid")
    if not kid:
        raise JwtValidationError("JWT header missing 'kid' for JWKS lookup")

    for jwk in jwks.get("keys", []):
        if jwk.get("kid") == kid:
            try:
                return jwt.PyJWK.from_dict(jwk).key
            except Exception as exc:
                raise JwtValidationError(f"Invalid JWK format for kid: {kid}") from exc

    raise JwtValidationError(f"No matching JWK found for kid: {kid}")


def _decode_jwt(
    token: str,
    key: Any,
    algorithms: List[str],
    issuer: str,
    audience: str,
) -> Dict[str, Any]:
    """Decode and validate JWT claims and signature."""
    decode_kwargs: Dict[str, Any] = {
        "algorithms": algorithms,
        "options": {
            "verify_signature": True,
            "verify_exp": True,
            "verify_nbf": True,
            "verify_iat": True,
            "verify_iss": bool(issuer),
            "verify_aud": bool(audience),
        },
    }
    if issuer:
        decode_kwargs["issuer"] = issuer
    if audience:
        decode_kwargs["audience"] = audience

    try:
        decoded = jwt.decode(token, key, **decode_kwargs)
    except InvalidTokenError as exc:
        raise JwtValidationError(f"JWT validation failed: {exc}") from exc

    if not isinstance(decoded, dict):
        raise JwtValidationError("Decoded JWT payload is not an object")
    return decoded


def validate_jwt_token(token: str, config: JwtValidationConfig) -> Dict[str, Any]:
    """Validate JWT and return decoded payload.

    Validation mode selection:
    - If shared_secret is configured, use symmetric verification.
    - Else use JWKS URL and kid-based key lookup.
    """
    if not token:
        raise JwtValidationError("JWT token is required")

    algorithms = list(config.algorithms) if config.algorithms else ["RS256"]

    if config.shared_secret:
        return _decode_jwt(
            token=token,
            key=config.shared_secret,
            algorithms=algorithms,
            issuer=config.issuer,
            audience=config.audience,
        )

    if not config.jwks_url:
        raise JwtValidationError("Either shared_secret or jwks_url must be configured")

    jwks = _fetch_jwks(config.jwks_url, config.jwks_ttl_seconds)
    public_key = _get_key_from_jwks(token, jwks)
    return _decode_jwt(
        token=token,
        key=public_key,
        algorithms=algorithms,
        issuer=config.issuer,
        audience=config.audience,
    )
