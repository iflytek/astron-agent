import json
import os
from contextvars import ContextVar
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from loguru import logger

KNOWLEDGE_PLATFORM_CACHE_KEY = "platform_account_text:knowledge_platform"
PLATFORM_ACCOUNT_CATEGORY = "PLATFORM_ACCOUNT"
KNOWLEDGE_PLATFORM_CODE = "KNOWLEDGE_PLATFORM"

_PLATFORM_ACCOUNT_CONFIG: ContextVar[Dict[str, Any]] = ContextVar(
    "platform_account_config", default={}
)
_PLATFORM_ACCOUNT_FALLBACK: ContextVar[Optional[Dict[str, Any]]] = ContextVar(
    "platform_account_fallback", default=None
)
_REDIS_CLIENT = None


def set_platform_account_config(config: Dict[str, Any]) -> None:
    _PLATFORM_ACCOUNT_CONFIG.set(config)
    _PLATFORM_ACCOUNT_FALLBACK.set(None)


def get_config_value(section: str, key: str, default: Optional[Any] = None) -> Any:
    value = _section_value(_PLATFORM_ACCOUNT_CONFIG.get({}), section, key)
    return default if value in (None, "") else value


def get_managed_config_value(
    section: str, key: str, default: Optional[Any] = None
) -> Any:
    value = get_config_value(section, key)
    if value not in (None, ""):
        return value

    fallback = _PLATFORM_ACCOUNT_FALLBACK.get()
    if fallback is None:
        fallback = _load_from_redis() or _load_from_database() or {}
        _PLATFORM_ACCOUNT_FALLBACK.set(fallback)
    value = _section_value(fallback, section, key)
    return default if value in (None, "") else value


def _section_value(config: Dict[str, Any], section: str, key: str) -> Any:
    section_config = config.get(section, {})
    if not isinstance(section_config, dict):
        return None
    if key in section_config:
        return section_config[key]
    camel_key = _snake_to_camel(key)
    return section_config.get(camel_key)


def _snake_to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


def _load_from_redis() -> Optional[Dict[str, Any]]:
    try:
        client = _redis_client()
        if client is None:
            return None
        raw_config = client.get(KNOWLEDGE_PLATFORM_CACHE_KEY)
        if isinstance(raw_config, bytes):
            raw_config = raw_config.decode("utf-8")
        if not raw_config:
            return None
        config = json.loads(raw_config)
        return config if isinstance(config, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning(f"Invalid knowledge platform config in Redis: {exc}")
        return None
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to read knowledge platform config from Redis: {exc}")
        return None


def _load_from_database() -> Optional[Dict[str, Any]]:
    try:
        import pymysql  # type: ignore[import-untyped]

        connection = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "mysql"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=_console_mysql_database(),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT `value`
                    FROM config_info
                    WHERE category = %s AND code = %s AND is_valid = 1
                    ORDER BY update_time DESC
                    LIMIT 1
                    """,
                    (PLATFORM_ACCOUNT_CATEGORY, KNOWLEDGE_PLATFORM_CODE),
                )
                row = cursor.fetchone()
                raw_config = row.get("value") if row else None
                if not raw_config:
                    return None
                config = json.loads(raw_config)
                if not isinstance(config, dict):
                    return None
                _store_to_redis(raw_config)
                return config
        finally:
            connection.close()
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning(f"Invalid knowledge platform config in database: {exc}")
        return None
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to read knowledge platform config from database: {exc}")
        return None


def _store_to_redis(raw_config: str) -> None:
    try:
        client = _redis_client()
        if client is not None:
            client.set(KNOWLEDGE_PLATFORM_CACHE_KEY, raw_config)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to cache knowledge platform config in Redis: {exc}")


def _redis_client():  # type: ignore[no-untyped-def]
    global _REDIS_CLIENT
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    redis_cluster_addr = os.getenv("REDIS_CLUSTER_ADDR", "")
    redis_addr = os.getenv("REDIS_ADDR", "redis:6379")
    redis_password = os.getenv("REDIS_PASSWORD") or None

    if redis_cluster_addr:
        from rediscluster import RedisCluster

        startup_nodes = []
        for item in redis_cluster_addr.split(","):
            host, port = item.strip().split(":", 1)
            startup_nodes.append({"host": host, "port": port})
        _REDIS_CLIENT = RedisCluster(
            startup_nodes=startup_nodes,
            password=redis_password,
            decode_responses=True,
        )
        return _REDIS_CLIENT

    if redis_addr:
        import redis

        host, port = redis_addr.split(":", 1)
        _REDIS_CLIENT = redis.Redis(
            host=host,
            port=int(port),
            password=redis_password,
            db=_redis_database(),
            decode_responses=True,
        )
        return _REDIS_CLIENT

    return None


def _redis_database() -> int:
    value = os.getenv("REDIS_DATABASE_CONSOLE") or os.getenv("REDIS_DATABASE") or "0"
    try:
        return int(value)
    except ValueError:
        return 0


def _console_mysql_database() -> str:
    explicit = os.getenv("CONSOLE_MYSQL_DB")
    if explicit:
        return explicit

    mysql_url = os.getenv("MYSQL_URL", "")
    if mysql_url.startswith("jdbc:"):
        mysql_url = mysql_url[5:]
    parsed = urlparse(mysql_url)
    if parsed.path and parsed.path != "/":
        return parsed.path.lstrip("/")
    return "astron_console"
