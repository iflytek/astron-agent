"""
Image Understanding Service
"""

import base64
import json
import os
from typing import Any, Dict, Optional

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.clients.aiohttp_client import HttpClient
from plugin.aitools.common.clients.websockets_client import WebSocketClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
from pydantic import BaseModel


class ImageUnderstandingRequest(BaseModel):
    question: str
    image_url: str


async def gen_params(
    app_id: str | None, question: str, image_url: str, span: Optional[SpanLike]
) -> Dict[str, Any]:
    async with HttpClient("GET", image_url, span).start() as client:
        async with client.request() as response:
            imagedata = base64.b64encode(await response.data["content"].read()).decode(  # type: ignore[index]
                "utf-8"
            )
        return {
            "header": {"app_id": app_id},
            "parameter": {
                "chat": {
                    "domain": "imagev3",
                    "temperature": 0.5,
                    "top_k": 4,
                    "max_tokens": 8192,
                    "auditing": "default",
                }
            },
            "payload": {
                "message": {
                    "text": [
                        {"role": "user", "content": imagedata, "content_type": "image"},
                        {"role": "user", "content": question},
                    ]
                }
            },
        }


@api_service(
    method="POST",
    path="/aitools/v1/image_understanding",
    body=ImageUnderstandingRequest,
    response=BaseResponse,
    summary="Image Understanding",
    description="Image Understanding",
    tags=["public_cn"],
    deprecated=False,
)
async def image_understanding_service(
    body: ImageUnderstandingRequest,
    request: Request,
    span: Optional[SpanLike] = None,
    meter: Optional[Meter] = None,
    node_trace: Optional[NodeTraceLog] = None,
) -> BaseResponse:
    imageunderstanding_url = os.getenv("IMAGE_UNDERSTANDING_URL", "")

    params = await gen_params(
        app_id=os.getenv("AI_APP_ID"),
        question=body.question,
        image_url=body.image_url,
        span=span,
    )

    async with WebSocketClient(
        url=imageunderstanding_url,
        span=span,
        auth="ASE",
        api_key=os.getenv("AI_API_KEY"),
        api_secret=os.getenv("AI_API_SECRET"),
    ).start() as client:

        await client.send(params)

        answer = ""
        async for msg in client.recv():
            data = json.loads(msg)
            code = data["header"]["code"]
            message = data["header"]["message"]

            if code != 0:
                raise ServiceException.from_error_code(
                    CodeEnums.ServiceResponseError, extra_message=message
                )
            else:
                choices = data["payload"]["choices"]
                status = choices["status"]
                content = choices["text"][0]["content"]
                answer += content
                if status == 2:
                    break

    if not answer:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message="返回结果为空"
        )
    return SuccessResponse(data={"content": answer}, sid=request.state.sid)
