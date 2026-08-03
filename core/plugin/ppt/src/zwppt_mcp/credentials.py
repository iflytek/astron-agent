"""Secret-safe resolution of Zhiwen PPT credentials."""

import json
import os
from dataclasses import dataclass
from typing import Callable, Mapping, Protocol, cast

import redis


class RedisLike(Protocol):
    """The Redis operation required to load the managed platform account."""

    def get(self, key: str) -> bytes | str | None: ...


@dataclass(frozen=True)
class Credentials:
    app_id: str
    api_secret: str


class CredentialError(RuntimeError):
    """Raised when PPT credentials cannot be resolved safely."""


def load_credentials(
    environ: Mapping[str, str] | None = None,
    redis_factory: Callable[..., RedisLike] = cast(Callable[..., RedisLike], redis.Redis),
) -> Credentials:
    """Load explicit credentials or the managed Console platform account."""
    values = os.environ if environ is None else environ
    app_id = values.get("AIPPT_APP_ID", "").strip()
    api_secret = values.get("AIPPT_API_SECRET", "").strip()
    if app_id and api_secret:
        return Credentials(app_id, api_secret)

    try:
        host, port = _redis_address(values.get("REDIS_ADDR", "redis:6379"))
        database = _database_number(values.get("REDIS_DATABASE_CONSOLE", "1"))
        client = redis_factory(
            host=host,
            port=port,
            password=values.get("REDIS_PASSWORD") or None,
            db=database,
            decode_responses=True,
        )
        managed = _managed_credentials(
            client.get("platform_account_text:iflytek_open_platform")
        )
    except (OSError, ValueError, json.JSONDecodeError, redis.RedisError):
        raise CredentialError("PPT credentials are not configured") from None

    if managed is None:
        raise CredentialError("PPT credentials are not configured")
    return managed


def _redis_address(address: str) -> tuple[str, int]:
    host, separator, port_text = address.rpartition(":")
    if not separator or not host or not port_text:
        raise ValueError("invalid Redis address")
    port = int(port_text)
    if not 1 <= port <= 65535:
        raise ValueError("invalid Redis port")
    return host, port


def _database_number(value: str) -> int:
    database = int(value)
    if database < 0:
        raise ValueError("invalid Redis database")
    return database


def _managed_credentials(raw: bytes | str | None) -> Credentials | None:
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        return None
    app_id = payload.get("platformAppId")
    api_secret = payload.get("platformApiSecret")
    if not isinstance(app_id, str) or not isinstance(api_secret, str):
        return None
    app_id = app_id.strip()
    api_secret = api_secret.strip()
    if not app_id or not api_secret:
        return None
    return Credentials(app_id, api_secret)
