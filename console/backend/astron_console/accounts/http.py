import hashlib
import ipaddress
import json
import logging
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


def response(data=None, message="", status=200):
    result = JsonResponse(
        {"code": 0 if status < 400 else status, "message": message, "data": data}, status=status
    )
    result["Cache-Control"] = "no-store"
    return result


def source_address(request):
    address = request.META.get("REMOTE_ADDR", "unknown")
    try:
        peer = ipaddress.ip_address(address)
        trusted = any(
            peer in ipaddress.ip_network(network.strip())
            for network in settings.CONSOLE_TRUSTED_PROXIES
            if network.strip()
        )
        if trusted:
            return str(ipaddress.ip_address(request.META.get("HTTP_X_REAL_IP", address)))
    except ValueError:
        pass
    return address


def endpoint(*, authenticated=False, limit=0):
    def decorate(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if authenticated and not request.user.is_authenticated:
                return response(message="请先登录", status=401)
            if limit:
                digest = hashlib.sha256(source_address(request).encode()).hexdigest()
                key = f"auth-rate:{view.__name__}:{digest}"
                try:
                    if cache.add(key, 1, timeout=60):
                        count = 1
                    else:
                        try:
                            count = cache.incr(key)
                        except ValueError:
                            # Expiry between add and incr: begin the next window.
                            cache.add(key, 1, timeout=60)
                            count = 1
                except RedisError:
                    logger.error("Authentication rate limiter unavailable")
                    return response(message="登录服务暂时不可用，请稍后重试", status=503)
                if count > limit:
                    result = response(message="操作过于频繁，请稍后重试", status=429)
                    result["Retry-After"] = "60"
                    return result
            request.payload = {}
            if request.method == "POST":
                try:
                    payload = json.loads(request.body)
                    if not isinstance(payload, dict):
                        raise ValueError
                    request.payload = payload
                except (ValueError, UnicodeDecodeError):
                    return response(message="请求必须是 JSON 对象", status=400)
            return view(request, *args, **kwargs)

        return wrapped

    return decorate


def form_error(form):
    return response(
        message="；".join(str(item) for errors in form.errors.values() for item in errors),
        status=400,
    )
