from unittest.mock import MagicMock, Mock, patch

from workflow.engine.nodes.knowledge import platform_account_config


def test_ragflow_headers_use_plain_redis_cache() -> None:
    fake_client = Mock()
    fake_client.get.return_value = (
        b'{"ragflow":{"baseUrl":"http://ragflow","apiToken":"secret",'
        b'"timeout":45,"defaultGroup":"default"}}'
    )

    with patch.object(
        platform_account_config, "_redis_client", return_value=fake_client
    ):
        headers = platform_account_config.get_platform_account_headers("Ragflow-RAG")

    assert headers == {
        "x-ragflow-base-url": "http://ragflow",
        "x-ragflow-api-token": "secret",
        "x-ragflow-timeout": "45",
        "x-ragflow-default-group": "default",
    }
    fake_client.get.assert_called_once_with(
        platform_account_config.KNOWLEDGE_PLATFORM_CACHE_KEY
    )


def test_ragflow_headers_fall_back_to_database_after_redis_loss() -> None:
    with patch.object(
        platform_account_config, "_load_from_redis", return_value=None
    ), patch.object(
        platform_account_config,
        "_load_from_database",
        return_value=(
            '{"ragflow":{"baseUrl":"http://ragflow",' '"apiToken":"database-secret"}}'
        ),
    ):
        headers = platform_account_config.get_platform_account_headers("Ragflow-RAG")

    assert headers["x-ragflow-base-url"] == "http://ragflow"
    assert headers["x-ragflow-api-token"] == "database-secret"


def test_database_result_backfills_redis() -> None:
    fake_cursor = Mock()
    fake_cursor.fetchone.return_value = {"value": '{"ragflow":{"baseUrl":"url"}}'}
    fake_connection = MagicMock()
    fake_connection.cursor.return_value.__enter__.return_value = fake_cursor

    with patch("pymysql.connect", return_value=fake_connection), patch.object(
        platform_account_config, "_store_to_redis"
    ) as store_to_redis:
        value = platform_account_config._load_from_database()

    assert value == '{"ragflow":{"baseUrl":"url"}}'
    store_to_redis.assert_called_once_with(value)
    fake_connection.close.assert_called_once()


def test_non_ragflow_requests_do_not_load_platform_config() -> None:
    with patch.object(platform_account_config, "_load_from_redis") as load_from_redis:
        headers = platform_account_config.get_platform_account_headers("CBG-RAG")

    assert headers == {}
    load_from_redis.assert_not_called()
