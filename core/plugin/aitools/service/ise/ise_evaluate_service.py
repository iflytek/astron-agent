"""
ISE Service
"""

import base64
import os
from enum import Enum

from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.exceptions.error.code_enums import BaseCodeEnum
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.service.ise.ise_client import ISEClient
from pydantic import BaseModel, field_validator


class ISECodeEnums(BaseCodeEnum, Enum):
    """ISE Error Code Enums"""

    ISE_EVALUATION_FAILED = (460001, "ISE 评测失败")


class ISEInput(BaseModel):
    """ISE Input"""

    audio_data: str  # Base64 encoded audio data
    text: str = ""  # Optional text to be evaluated
    language: str = "cn"  # Language type: cn(Chinese)/en(English)
    category: str = (
        "read_sentence"  # Evaluation type: read_syllable/read_word/read_sentence
    )
    group: str = (
        "adult"  # Age group: pupil(Kindergarten)/youth(Elementary)/adult(Adult)
    )

    @field_validator("group")
    @classmethod
    def validate_group(cls, value: str) -> str:
        """Validate group"""
        valid_groups = ["pupil", "youth", "adult"]
        if value not in valid_groups:
            raise ValueError(f"Invalid group: {value}. Valid options: {valid_groups}")
        return value

    @field_validator("audio_data")
    @classmethod
    def validate_audio_data(cls, value: str) -> str:
        """Validate audio_data"""
        if not value:
            raise ValueError("audio_data cannot be empty")
        try:
            base64.b64decode(value)
        except Exception as exc:
            raise ValueError("audio_data must be valid base64 encoded string") from exc
        return value


@api_service(
    method="POST",
    path="/aitools/v1/ise",
    query=None,
    body=ISEInput,
    response=BaseResponse,
    summary="ISE Evaluation",
    description="ISE Evaluation",
    tags="public_cn",
    deprecated=True,
)
async def ise_evaluate_service(body: ISEInput, request: Request) -> BaseResponse:
    """ISE Evaluation Service"""
    app_id = os.getenv("AI_APP_ID", "")
    app_key = os.getenv("AI_API_KEY", "")
    app_secret = os.getenv("AI_API_SECRET", "")

    audio_bytes = base64.b64decode(body.audio_data)
    ise_client = ISEClient(app_id, app_key, app_secret)
    success, message, result = await ise_client.evaluate_audio(
        audio_data=audio_bytes,
        text=body.text,
        language=body.language,
        category=body.category,
        group=body.group,
    )

    if success:
        data = {k: v for k, v in result.items() if k != "raw_xml"}
        return SuccessResponse(data=data, sid=request.state.sid)

    raise ServiceException(
        message=ISECodeEnums.ISE_EVALUATION_FAILED.message + ": " + message,
        code=ISECodeEnums.ISE_EVALUATION_FAILED.code,
    )
