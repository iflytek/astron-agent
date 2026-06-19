import json
import os
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

from loguru import logger
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException

IFLYTEK_OPEN_PLATFORM_CACHE_KEY = "platform_account_text:iflytek_open_platform"
PLATFORM_ACCOUNT_CATEGORY = "PLATFORM_ACCOUNT"
IFLYTEK_OPEN_PLATFORM_CODE = "IFLYTEK_OPEN_PLATFORM"

_REDIS_CLIENT = None


@dataclass(frozen=True)
class IflytekOpenPlatformCredentials:
    app_id: str
    api_key: str
    api_secret: str


def get_iflytek_open_platform_credentials() -> IflytekOpenPlatformCredentials:
    raw_config = _load_from_redis() or _load_from_database()
    credentials = _parse_credentials(raw_config)
    if credentials is None:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceParamsError,
            extra_message=(
                "讯飞开放平台 is not configured. "
                "Please configure it in Platform Account Management first."
            ),
        )
    return credentials


def get_iflytek_open_platform_app_id(default: str = "") -> str:
    try:
        return get_iflytek_open_platform_credentials().app_id
    except ServiceException:
        return default


def _load_from_redis() -> Optional[str]:
    try:
        client = _redis_client()
        if client is None:
            return None
        value = client.get(IFLYTEK_OPEN_PLATFORM_CACHE_KEY)
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to read platform account config from Redis: {exc}")
        return None


def _load_from_database() -> Optional[str]:
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
                    LIMIT 1
                    """,
                    (PLATFORM_ACCOUNT_CATEGORY, IFLYTEK_OPEN_PLATFORM_CODE),
                )
                row = cursor.fetchone()
                value = row.get("value") if row else None
                if value:
                    _store_to_redis(value)
                return value
        finally:
            connection.close()
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to read platform account config from database: {exc}")
        return None


def _store_to_redis(value: str) -> None:
    try:
        client = _redis_client()
        if client is not None:
            client.set(IFLYTEK_OPEN_PLATFORM_CACHE_KEY, value)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(f"Failed to write platform account config to Redis: {exc}")


def _redis_client():  # type: ignore[no-untyped-def]
    global _REDIS_CLIENT
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    redis_cluster_addr = os.getenv("REDIS_CLUSTER_ADDR", "")
    redis_addr = os.getenv("REDIS_ADDR", "")
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


def _redis_database() -> int:
    value = os.getenv("REDIS_DATABASE_CONSOLE") or os.getenv("REDIS_DATABASE") or "0"
    try:
        return int(value)
    except ValueError:
        return 0


def _parse_credentials(
    raw_config: Optional[str],
) -> Optional[IflytekOpenPlatformCredentials]:
    if not raw_config:
        return None

    try:
        config = json.loads(raw_config)
    except json.JSONDecodeError:
        return None

    app_id = _clean(config.get("platformAppId"))
    api_key = _clean(config.get("platformApiKey"))
    api_secret = _clean(config.get("platformApiSecret"))

    if not app_id or not api_key or not api_secret:
        return None

    return IflytekOpenPlatformCredentials(
        app_id=app_id,
        api_key=api_key,
        api_secret=api_secret,
    )


def _clean(value: object) -> str:
    return str(value).strip() if value is not None else ""
