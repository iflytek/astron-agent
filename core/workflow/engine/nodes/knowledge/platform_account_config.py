import json
import logging
import os
from typing import Any, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

KNOWLEDGE_PLATFORM_CACHE_KEY = "platform_account_text:knowledge_platform"
PLATFORM_ACCOUNT_CATEGORY = "PLATFORM_ACCOUNT"
KNOWLEDGE_PLATFORM_CODE = "KNOWLEDGE_PLATFORM"
RAGFLOW_RAG_TYPE = "Ragflow-RAG"

_REDIS_CLIENT = None


def get_platform_account_headers(rag_type: str) -> dict[str, str]:
    if rag_type != RAGFLOW_RAG_TYPE:
        return {}

    raw_config = _load_from_redis() or _load_from_database()
    config = _parse_config(raw_config)
    ragflow = config.get("ragflow")
    if not isinstance(ragflow, dict):
        return {}

    headers = {
        "x-ragflow-base-url": ragflow.get("baseUrl"),
        "x-ragflow-api-token": ragflow.get("apiToken"),
        "x-ragflow-timeout": ragflow.get("timeout"),
        "x-ragflow-default-group": ragflow.get("defaultGroup"),
    }
    return {
        key: str(value) for key, value in headers.items() if value not in (None, "")
    }


def _parse_config(raw_config: Optional[str]) -> dict[str, Any]:
    if not raw_config:
        return {}
    try:
        config = json.loads(raw_config)
        return config if isinstance(config, dict) else {}
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Invalid knowledge platform config: %s", exc)
        return {}


def _load_from_redis() -> Optional[str]:
    try:
        client = _redis_client()
        if client is None:
            return None
        value = client.get(KNOWLEDGE_PLATFORM_CACHE_KEY)
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning("Failed to read knowledge platform config from Redis: %s", exc)
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
                    ORDER BY update_time DESC
                    LIMIT 1
                    """,
                    (PLATFORM_ACCOUNT_CATEGORY, KNOWLEDGE_PLATFORM_CODE),
                )
                row = cursor.fetchone()
                value = row.get("value") if row else None
                if value:
                    _store_to_redis(value)
                return value
        finally:
            connection.close()
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning(
            "Failed to read knowledge platform config from database: %s", exc
        )
        return None


def _store_to_redis(value: str) -> None:
    try:
        client = _redis_client()
        if client is not None:
            client.set(KNOWLEDGE_PLATFORM_CACHE_KEY, value)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning("Failed to cache knowledge platform config in Redis: %s", exc)


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
