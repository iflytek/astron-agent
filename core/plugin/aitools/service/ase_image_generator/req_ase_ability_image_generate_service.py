"""
ASE Image Generator Service
"""

import base64
import os
import uuid
from typing import Any, Dict, Optional, Tuple

from aiohttp import ClientResponse
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from common.utils.hmac_auth import HMACAuth
from fastapi import Request
from loguru import logger
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.clients.aiohttp_client import HttpClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.const.const import IMAGE_GENERATE_URL_KEY
from plugin.aitools.platform_account_config import get_iflytek_open_platform_credentials
from plugin.aitools.utils.oss_utils import upload_file
from pydantic import BaseModel

IMAGE_GENERATE_MAX_PROMPT_LEN = 510


class ImageGenerate(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024


def gen_params(
    prompt: str,
    width: int,
    height: int,
    url: str,
    app_id: str,
    api_key: str,
    api_secret: str,
) -> Tuple[Dict[str, Any], Dict[str, str]]:
    params = HMACAuth.build_auth_params(url, "POST", api_key, api_secret)  # type: ignore[arg-type]
    body = {
        "header": {
            "app_id": app_id,
        },
        "parameter": {
            "chat": {
                "domain": "general",
                "width": width,
                "height": height,
            }
        },
        "payload": {
            "message": {
                "text": [
                    {
                        "role": "user",
                        # The max length of prompt is 510, so we only take the first 510 characters.
                        "content": prompt[:IMAGE_GENERATE_MAX_PROMPT_LEN],
                    }
                ]
            }
        },
    }

    return body, params


@api_service(
    method="POST",
    path="/aitools/v1/image_generate",
    body=ImageGenerate,
    response=BaseResponse,
    summary="ASE image generate",
    description="ASE image generate",
    tags=["public_cn"],
)
async def req_ase_ability_image_generate_service(
    body: ImageGenerate,
    request: Request,
    span: Optional[SpanLike] = None,
    meter: Optional[Meter] = None,
    node_trace: Optional[NodeTraceLog] = None,
) -> BaseResponse:
    url = os.getenv(IMAGE_GENERATE_URL_KEY, "")
    credentials = get_iflytek_open_platform_credentials()

    data, params = gen_params(
        body.prompt,
        body.width,
        body.height,
        url,
        credentials.app_id,
        credentials.api_key,
        credentials.api_secret,
    )

    async with HttpClient(
        method="POST",
        url=url,
        span=span,
        params=params,
        json=data,
    ).start() as client:
        async with client.request() as response:
            content = (response.data or {}).get("content")
            if isinstance(content, ClientResponse):
                # The vendor also sends JSON with a non-JSON Content-Type.
                try:
                    content = await content.json(content_type=None)
                except ValueError:
                    content = None

    header = content.get("header") if isinstance(content, dict) else None
    if not isinstance(header, dict) or type(header.get("code")) is not int:
        logger.warning("iFLYTEK text-to-image returned an invalid response")
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message="讯飞文生图响应格式无效"
        )

    code = header["code"]
    if code != 0:
        logger.warning("iFLYTEK text-to-image request failed, vendor code={}", code)
        message = header.get("message")
        if isinstance(message, str) and "AppIdNoEnoughLicenceError" in message:
            error = CodeEnums.ImageGenerateLicenseError
            raise ServiceException(code=error.code, message=error.message)
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message=f"讯飞文生图返回错误码 {code}"
        )

    try:
        text = content["payload"]["choices"]["text"][0]["content"]
        image = base64.b64decode(text, validate=True)
        if not image:
            raise ValueError
    except (KeyError, IndexError, TypeError, ValueError):
        logger.warning("iFLYTEK text-to-image response contained no valid image")
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message="讯飞文生图未返回有效图片"
        ) from None

    image_url = await upload_file(str(uuid.uuid4()) + ".jpg", image, span)

    return SuccessResponse(
        data={"image_url": image_url, "image_url_md": f"![]({image_url})"},
        sid=request.state.sid,
    )
