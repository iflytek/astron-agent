"""Server-managed authentication for outbound MCP connections."""

import json
import os
import re
from collections.abc import Mapping
from urllib.parse import urlsplit, urlunsplit

from plugin.link.consts import const

_MAX_CONFIG_BYTES = 64 * 1024
_MAX_SERVER_ENTRIES = 100
_MAX_TOKEN_BYTES = 8 * 1024
_ENV_REF_PATTERN = re.compile(r"[A-Z_][A-Z0-9_]{0,127}")
_VISIBLE_ASCII_PATTERN = re.compile(r"[\x21-\x7e]+")


class MCPAuthConfigurationError(ValueError):
    """Invalid or incomplete server-managed MCP authentication configuration."""


def _reject_embedded_url_credentials(value: str) -> None:
    try:
        parsed = urlsplit(value.strip())
    except ValueError as error:
        raise MCPAuthConfigurationError("MCP URL is invalid") from error
    if parsed.username is not None or parsed.password is not None:
        raise MCPAuthConfigurationError("MCP URL must not contain user info")


def _canonical_mcp_url(value: str, *, require_https: bool = False) -> str:
    """Return a credential-safe exact URL key for an MCP endpoint."""
    candidate = value.strip()
    try:
        parsed = urlsplit(candidate)
        port = parsed.port
    except ValueError as error:
        raise MCPAuthConfigurationError("MCP auth URL is invalid") from error

    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise MCPAuthConfigurationError("MCP auth URL must use HTTP or HTTPS")
    if require_https and parsed.scheme.lower() != "https":
        raise MCPAuthConfigurationError("MCP bearer auth URL must use HTTPS")
    if parsed.username is not None or parsed.password is not None:
        raise MCPAuthConfigurationError("MCP auth URL must not contain user info")
    if parsed.query or parsed.fragment:
        raise MCPAuthConfigurationError(
            "MCP auth URL must not contain a query string or fragment"
        )

    scheme = parsed.scheme.lower()
    hostname = parsed.hostname.lower()
    rendered_host = f"[{hostname}]" if ":" in hostname else hostname
    default_port = (scheme == "http" and port == 80) or (
        scheme == "https" and port == 443
    )
    netloc = (
        rendered_host if port is None or default_port else f"{rendered_host}:{port}"
    )
    return urlunsplit((scheme, netloc, parsed.path or "/", "", ""))


def _parse_token_ref_payload(raw: str) -> dict[object, object]:
    if len(raw.encode("utf-8")) > _MAX_CONFIG_BYTES:
        raise MCPAuthConfigurationError(
            "MCP bearer token reference config is too large"
        )

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as error:
        raise MCPAuthConfigurationError(
            "MCP bearer token reference config must be valid JSON"
        ) from error
    if not isinstance(payload, dict):
        raise MCPAuthConfigurationError(
            "MCP bearer token reference config must be a JSON object"
        )
    if len(payload) > _MAX_SERVER_ENTRIES:
        raise MCPAuthConfigurationError(
            "MCP bearer token reference config has too many entries"
        )
    return payload


def _normalize_token_ref(server_url: object, env_ref: object) -> tuple[str, str]:
    if not isinstance(server_url, str) or not isinstance(env_ref, str):
        raise MCPAuthConfigurationError(
            "MCP bearer token references must map URL strings to env names"
        )
    canonical_url = _canonical_mcp_url(server_url, require_https=True)
    normalized_ref = env_ref.strip()
    if _ENV_REF_PATTERN.fullmatch(normalized_ref) is None:
        raise MCPAuthConfigurationError(
            "MCP bearer token env reference has an invalid name"
        )
    return canonical_url, normalized_ref


def _load_bearer_token_refs(source: Mapping[str, str]) -> dict[str, str]:
    raw = source.get(const.MCP_SERVER_BEARER_TOKEN_REFS_KEY, "").strip()
    if not raw:
        return {}

    refs: dict[str, str] = {}
    for server_url, env_ref in _parse_token_ref_payload(raw).items():
        canonical_url, normalized_ref = _normalize_token_ref(server_url, env_ref)
        if canonical_url in refs:
            raise MCPAuthConfigurationError(
                "MCP bearer token reference config contains a duplicate URL"
            )
        refs[canonical_url] = normalized_ref
    return refs


def resolve_mcp_auth_headers(
    url: str, source: Mapping[str, str] | None = None
) -> dict[str, str]:
    """Resolve a Bearer header without exposing a token through request schemas."""
    environment = os.environ if source is None else source
    _reject_embedded_url_credentials(url)
    refs = _load_bearer_token_refs(environment)
    if not refs:
        return {}

    env_ref = refs.get(_canonical_mcp_url(url))
    if env_ref is None:
        return {}
    token = environment.get(env_ref, "").strip()
    if not token:
        raise MCPAuthConfigurationError("Configured MCP bearer credential is missing")
    if len(token.encode("utf-8")) > _MAX_TOKEN_BYTES:
        raise MCPAuthConfigurationError("Configured MCP bearer credential is too large")
    if _VISIBLE_ASCII_PATTERN.fullmatch(token) is None:
        raise MCPAuthConfigurationError(
            "Configured MCP bearer credential contains invalid characters"
        )
    return {"Authorization": f"Bearer {token}"}


__all__ = [
    "MCPAuthConfigurationError",
    "resolve_mcp_auth_headers",
]
