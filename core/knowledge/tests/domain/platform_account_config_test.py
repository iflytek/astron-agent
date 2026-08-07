import json
from unittest.mock import MagicMock, patch

from knowledge.domain import platform_account_config


def setup_function() -> None:
    platform_account_config._REDIS_CLIENT = None
    platform_account_config.set_platform_account_config({})


def test_request_header_config_takes_precedence_over_redis() -> None:
    platform_account_config.set_platform_account_config(
        {"ragflow": {"base_url": "http://request-ragflow"}}
    )

    with patch.object(platform_account_config, "_load_from_redis") as loader:
        value = platform_account_config.get_managed_config_value("ragflow", "base_url")

    assert value == "http://request-ragflow"
    loader.assert_not_called()


def test_missing_request_headers_fall_back_to_shared_platform_account_config() -> None:
    redis_client = MagicMock()
    redis_client.get.return_value = json.dumps(
        {
            "ragflow": {
                "baseUrl": "http://managed-ragflow",
                "apiToken": "managed-token",
                "timeout": 45,
                "defaultGroup": "managed-group",
            }
        }
    )
    platform_account_config.set_platform_account_config(
        {"ragflow": {"base_url": "", "api_token": ""}}
    )

    with patch.object(
        platform_account_config, "_redis_client", return_value=redis_client
    ):
        assert (
            platform_account_config.get_managed_config_value("ragflow", "base_url")
            == "http://managed-ragflow"
        )
        assert (
            platform_account_config.get_managed_config_value("ragflow", "api_token")
            == "managed-token"
        )
        assert (
            platform_account_config.get_managed_config_value("ragflow", "timeout") == 45
        )
        assert (
            platform_account_config.get_managed_config_value("ragflow", "default_group")
            == "managed-group"
        )

    redis_client.get.assert_called_once_with(
        platform_account_config.KNOWLEDGE_PLATFORM_CACHE_KEY
    )


def test_redis_miss_falls_back_to_persistent_database_config() -> None:
    database_config = {
        "ragflow": {
            "baseUrl": "http://database-ragflow",
            "apiToken": "database-token",
        }
    }

    with patch.object(
        platform_account_config, "_load_from_redis", return_value=None
    ), patch.object(
        platform_account_config,
        "_load_from_database",
        return_value=database_config,
    ) as database_loader:
        assert (
            platform_account_config.get_managed_config_value("ragflow", "base_url")
            == "http://database-ragflow"
        )
        assert (
            platform_account_config.get_managed_config_value("ragflow", "api_token")
            == "database-token"
        )

    database_loader.assert_called_once_with()


def test_database_loader_reads_console_config_and_backfills_redis() -> None:
    raw_config = json.dumps(
        {
            "ragflow": {
                "baseUrl": "http://database-ragflow",
                "apiToken": "database-token",
            }
        }
    )
    cursor = MagicMock()
    cursor.fetchone.return_value = {"value": raw_config}
    connection = MagicMock()
    connection.cursor.return_value.__enter__.return_value = cursor

    with patch("pymysql.connect", return_value=connection), patch.object(
        platform_account_config, "_store_to_redis"
    ) as cache_store:
        config = platform_account_config._load_from_database()

    assert config == json.loads(raw_config)
    assert cursor.execute.call_args.args[1] == (
        platform_account_config.PLATFORM_ACCOUNT_CATEGORY,
        platform_account_config.KNOWLEDGE_PLATFORM_CODE,
    )
    cache_store.assert_called_once_with(raw_config)
    connection.close.assert_called_once_with()


def test_invalid_redis_config_preserves_caller_default() -> None:
    redis_client = MagicMock()
    redis_client.get.return_value = "not-json"

    with patch.object(
        platform_account_config, "_redis_client", return_value=redis_client
    ), patch.object(platform_account_config, "_load_from_database", return_value=None):
        value = platform_account_config.get_managed_config_value(
            "ragflow", "base_url", "legacy-default"
        )

    assert value == "legacy-default"


def test_request_only_config_does_not_read_managed_fallback() -> None:
    with patch.object(platform_account_config, "_load_from_redis") as loader:
        value = platform_account_config.get_config_value(
            "xinghuo", "app_id", "legacy-default"
        )

    assert value == "legacy-default"
    loader.assert_not_called()
