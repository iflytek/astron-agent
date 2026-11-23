"""Regression checks for the built-in image generation endpoint."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock

import pytest
from aiohttp import ClientResponse
from fastapi import Request
from plugin.aitools.api.schemas.types import SuccessResponse
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.platform_account_config import IflytekOpenPlatformCredentials
from plugin.aitools.service.ase_image_generator import (
    req_ase_ability_image_generate_service as service,
)


@pytest.fixture
def vendor(monkeypatch: pytest.MonkeyPatch) -> tuple[Mock, AsyncMock]:
    upstream = Mock()

    class HttpClient:
        def __init__(self, **kwargs: object) -> None:
            upstream(**kwargs)

        @asynccontextmanager
        async def start(self):
            yield self

        @asynccontextmanager
        async def request(self):
            yield SuccessResponse(data={"content": upstream.return_value})

    upload = AsyncMock(return_value="https://storage.example/image.jpg")
    monkeypatch.setenv(
        service.IMAGE_GENERATE_URL_KEY, "https://vendor.example/v2.1/tti"
    )
    monkeypatch.setattr(service, "HttpClient", HttpClient)
    monkeypatch.setattr(service, "upload_file", upload)
    monkeypatch.setattr(
        service,
        "get_iflytek_open_platform_credentials",
        lambda: IflytekOpenPlatformCredentials("app", "key", "secret"),
    )
    return upstream, upload


@pytest.mark.parametrize("parsed", [True, False])
async def test_generates_image_for_both_response_content_types(
    vendor: tuple[Mock, AsyncMock], parsed: bool
) -> None:
    upstream, upload = vendor
    content = {
        "header": {"code": 0},
        "payload": {"choices": {"text": [{"content": "aW1hZ2U="}]}},
    }
    raw_response = Mock(spec=ClientResponse)
    raw_response.json = AsyncMock(return_value=content)
    upstream.return_value = content if parsed else raw_response
    result = await service.req_ase_ability_image_generate_service(
        service.ImageGenerate(prompt="A green tree", width=640, height=360),
        Request({"type": "http", "state": {"sid": "test-run"}}),
    )
    assert upstream.call_args.kwargs["json"]["parameter"]["chat"] == {
        "domain": "general",
        "width": 640,
        "height": 360,
    }
    upload.assert_awaited_once()
    assert upload.await_args.args[1] == b"image"
    assert result.data == {
        "image_url": "https://storage.example/image.jpg",
        "image_url_md": "![](https://storage.example/image.jpg)",
    }
    if not parsed:
        raw_response.json.assert_awaited_once_with(content_type=None)


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (
            {
                "header": {
                    "code": 10907,
                    "message": "AppIdNoEnoughLicenceError: vendor diagnostic tti",
                }
            },
            45003,
        ),
        ({"header": {"code": 0}}, 45002),
        ({"header": {"code": 0}, "payload": {"choices": {"text": []}}}, 45002),
        ({"payload": {}}, 45002),
    ],
)
async def test_does_not_upload_failed_or_invalid_vendor_response(
    vendor: tuple[Mock, AsyncMock], content: dict, code: int
) -> None:
    upstream, upload = vendor
    upstream.return_value = content
    with pytest.raises(ServiceException) as error:
        await service.req_ase_ability_image_generate_service(
            service.ImageGenerate(prompt="A green tree"),
            Request({"type": "http", "state": {"sid": "test-run"}}),
        )
    assert error.value.code == code
    assert "vendor diagnostic" not in error.value.message
    upload.assert_not_awaited()
