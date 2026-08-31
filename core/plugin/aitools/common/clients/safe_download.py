"""SSRF-safe downloads for remote files supplied by API callers."""

import ipaddress
import math
import os
import re
import socket
from typing import Callable, Optional, Tuple, Union
from urllib.parse import SplitResult, unquote_to_bytes, urlsplit

import aiohttp
from loguru import logger as log
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import HTTPClientException
from plugin.aitools.const.const import (
    AIOHTTP_CLIENT_CONNECT_TIMEOUT_KEY,
    AIOHTTP_CLIENT_READ_TIMEOUT_KEY,
    AIOHTTP_CLIENT_TOTAL_TIMEOUT_KEY,
)
from yarl import URL

IpAddress = Union[ipaddress.IPv4Address, ipaddress.IPv6Address]
IpNetwork = Union[ipaddress.IPv4Network, ipaddress.IPv6Network]

_ALLOWED_SCHEMES = {"http", "https"}
_DOWNLOAD_CHUNK_SIZE = 64 * 1024
DEFAULT_MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
_INVALID_PERCENT_ESCAPE = re.compile(r"%(?![0-9a-fA-F]{2})")
_S3_BUCKET_PATTERN = re.compile(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")
_NEVER_CONNECT_NETWORKS: Tuple[IpNetwork, ...] = tuple(
    ipaddress.ip_network(value)
    for value in (
        "0.0.0.0/8",
        "192.0.0.0/24",
        "192.0.2.0/24",
        "192.88.99.0/24",
        "198.18.0.0/15",
        "198.51.100.0/24",
        "203.0.113.0/24",
        "240.0.0.0/4",
        "::/96",
        "64:ff9b::/96",
        "64:ff9b:1::/48",
        "100::/64",
        "2001::/23",
        "2001:db8::/32",
        "2002::/16",
    )
)


class RemoteResourcePolicyError(ValueError):
    """Raised when a caller-controlled download target is unsafe."""


def create_public_socket_factory(
    target_url: str,
) -> Callable[[aiohttp.AddrInfoType], socket.socket]:
    """Validate the actual address selected by aiohttp before opening its socket."""
    _, allow_private_storage = _validate_resource_url(target_url)

    def socket_factory(addr_info: aiohttp.AddrInfoType) -> socket.socket:
        family, type_, proto, _, sockaddr = addr_info
        try:
            address = ipaddress.ip_address(sockaddr[0])
        except ValueError as exc:
            raise RemoteResourcePolicyError(
                "Resolved remote resource address is invalid"
            ) from exc
        _validate_destination_address(
            address,
            allow_private_storage=allow_private_storage,
        )
        return socket.socket(family=family, type=type_, proto=proto)

    return socket_factory


async def fetch_public_resource(
    url: str,
    span: Optional[SpanLike] = None,
    *,
    max_bytes: int = DEFAULT_MAX_DOWNLOAD_BYTES,
) -> bytes:
    """Download a public or exact trusted-storage resource with SSRF checks."""
    hostname = "invalid"
    try:
        if max_bytes <= 0:
            raise RemoteResourcePolicyError("Remote resource size limit is invalid")
        parsed, _ = _validate_resource_url(url)
        hostname = _normalize_hostname(parsed.hostname or "")
        connector = aiohttp.TCPConnector(
            use_dns_cache=False,
            socket_factory=create_public_socket_factory(url),
        )
        timeout = aiohttp.ClientTimeout(
            total=_positive_float_setting(AIOHTTP_CLIENT_TOTAL_TIMEOUT_KEY, 300.0),
            connect=_positive_float_setting(AIOHTTP_CLIENT_CONNECT_TIMEOUT_KEY, 10.0),
            sock_read=_positive_float_setting(AIOHTTP_CLIENT_READ_TIMEOUT_KEY, 60.0),
        )
        return await _download_resource(url, connector, timeout, max_bytes)
    except RemoteResourcePolicyError as exc:
        log.warning(
            "Remote resource download rejected, host={}, reason={}", hostname, exc
        )
        if span is not None:
            span.add_error_event("Remote resource download rejected")
        raise HTTPClientException.from_error_code(
            CodeEnums.HTTPClientError,
            extra_message=str(exc),
        ) from exc
    except Exception as exc:
        log.debug(
            "Remote resource download failed, host={}, error_type={}",
            hostname,
            type(exc).__name__,
        )
        if span is not None:
            span.add_error_event("Remote resource download failed")
        raise HTTPClientException.from_error_code(
            CodeEnums.HTTPClientError,
            extra_message="Remote resource download failed",
        ) from exc


async def _download_resource(
    url: str,
    connector: aiohttp.TCPConnector,
    timeout: aiohttp.ClientTimeout,
    max_bytes: int,
) -> bytes:
    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        trust_env=False,
    ) as session:
        async with session.get(url, allow_redirects=False) as response:
            if not 200 <= response.status < 300:
                raise RemoteResourcePolicyError(
                    f"Remote resource returned HTTP {response.status}"
                )
            return await _read_bounded_response(response, max_bytes)


async def _read_bounded_response(
    response: aiohttp.ClientResponse,
    max_bytes: int,
) -> bytes:
    content_length = response.content_length
    if content_length is not None and content_length > max_bytes:
        raise RemoteResourcePolicyError("Remote resource is too large")

    content = bytearray()
    async for chunk in response.content.iter_chunked(_DOWNLOAD_CHUNK_SIZE):
        if len(content) + len(chunk) > max_bytes:
            raise RemoteResourcePolicyError("Remote resource is too large")
        content.extend(chunk)
    return bytes(content)


def _validate_resource_url(url: str) -> Tuple[SplitResult, bool]:
    parsed = _parse_resource_url(url)
    allow_private_storage = _is_configured_storage_url(parsed)
    normalized_host = _normalize_hostname(parsed.hostname or "")
    literal_address = _parse_ip(normalized_host)
    if literal_address is not None:
        _validate_destination_address(
            literal_address,
            allow_private_storage=allow_private_storage,
        )
    return parsed, allow_private_storage


def _positive_float_setting(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return value if math.isfinite(value) and value > 0 else default


def _parse_resource_url(url: str) -> SplitResult:
    _validate_url_characters(url)
    try:
        # ``urlsplit`` deliberately keeps semicolon path parameters in ``path``.
        # Dropping them would let policy validation inspect a different path from
        # the one aiohttp sends to the object-storage origin.
        parsed = urlsplit(url)
        port = parsed.port
    except (TypeError, ValueError) as exc:
        raise RemoteResourcePolicyError("Remote resource URL is malformed") from exc
    _validate_parsed_resource_url(parsed, port)
    return parsed


def _validate_url_characters(url: str) -> None:
    if not isinstance(url, str) or any(
        ord(character) < 0x20 or ord(character) == 0x7F for character in url
    ):
        raise RemoteResourcePolicyError("Remote resource URL is malformed")


def _validate_parsed_resource_url(
    parsed: SplitResult,
    port: Optional[int],
) -> None:
    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise RemoteResourcePolicyError(
            "Only HTTP and HTTPS remote resources are allowed"
        )
    if not parsed.hostname:
        raise RemoteResourcePolicyError("Remote resource URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise RemoteResourcePolicyError(
            "Remote resource URL must not include user information"
        )
    if "\\" in parsed.netloc:
        raise RemoteResourcePolicyError("Remote resource URL authority is invalid")
    if parsed.fragment:
        raise RemoteResourcePolicyError(
            "Remote resource URL must not include a fragment"
        )
    if port is not None and not 1 <= port <= 65535:
        raise RemoteResourcePolicyError("Remote resource URL port is invalid")


def _normalize_hostname(hostname: str) -> str:
    value = hostname.strip().lower().rstrip(".")
    if _parse_ip(value) is not None:
        return value
    try:
        normalized = URL.build(scheme="http", host=value).raw_host
    except (TypeError, ValueError, UnicodeError) as exc:
        raise RemoteResourcePolicyError("Remote resource hostname is invalid") from exc
    if not normalized:
        raise RemoteResourcePolicyError("Remote resource hostname is invalid")
    return normalized.rstrip(".")


def _parse_ip(value: str) -> Optional[IpAddress]:
    try:
        return ipaddress.ip_address(value)
    except ValueError:
        return None


def _validate_destination_address(
    address: IpAddress,
    *,
    allow_private_storage: bool,
) -> None:
    canonical = _canonical_address(address)
    unsafe_properties = (
        canonical.is_unspecified,
        canonical.is_loopback,
        canonical.is_link_local,
        canonical.is_multicast,
        canonical.is_reserved,
        bool(getattr(canonical, "is_site_local", False)),
    )
    if any(unsafe_properties) or _matches_any(address, _NEVER_CONNECT_NETWORKS):
        raise RemoteResourcePolicyError("Remote resource address is unsafe")
    if not allow_private_storage and not canonical.is_global:
        raise RemoteResourcePolicyError("Remote resource address is unsafe")


def _is_configured_storage_url(candidate: SplitResult) -> bool:
    """Authorize only objects under the server-configured S3 download origin/bucket."""
    if os.getenv("OSS_TYPE", "ifly_gateway_storage").strip().lower() != "s3":
        return False
    origin_value = os.getenv("OSS_DOWNLOAD_HOST", "").strip()
    buckets = {
        value
        for setting in ("OSS_BUCKET_NAME", "OSS_BUCKET_CONSOLE")
        if (value := os.getenv(setting, "").strip())
        and value == value.lower()
        and _S3_BUCKET_PATTERN.fullmatch(value) is not None
    }
    if not origin_value or not buckets:
        return False

    try:
        origin = _parse_resource_url(origin_value)
        origin_mismatches = (
            bool(origin.query),
            bool(origin.fragment),
            origin.path not in {"", "/"},
            ";" in candidate.path,
            candidate.scheme.lower() != origin.scheme.lower(),
            _normalize_hostname(candidate.hostname or "")
            != _normalize_hostname(origin.hostname or ""),
            _effective_port(candidate) != _effective_port(origin),
            bool(candidate.query),
        )
        if any(origin_mismatches):
            return False
        candidate_path = _decoded_path(candidate.path)
    except (TypeError, ValueError, RemoteResourcePolicyError):
        return False

    for bucket in buckets:
        required_prefix = f"/{bucket}/"
        if candidate_path.startswith(required_prefix) and len(candidate_path) > len(
            required_prefix
        ):
            return True
    return False


def _effective_port(parsed: SplitResult) -> int:
    if parsed.port is not None:
        return parsed.port
    return 443 if parsed.scheme.lower() == "https" else 80


def _decoded_path(raw_path: str) -> str:
    try:
        if _INVALID_PERCENT_ESCAPE.search(raw_path):
            raise ValueError
        value = unquote_to_bytes(raw_path).decode("utf-8", errors="strict")
    except (UnicodeDecodeError, ValueError):
        raise RemoteResourcePolicyError("Remote resource path is invalid") from None
    if (
        not value.startswith("/")
        or "\\" in value
        or any(ord(character) < 0x20 or ord(character) == 0x7F for character in value)
        or any(segment in {".", ".."} for segment in value.split("/"))
    ):
        raise RemoteResourcePolicyError("Remote resource path is invalid")
    return value


def _canonical_address(address: IpAddress) -> IpAddress:
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        return address.ipv4_mapped
    return address


def _matches_any(address: IpAddress, networks: Tuple[IpNetwork, ...]) -> bool:
    candidates: Tuple[IpAddress, ...] = (address,)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        candidates += (address.ipv4_mapped,)
    return any(
        candidate.version == network.version and candidate in network
        for candidate in candidates
        for network in networks
    )
