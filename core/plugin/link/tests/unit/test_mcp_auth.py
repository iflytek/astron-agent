"""Tests for server-managed MCP Bearer credential references."""

import json

import pytest
from plugin.link.consts import const
from plugin.link.service.community.tools.mcp.mcp_auth import (
    MCPAuthConfigurationError,
    resolve_mcp_auth_headers,
)

SERVER_URL = "https://gitnexus.internal.example/mcp"
TOKEN_REF = "GITNEXUS_MCP_TOKEN"


def auth_source(mapping: object, token: str | None = "test-token") -> dict[str, str]:
    source = {const.MCP_SERVER_BEARER_TOKEN_REFS_KEY: json.dumps(mapping)}
    if token is not None:
        source[TOKEN_REF] = token
    return source


@pytest.mark.unit
def test_no_reference_config_adds_no_headers() -> None:
    assert resolve_mcp_auth_headers(SERVER_URL, {}) == {}


@pytest.mark.unit
def test_unmapped_server_adds_no_headers() -> None:
    source = auth_source({"https://other.example/mcp": TOKEN_REF})

    assert resolve_mcp_auth_headers(SERVER_URL, source) == {}


@pytest.mark.unit
def test_exact_server_reference_resolves_bearer_header() -> None:
    source = auth_source({"https://GITNEXUS.internal.example:443/mcp": TOKEN_REF})

    assert resolve_mcp_auth_headers(SERVER_URL, source) == {
        "Authorization": "Bearer test-token"
    }


@pytest.mark.unit
def test_missing_or_blank_referenced_secret_fails_closed() -> None:
    mapping = {SERVER_URL: TOKEN_REF}

    for token in (None, "", "   "):
        with pytest.raises(MCPAuthConfigurationError, match="credential is missing"):
            resolve_mcp_auth_headers(SERVER_URL, auth_source(mapping, token))


@pytest.mark.unit
@pytest.mark.parametrize(
    "token",
    ["contains space", "line\nbreak", "non-ascii-é", "x" * (8 * 1024 + 1)],
)
def test_invalid_secret_values_fail_without_echoing_them(token: str) -> None:
    with pytest.raises(MCPAuthConfigurationError) as exc_info:
        resolve_mcp_auth_headers(
            SERVER_URL, auth_source({SERVER_URL: TOKEN_REF}, token)
        )

    assert token not in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.parametrize(
    "raw_config",
    [
        "not-json",
        "[]",
        json.dumps({SERVER_URL: 1}),
        json.dumps({"ftp://gitnexus.internal.example/mcp": TOKEN_REF}),
        json.dumps({"http://gitnexus.internal.example/mcp": TOKEN_REF}),
        json.dumps({"https://user:pass@gitnexus.internal.example/mcp": TOKEN_REF}),
        json.dumps({f"{SERVER_URL}?token=inline": TOKEN_REF}),
        json.dumps({SERVER_URL: "bad-env-name"}),
    ],
)
def test_invalid_reference_config_fails_closed(raw_config: str) -> None:
    with pytest.raises(MCPAuthConfigurationError):
        resolve_mcp_auth_headers(
            SERVER_URL,
            {
                const.MCP_SERVER_BEARER_TOKEN_REFS_KEY: raw_config,
                TOKEN_REF: "test-token",
            },
        )


@pytest.mark.unit
def test_canonical_duplicate_urls_are_rejected() -> None:
    mapping = {
        "https://GITNEXUS.internal.example:443/mcp": TOKEN_REF,
        SERVER_URL: "SECOND_MCP_TOKEN",
    }

    with pytest.raises(MCPAuthConfigurationError, match="duplicate URL"):
        resolve_mcp_auth_headers(SERVER_URL, auth_source(mapping))


@pytest.mark.unit
def test_request_url_user_info_is_rejected_without_auth_config() -> None:
    with pytest.raises(MCPAuthConfigurationError, match="must not contain user info"):
        resolve_mcp_auth_headers(
            "https://user:secret@gitnexus.internal.example/mcp", {}
        )
