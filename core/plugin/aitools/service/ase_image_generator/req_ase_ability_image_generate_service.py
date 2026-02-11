"""
ASE Image Generator Service
"""

import base64
import json
import os
import uuid
from typing import Any, Dict, Optional, Tuple

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from common.utils.hmac_auth import HMACAuth
from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.clients.aiohttp_client import HttpClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
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
                "width": height,
                "height": width,
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
    url = os.getenv("IMAGE_GENERATE_URL", "")
    app_id = os.getenv("AI_APP_ID", "")
    api_key = os.getenv("AI_API_KEY", "")
    api_secret = os.getenv("AI_API_SECRET", "")

    data, params = gen_params(
        body.prompt, body.width, body.height, url, app_id, api_key, api_secret
    )

    async with HttpClient(
        method="POST",
        url=url,
        span=span,
        params=params,
        json=data,
    ).start() as client:
        async with client.request() as response:
            content = json.loads(await response.data.get("content", "").text())  # type: ignore[union-attr]

    header = content.get("header", {})
    code = header.get("code", 0)
    message = header.get("message", "")

    if code != 0:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message=message
        )

    payload = content.get("payload", {})
    text = payload.get("choices", {}).get("text", [{}])[0].get("content", "")

    image_url = await upload_file(
        str(uuid.uuid4()) + ".jpg", base64.b64decode(text), span
    )

    return SuccessResponse(
        data={"image_url": image_url, "image_url_md": f"![]({image_url})"},
        sid=request.state.sid,
    )
