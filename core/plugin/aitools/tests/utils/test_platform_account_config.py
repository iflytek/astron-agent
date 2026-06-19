from pathlib import Path
from unittest.mock import Mock

import pytest


def test_aitools_services_do_not_read_ai_credentials_from_environment() -> None:
    service_root = Path(__file__).parents[2] / "service"
    offenders = []

    for path in service_root.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        if any(
            token in text
            for token in (
                "os.getenv(AI_APP_ID_KEY",
                "os.getenv(AI_API_KEY_KEY",
                "os.getenv(AI_API_SECRET_KEY",
            )
        ):
            offenders.append(path.relative_to(service_root))

    assert offenders == []


def test_get_iflytek_credentials_reads_plain_redis_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from plugin.aitools import platform_account_config

    fake_client = Mock()
    fake_client.get.return_value = (
        b'{"platformAppId":"app-id","platformApiKey":"api-key",'
        b'"platformApiSecret":"api-secret"}'
    )
    monkeypatch.setattr(platform_account_config, "_redis_client", lambda: fake_client)

    credentials = platform_account_config.get_iflytek_open_platform_credentials()

    assert credentials.app_id == "app-id"
    assert credentials.api_key == "api-key"
    assert credentials.api_secret == "api-secret"
    fake_client.get.assert_called_once_with(
        "platform_account_text:iflytek_open_platform"
    )


def test_get_iflytek_credentials_fails_clearly_when_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from plugin.aitools import platform_account_config
    from plugin.aitools.common.exceptions.exceptions import ServiceException

    fake_client = Mock()
    fake_client.get.return_value = None
    monkeypatch.setattr(platform_account_config, "_redis_client", lambda: fake_client)
    monkeypatch.setattr(platform_account_config, "_load_from_database", lambda: None)

    with pytest.raises(ServiceException) as exc_info:
        platform_account_config.get_iflytek_open_platform_credentials()

    assert "讯飞开放平台 is not configured" in exc_info.value.message
