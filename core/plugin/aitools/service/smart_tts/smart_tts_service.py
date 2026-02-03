"""
Smart TTS Service
"""

# pylint: disable=too-many-locals, unused-argument, wrong-import-order
import base64
import json
import os
import uuid
from typing import Any, Dict, Optional

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.clients.websockets_client import WebSocketClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.utils.oss_utils import upload_file
from pydantic import BaseModel


class SmartTTSInput(BaseModel):
    """Smart TTS Input"""

    text: str
    vcn: str
    speed: int = 50  # Optional, default value is 50


def gen_data(app_id: str | None, text: str, vcn: str, speed: int) -> Dict[str, Any]:
    """Generate data for Smart TTS"""
    return {
        "header": {"app_id": app_id, "status": 2},
        "parameter": {
            "tts": {
                "vcn": vcn,
                "volume": 50,
                "rhy": 0,
                "speed": speed,
                "pitch": 50,
                "bgs": 0,
                "reg": 0,
                "rdn": 0,
                "audio": {
                    "encoding": "lame",
                    "sample_rate": 24000,
                    "channels": 1,
                    "bit_depth": 16,
                    "frame_size": 0,
                },
            }
        },
        "payload": {
            "text": {
                "encoding": "utf8",
                "compress": "raw",
                "format": "plain",
                "status": 2,
                "seq": 0,
                "text": str(base64.b64encode(text.encode("utf-8")), "UTF8"),
            }
        },
    }


@api_service(
    method="POST",
    path="/aitools/v1/smarttts",
    query=None,
    body=SmartTTSInput,
    response=BaseResponse,
    summary="Smart TTS",
    description="Convert text to speech",
    tags="public_cn",
    deprecated=False,
)
async def smart_tts_service(
    body: SmartTTSInput,
    request: Request,
    span: Optional[SpanLike] = None,
    meter: Optional[Meter] = None,
    node_trace: Optional[NodeTraceLog] = None,
) -> BaseResponse:
    """Smart TTS Service"""
    if not body.text:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceParamsError, extra_message="text不能为空"
        )

    url = os.getenv("TTS_URL", "")
    app_id = os.getenv("AI_APP_ID", "")
    api_key = os.getenv("AI_API_KEY", "")
    api_secret = os.getenv("AI_API_SECRET", "")
    data = gen_data(app_id, body.text, body.vcn, body.speed)

    audio_data = bytearray()
    async with WebSocketClient(
        url=url,
        span=span,
        auth="ASE",
        app_id=app_id,
        api_key=api_key,
        api_secret=api_secret,
    ).start() as client:
        await client.send(json.dumps(data))

        async for msg in client.recv():
            message_dict = json.loads(msg)
            code = message_dict.get("header", {}).get("code", 0)
            message = message_dict.get("header", {}).get("message", "")

            if code != 0:
                raise ServiceException.from_error_code(
                    CodeEnums.ServiceResponseError, extra_message=message
                )

            if "payload" in message_dict:
                audio = base64.b64decode(message_dict["payload"]["audio"]["audio"])
                status = message_dict["payload"]["audio"]["status"]

                if status == 2:
                    break

                audio_data.extend(audio)

    if not audio_data:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceResponseError, extra_message="音频数据为空"
        )

    voice_url = await upload_file(str(uuid.uuid4()) + ".MP3", audio_data, span)

    return SuccessResponse(data={"voice_url": voice_url}, sid=request.state.sid)
