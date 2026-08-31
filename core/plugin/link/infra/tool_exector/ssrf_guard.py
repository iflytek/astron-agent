"""Connection-bound SSRF protection for outbound HTTP tool calls."""

import ipaddress
import os
import socket
from dataclasses import dataclass
from typing import Callable, Tuple, Union
from urllib.parse import SplitResult, urlsplit

import aiohttp
from plugin.link.consts import const
from yarl import URL

IpAddress = Union[ipaddress.IPv4Address, ipaddress.IPv6Address]
IpNetwork = Union[ipaddress.IPv4Network, ipaddress.IPv6Network]
Endpoint = Tuple[str, str, int, str]

_ALLOWED_SCHEMES = {"http", "https"}
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


class OutboundPolicyError(ValueError):
    """Raised when an outbound URL or its actual socket destination is unsafe."""


@dataclass(frozen=True)
class OutboundPolicy:
    """Immutable outbound destination policy loaded from link-service configuration."""

    blocked_networks: Tuple[IpNetwork, ...]
    allowed_literal_networks: Tuple[IpNetwork, ...]
    blocked_domains: Tuple[str, ...]
    allowed_private_endpoints: Tuple[Endpoint, ...]

    @classmethod
    def from_environment(cls) -> "OutboundPolicy":
        """Load and strictly parse the current outbound security configuration."""
        blocked_networks = _parse_networks(
            os.getenv(const.SEGMENT_BLACK_LIST_KEY, ""),
            const.SEGMENT_BLACK_LIST_KEY,
        ) + _parse_networks(
            os.getenv(const.IP_BLACK_LIST_KEY, ""),
            const.IP_BLACK_LIST_KEY,
        )
        allowed_literal_networks = _parse_networks(
            os.getenv(const.IP_WHITE_LIST_KEY, ""),
            const.IP_WHITE_LIST_KEY,
        )
        blocked_domains = _parse_domains(os.getenv(const.DOMAIN_BLACK_LIST_KEY, ""))
        allowed_private_endpoints = _parse_private_endpoints(
            os.getenv(const.PRIVATE_ENDPOINT_ALLOW_LIST_KEY, "")
        )
        return cls(
            blocked_networks,
            allowed_literal_networks,
            blocked_domains,
            allowed_private_endpoints,
        )

    def validate_url(self, url: str) -> SplitResult:
        """Validate URL syntax and any literal destination before DNS resolution."""
        parsed = _parse_http_url(url)
        normalized_host = _normalize_hostname(parsed.hostname or "")
        if self.is_domain_blocked(normalized_host):
            raise OutboundPolicyError("Outbound hostname is blocked")

        literal = _parse_ip(normalized_host)
        if literal is not None:
            self.validate_address(
                literal,
                allow_private_endpoint=self.is_private_endpoint_allowed(parsed),
                allow_literal_exception=True,
            )
        return parsed

    def is_private_endpoint_allowed(self, parsed: SplitResult) -> bool:
        """Return whether deployment configuration authorizes this exact private endpoint."""
        # Private exceptions intentionally support only exact plain paths. Keeping
        # semicolons in ``SplitResult.path`` prevents matrix parameters (including
        # a trailing empty ``;``) from comparing equal to the configured path.
        return (
            ";" not in parsed.path
            and _endpoint(parsed) in self.allowed_private_endpoints
        )

    def validate_address(
        self,
        address: IpAddress,
        *,
        allow_private_endpoint: bool,
        allow_literal_exception: bool,
    ) -> None:
        """Validate the exact IP address that aiohttp is about to connect to."""
        if _matches_any(address, self.blocked_networks):
            raise OutboundPolicyError("Outbound address is blocked")
        if allow_literal_exception and _matches_any(
            address, self.allowed_literal_networks
        ):
            return
        if _is_never_connect_address(address):
            raise OutboundPolicyError("Outbound address is unsafe")
        if allow_private_endpoint:
            return
        if not _canonical_address(address).is_global:
            raise OutboundPolicyError("Outbound address is not globally routable")

    def is_domain_blocked(self, hostname: str) -> bool:
        """Match configured domains on label boundaries, including subdomains."""
        for rule in self.blocked_domains:
            if hostname == rule or hostname.endswith("." + rule):
                return True
        return False


def ensure_same_origin(base_url: str, candidate_url: str) -> None:
    """Reject path or authentication data that changes scheme, host, or port."""
    if _origin(base_url) != _origin(candidate_url):
        raise OutboundPolicyError("Tool path must not change the endpoint origin")


def create_socket_factory(
    policy: OutboundPolicy,
    target_url: str,
) -> Callable[[aiohttp.AddrInfoType], socket.socket]:
    """Create an aiohttp socket factory that checks the actual target sockaddr."""
    parsed = policy.validate_url(target_url)
    hostname = _normalize_hostname(parsed.hostname or "")
    literal_host = _parse_ip(hostname) is not None
    allow_private_endpoint = policy.is_private_endpoint_allowed(parsed)

    def socket_factory(addr_info: aiohttp.AddrInfoType) -> socket.socket:
        family, type_, proto, _, sockaddr = addr_info
        try:
            address = ipaddress.ip_address(sockaddr[0])
        except ValueError as exc:
            raise OutboundPolicyError("Resolved outbound address is invalid") from exc
        policy.validate_address(
            address,
            allow_private_endpoint=allow_private_endpoint,
            allow_literal_exception=literal_host,
        )
        return socket.socket(family=family, type=type_, proto=proto)

    return socket_factory


def _origin(url: str) -> Tuple[str, str, int]:
    try:
        parsed = urlsplit(url)
        scheme = parsed.scheme.lower()
        hostname = _normalize_hostname(parsed.hostname or "")
        port = parsed.port
    except (TypeError, ValueError) as exc:
        raise OutboundPolicyError("Outbound URL is malformed") from exc
    if scheme not in _ALLOWED_SCHEMES or not hostname:
        raise OutboundPolicyError("Outbound URL origin is invalid")
    if parsed.username is not None or parsed.password is not None:
        raise OutboundPolicyError("Outbound URL must not include user information")
    normalized_port = port if port is not None else (443 if scheme == "https" else 80)
    return scheme, hostname, normalized_port


def _parse_http_url(url: str) -> SplitResult:
    if not isinstance(url, str):
        raise OutboundPolicyError("Outbound URL is malformed")
    _validate_url_characters(url)
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except (TypeError, ValueError) as exc:
        raise OutboundPolicyError("Outbound URL is malformed") from exc
    _validate_parsed_http_url(parsed, port)
    return parsed


def _validate_url_characters(url: str) -> None:
    if any(ord(character) < 0x20 or ord(character) == 0x7F for character in url):
        raise OutboundPolicyError("Outbound URL contains control characters")


def _validate_parsed_http_url(parsed: SplitResult, port: Union[int, None]) -> None:
    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise OutboundPolicyError("Only HTTP and HTTPS tool URLs are allowed")
    if not parsed.hostname:
        raise OutboundPolicyError("Outbound URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise OutboundPolicyError("Outbound URL must not include user information")
    if "\\" in parsed.netloc:
        raise OutboundPolicyError("Outbound URL authority is invalid")
    if parsed.fragment:
        raise OutboundPolicyError("Outbound URL must not include a fragment")
    if port is not None and not 1 <= port <= 65535:
        raise OutboundPolicyError("Outbound URL port is invalid")


def _parse_networks(raw_value: str, setting_name: str) -> Tuple[IpNetwork, ...]:
    networks = []
    for entry in raw_value.split(","):
        value = entry.strip()
        if not value:
            continue
        try:
            networks.append(ipaddress.ip_network(value, strict=False))
        except ValueError as exc:
            raise OutboundPolicyError(f"Invalid {setting_name} entry") from exc
    return tuple(networks)


def _parse_domains(raw_value: str) -> Tuple[str, ...]:
    domains = []
    for entry in raw_value.split(","):
        value = entry.strip().lower().rstrip(".")
        if value.startswith("*."):
            value = value[2:]
        if value.startswith("."):
            value = value[1:]
        if not value:
            continue
        if "://" in value or "/" in value:
            raise OutboundPolicyError("Invalid DOMAIN_BLACK_LIST entry")
        try:
            # Use the same IDNA normalization as aiohttp/yarl applies to request hosts.
            # Python's built-in ``idna`` codec follows IDNA2003 and would otherwise
            # collapse distinct hosts such as faß.de and fass.de.
            domains.append(_normalize_hostname(value))
        except OutboundPolicyError as exc:
            raise OutboundPolicyError("Invalid DOMAIN_BLACK_LIST entry") from exc
    return tuple(domains)


def _parse_private_endpoints(raw_value: str) -> Tuple[Endpoint, ...]:
    endpoints = []
    for entry in raw_value.split(","):
        value = entry.strip()
        if not value:
            continue
        try:
            parsed = _parse_http_url(value)
        except OutboundPolicyError as exc:
            raise OutboundPolicyError(
                "Invalid PRIVATE_ENDPOINT_ALLOW_LIST entry"
            ) from exc
        if parsed.query or ";" in parsed.path:
            raise OutboundPolicyError(
                "PRIVATE_ENDPOINT_ALLOW_LIST entries must not include params or a query"
            )
        endpoints.append(_endpoint(parsed))
    return tuple(endpoints)


def _endpoint(parsed: SplitResult) -> Endpoint:
    scheme, hostname, port = _origin(parsed.geturl())
    return scheme, hostname, port, parsed.path or "/"


def _normalize_hostname(hostname: str) -> str:
    value = hostname.strip().lower().rstrip(".")
    if _parse_ip(value) is not None:
        return value
    try:
        normalized = URL.build(scheme="http", host=value).raw_host
    except (TypeError, ValueError, UnicodeError) as exc:
        raise OutboundPolicyError("Outbound hostname is invalid") from exc
    if not normalized:
        raise OutboundPolicyError("Outbound hostname is invalid")
    return normalized.rstrip(".")


def _parse_ip(value: str) -> Union[IpAddress, None]:
    try:
        return ipaddress.ip_address(value)
    except ValueError:
        return None


def _matches_any(address: IpAddress, networks: Tuple[IpNetwork, ...]) -> bool:
    candidates: Tuple[IpAddress, ...] = (address,)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        candidates += (address.ipv4_mapped,)
    return any(
        candidate.version == network.version and candidate in network
        for candidate in candidates
        for network in networks
    )


def _canonical_address(address: IpAddress) -> IpAddress:
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        return address.ipv4_mapped
    return address


def _is_never_connect_address(address: IpAddress) -> bool:
    canonical = _canonical_address(address)
    return (
        canonical.is_unspecified
        or canonical.is_loopback
        or canonical.is_link_local
        or canonical.is_multicast
        or canonical.is_reserved
        or bool(getattr(canonical, "is_site_local", False))
        or _matches_any(address, _NEVER_CONNECT_NETWORKS)
    )
