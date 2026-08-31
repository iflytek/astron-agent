"""Security regression tests for connection-bound outbound URL validation."""

import socket

import pytest
from plugin.link.infra.tool_exector.ssrf_guard import (
    OutboundPolicy,
    OutboundPolicyError,
    create_socket_factory,
    ensure_same_origin,
)

SECURITY_SETTINGS = (
    "SEGMENT_BLACK_LIST",
    "IP_BLACK_LIST",
    "IP_WHITE_LIST",
    "DOMAIN_BLACK_LIST",
    "PRIVATE_ENDPOINT_ALLOW_LIST",
)


@pytest.fixture(autouse=True)
def clear_security_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Give every test a deterministic, empty outbound policy."""
    for setting in SECURITY_SETTINGS:
        monkeypatch.delenv(setting, raising=False)


def ipv4_addr_info(address: str, port: int = 80) -> tuple:
    """Build the sockaddr tuple supplied to aiohttp socket factories."""
    return (
        socket.AF_INET,
        socket.SOCK_STREAM,
        socket.IPPROTO_TCP,
        "",
        (address, port),
    )


def ipv6_addr_info(address: str, port: int = 80) -> tuple:
    """Build an IPv6 sockaddr tuple supplied to aiohttp socket factories."""
    return (
        socket.AF_INET6,
        socket.SOCK_STREAM,
        socket.IPPROTO_TCP,
        "",
        (address, port, 0, 0),
    )


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/internal",
        "http://10.0.0.1/internal",
        "http://169.254.169.254/latest/meta-data",
        "http://100.64.0.1/internal",
        "http://[::1]/internal",
        "http://[fc00::1]/internal",
        "http://[::ffff:127.0.0.1]/internal",
    ],
)
def test_literal_restricted_addresses_are_rejected(url: str) -> None:
    policy = OutboundPolicy.from_environment()

    with pytest.raises(OutboundPolicyError):
        policy.validate_url(url)


def test_socket_factory_binds_validation_to_resolved_address() -> None:
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, "https://public.example/resource")

    public_socket = factory(ipv4_addr_info("8.8.8.8", 443))
    public_socket.close()
    with pytest.raises(OutboundPolicyError):
        factory(ipv4_addr_info("169.254.169.254", 443))


@pytest.mark.parametrize(
    "address",
    [
        "fec0::1",
        "ff02::1",
        "64:ff9b::a9fe:a9fe",
        "64:ff9b:1::a9fe:a9fe",
        "2002:a9fe:a9fe::1",
    ],
)
def test_special_ipv6_addresses_are_rejected_even_when_is_global_true(
    address: str,
) -> None:
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, "https://public.example/resource")

    with pytest.raises(OutboundPolicyError):
        factory(ipv6_addr_info(address, 443))


def test_ip_whitelist_applies_only_to_ip_literal_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("IP_WHITE_LIST", "127.0.0.0/8")
    policy = OutboundPolicy.from_environment()

    literal_factory = create_socket_factory(policy, "http://127.0.0.1/allowed")
    literal_socket = literal_factory(ipv4_addr_info("127.0.0.1"))
    literal_socket.close()

    hostname_factory = create_socket_factory(policy, "http://attacker.example/")
    with pytest.raises(OutboundPolicyError):
        hostname_factory(ipv4_addr_info("127.0.0.1"))


def test_exact_private_endpoint_allow_list_preserves_builtin_tool(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint = "http://core-aitools:18668/aitools/v1/image_generate"
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", endpoint)
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, endpoint + "?width=1024")
    internal_socket = factory(ipv4_addr_info("10.0.0.8", 18668))
    internal_socket.close()


@pytest.mark.parametrize(
    "address",
    [
        "::1",
        "fe80::1",
        "ff02::1",
        "64:ff9b::a9fe:a9fe",
    ],
)
def test_private_endpoint_allow_list_never_allows_special_ipv6_targets(
    monkeypatch: pytest.MonkeyPatch, address: str
) -> None:
    endpoint = "http://core-aitools:18668/aitools/v1/image_generate"
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", endpoint)
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, endpoint)

    with pytest.raises(OutboundPolicyError):
        factory(ipv6_addr_info(address, 18668))


def test_private_endpoint_allow_list_does_not_authorize_other_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "PRIVATE_ENDPOINT_ALLOW_LIST",
        "http://core-aitools:18668/aitools/v1/image_generate",
    )
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, "http://core-aitools:18668/admin")

    with pytest.raises(OutboundPolicyError):
        factory(ipv4_addr_info("10.0.0.8", 18668))


def test_private_endpoint_allow_list_does_not_ignore_path_params(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "PRIVATE_ENDPOINT_ALLOW_LIST",
        "http://core-aitools:18668/aitools/v1/ocr",
    )
    policy = OutboundPolicy.from_environment()
    for suffix in (";ignored", ";"):
        factory = create_socket_factory(
            policy,
            "http://core-aitools:18668/aitools/v1/ocr" + suffix,
        )

        with pytest.raises(OutboundPolicyError):
            factory(ipv4_addr_info("10.0.0.8", 18668))


def test_private_endpoint_uses_same_idna_normalization_as_aiohttp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Distinct IDNA hostnames must not compare equal across URL parsers."""
    monkeypatch.setenv(
        "PRIVATE_ENDPOINT_ALLOW_LIST",
        "http://fass.de:18668/aitools/v1/ocr",
    )
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(
        policy,
        "http://faß.de:18668/aitools/v1/ocr",
    )

    with pytest.raises(OutboundPolicyError):
        factory(ipv4_addr_info("10.0.0.8", 18668))


def test_explicit_network_block_overrides_private_endpoint_allow_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint = "http://core-aitools:18668/aitools/v1/ocr"
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", endpoint)
    monkeypatch.setenv("SEGMENT_BLACK_LIST", "10.0.0.0/8")
    blocked_policy = OutboundPolicy.from_environment()
    blocked_factory = create_socket_factory(blocked_policy, endpoint)
    with pytest.raises(OutboundPolicyError):
        blocked_factory(ipv4_addr_info("10.0.0.8", 18668))


def test_ipv4_blacklist_matches_ipv4_mapped_ipv6(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint = "http://core-aitools:18668/aitools/v1/ocr"
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", endpoint)
    monkeypatch.setenv("SEGMENT_BLACK_LIST", "127.0.0.0/8")
    policy = OutboundPolicy.from_environment()
    factory = create_socket_factory(policy, endpoint)

    with pytest.raises(OutboundPolicyError, match="blocked"):
        factory(ipv6_addr_info("::ffff:127.0.0.1", 18668))


def test_invalid_security_configuration_fails_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SEGMENT_BLACK_LIST", "not-a-network")

    with pytest.raises(OutboundPolicyError):
        OutboundPolicy.from_environment()


def test_domain_blacklist_uses_hostname_boundaries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DOMAIN_BLACK_LIST", "blocked.example")
    policy = OutboundPolicy.from_environment()

    with pytest.raises(OutboundPolicyError):
        policy.validate_url("https://api.blocked.example/path")
    policy.validate_url("https://notblocked.example/path")


def test_domain_blacklist_uses_same_idna_normalization_as_aiohttp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DOMAIN_BLACK_LIST", "faß.de")
    policy = OutboundPolicy.from_environment()

    with pytest.raises(OutboundPolicyError, match="hostname is blocked"):
        policy.validate_url("https://faß.de/path")
    policy.validate_url("https://fass.de/path")


@pytest.mark.parametrize(
    "value",
    [
        "not-a-url",
        "file:///tmp/tool",
        "http://user@core-aitools:18668/aitools/v1/ocr",
        "http://core-aitools:18668/aitools/v1/ocr;ignored",
        "http://core-aitools:18668/aitools/v1/ocr?mode=unsafe",
    ],
)
def test_invalid_private_endpoint_configuration_fails_closed(
    monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", value)

    with pytest.raises(OutboundPolicyError):
        OutboundPolicy.from_environment()


@pytest.mark.parametrize(
    "candidate",
    [
        "http://169.254.169.254/latest/meta-data",
        "//127.0.0.1/internal",
        "http://public.example/resource",
        "https://public.example:444/resource",
        "https://user@public.example/resource",
    ],
)
def test_same_origin_rejects_authority_or_scheme_changes(candidate: str) -> None:
    with pytest.raises(OutboundPolicyError):
        ensure_same_origin("https://public.example/base", candidate)


def test_same_origin_allows_relative_path_result() -> None:
    ensure_same_origin(
        "https://public.example/base",
        "https://public.example/next?value=1",
    )
