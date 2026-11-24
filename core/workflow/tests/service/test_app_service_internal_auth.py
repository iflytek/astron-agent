"""Tenant management calls must include the deployment-managed internal key."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.service.app_service import _gen_app_auth_header, get_app_source_detail
from workflow.utils.credentials import TENANT_INTERNAL_API_KEY_HEADER


def test_gen_app_auth_header_includes_tenant_internal_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_MANAGE_PLAT_KEY", "k" * 48)
    monkeypatch.setenv("APP_MANAGE_PLAT_SECRET", "s" * 48)
    monkeypatch.delenv("APP_MANAGE_PLAT_KEY_FILE", raising=False)
    monkeypatch.delenv("APP_MANAGE_PLAT_SECRET_FILE", raising=False)

    with patch(
        "workflow.service.app_service.HMACAuth.build_auth_header",
        return_value={"Authorization": "signed"},
    ) as build_auth_header:
        headers = _gen_app_auth_header("http://core-tenant:5052/v2/app/details")

    assert headers == {
        "Authorization": "signed",
        TENANT_INTERNAL_API_KEY_HEADER: "s" * 48,
    }
    build_auth_header.assert_called_once_with(
        request_url="http://core-tenant:5052/v2/app/details",
        api_key="k" * 48,
        api_secret="s" * 48,
    )


def test_gen_app_auth_header_fails_closed_without_complete_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_MANAGE_PLAT_KEY", "k" * 48)
    monkeypatch.delenv("APP_MANAGE_PLAT_SECRET", raising=False)
    monkeypatch.delenv("APP_MANAGE_PLAT_KEY_FILE", raising=False)
    monkeypatch.delenv("APP_MANAGE_PLAT_SECRET_FILE", raising=False)

    assert _gen_app_auth_header("http://core-tenant:5052/v2/app/list") == {}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "app_detail",
    [
        {
            "is_disable": True,
            "auth_list": [{"api_key": "test_key", "api_secret": "test_secret"}],
        },
        {"is_disable": False, "auth_list": []},
    ],
)
async def test_app_detail_requires_enabled_app_with_current_keys(
    app_detail: dict,
) -> None:
    response = Mock(status_code=200)
    response.json.return_value = {"code": 0, "data": [app_detail]}
    span = Mock(add_info_event_async=AsyncMock())
    with patch("requests.get", return_value=response):
        with pytest.raises(CustomException) as exc:
            await get_app_source_detail("test_app_id", span)
    assert exc.value.code == CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code
