"""
Translation service
"""

import os
from enum import Enum

from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.exceptions.error.code_enums import BaseCodeEnum
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.service.translation.translation_client import (
    CHINESE_LANGUAGE_CODE,
    VALID_LANGUAGE_CODES,
    TranslationClient,
    is_valid_language_pair,
)
from pydantic import BaseModel, field_validator, model_validator


class TranslationCodeEnums(BaseCodeEnum, Enum):
    """Translation error codes"""

    TRANSLATION_EMPTY_ERROR = (45250, "翻译文本不能为空")
    TRANSLATION_TOO_LONG_ERROR = (45251, "翻译文本超过5000字符限制")
    TRANSLATION_LANG_ERROR = (45252, "不支持的语言组合")
    TRANSLATION_API_ERROR = (45253, "翻译API调用失败")
    TRANSLATION_RESPONSE_ERROR = (45254, "翻译API返回数据格式错误")
    TRANSLATION_AUTH_ERROR = (45255, "翻译服务认证失败")
    TRANSLATION_NETWORK_ERROR = (45256, "翻译服务网络连接失败")


class TranslationInput(BaseModel):
    """Translation input"""

    text: str  # Original text to be translated
    target_language: str  # Target language code
    source_language: str = (
        CHINESE_LANGUAGE_CODE  # Source language code, default Chinese
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        """validate text"""
        if not value or not value.strip():
            raise ValueError("Translation text cannot be empty")
        if len(value) > 5000:
            raise ValueError("Translation text cannot exceed 5000 characters")
        return value

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, value: str) -> str:
        """validate target language"""
        if value not in VALID_LANGUAGE_CODES:
            raise ValueError(
                f"Invalid target language: {value}.\n"
                f"Valid options: {list(VALID_LANGUAGE_CODES)}"
            )
        return value

    @field_validator("source_language")
    @classmethod
    def validate_source_language(cls, value: str) -> str:
        """validate source language"""
        if value not in VALID_LANGUAGE_CODES:
            raise ValueError(
                f"Invalid source language: {value}.\n"
                f"Valid options: {list(VALID_LANGUAGE_CODES)}"
            )
        return value

    @model_validator(mode="after")
    def validate_language_combination(self) -> "TranslationInput":
        """Validate that at least one language is Chinese (cn)"""
        if not is_valid_language_pair(self.source_language, self.target_language):
            raise ValueError(
                "API requires Chinese (cn) as either source or target language. "
                f"Current combination: {self.source_language} → {self.target_language} "
                "is not supported."
            )
        return self


@api_service(
    method="POST",
    path="/aitools/v1/translation",
    query=None,
    body=TranslationInput,
    response=BaseResponse,
    summary="Translate text from Chinese (cn) to other languages",
    description="Translate text from Chinese (cn) to other languages",
    tags="public_cn",
    deprecated=True,
)
async def translation_service(body: TranslationInput, request: Request) -> BaseResponse:
    """translation service"""
    app_id = os.getenv("AI_APP_ID", "")
    app_key = os.getenv("AI_API_KEY", "")
    app_secret = os.getenv("AI_API_SECRET", "")

    translation_client = TranslationClient(app_id, app_key, app_secret)
    success, message, result = translation_client.translate(
        text=body.text,
        target_language=body.target_language,
        source_language=body.source_language,
    )

    if success:
        return SuccessResponse(
            code=0, message="success", data=result, sid=request.state.sid
        )
    # Map error messages to appropriate error codes
    error_code = TranslationCodeEnums.TRANSLATION_API_ERROR
    error_code_mapping = {
        "翻译文本不能为空": TranslationCodeEnums.TRANSLATION_EMPTY_ERROR,
        "翻译文本超过5000字符限制": TranslationCodeEnums.TRANSLATION_TOO_LONG_ERROR,
        "不支持的语言组合": TranslationCodeEnums.TRANSLATION_LANG_ERROR,
        "API请求失败": TranslationCodeEnums.TRANSLATION_API_ERROR,
        "API返回数据格式错误": TranslationCodeEnums.TRANSLATION_RESPONSE_ERROR,
    }
    matched_key = next((key for key in error_code_mapping if key in message), None)

    error_code = (
        error_code_mapping[matched_key]
        if matched_key
        else TranslationCodeEnums.TRANSLATION_API_ERROR
    )

    raise ServiceException.from_error_code(error_code)  # type: ignore[arg-type]
