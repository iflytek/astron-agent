"""Deployment defaults around Django's host, CSRF, and cookie mechanisms."""

from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.utils.deprecation import MiddlewareMixin


def public_origin(request):
    """Prefer an operator-pinned origin, otherwise use the validated request."""
    return settings.CONSOLE_PUBLIC_ORIGIN or request.build_absolute_uri("/").rstrip("/")


class DeploymentMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Keep forwarding headers from untrusted clients out of Django's HTTPS
        # and CSRF decisions. Uvicorn likewise runs with --no-proxy-headers.
        try:
            peer = ip_address(request.META.get("REMOTE_ADDR", ""))
            trusted = any(
                peer in ip_network(network.strip())
                for network in settings.CONSOLE_TRUSTED_PROXIES
                if network.strip()
            )
        except ValueError:
            trusted = False
        if not trusted:
            request.META.pop("HTTP_X_FORWARDED_PROTO", None)

        # get_host() performs Django's normal syntax/explicit allowlist checks.
        # Auto mode accepts IP addresses and local service names, never arbitrary
        # DNS names. This avoids requiring a public IP in every new installation.
        host = request.get_host()
        if settings.CONSOLE_AUTO_ALLOWED_HOSTS:
            hostname = urlsplit("//" + host).hostname or ""
            if hostname.rstrip(".") not in {"localhost", "console-hub"}:
                try:
                    ip_address(hostname)
                except ValueError as exc:
                    raise DisallowedHost("Configure CONSOLE_ALLOWED_HOSTS for DNS names") from exc

    def process_response(self, request, response):
        if settings.CONSOLE_AUTO_COOKIE_SECURE:
            # Runs after the official session/CSRF middleware writes its cookies.
            # Do not mutate process-global settings between HTTP/HTTPS requests.
            for name in (settings.SESSION_COOKIE_NAME, settings.CSRF_COOKIE_NAME):
                if name in response.cookies:
                    response.cookies[name]["secure"] = request.is_secure()
        return response
