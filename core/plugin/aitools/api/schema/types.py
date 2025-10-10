"""
API data type definitions module containing request and response data structures.
"""

import base64
import re

from typing import Any, Optional

from fastapi import HTTPException
from plugin.aitools.const.translation_constants import (
    CHINESE_LANGUAGE_CODE,
    VALID_LANGUAGE_CODES,
    is_valid_language_pair,
)
from plugin.aitools.service.ase_sdk.util.pdf_convert import DOCUMENT_PAGE_UNLIMITED
from pydantic import BaseModel, field_validator, model_validator, validator


class GenText2Img(BaseModel):
    content: str
    width: int = 1024
    height: int = 1024


class SuccessDataResponse(BaseModel):
    """Standard success response wrapper for API endpoints.

    This class has intentionally few public methods as it serves as a simple
    data container for successful API responses. Its primary purpose is to
    provide a consistent response format across all API endpoints with:
    - Standardized success code (0)
    - Response data payload
    - Optional message and session ID

    The minimal interface is by design - it only needs initialization
    to create properly formatted success responses.
    """

    code: int = 0
    message: str = "success"
    data: Any
    sid: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response wrapper for API endpoints using error enums.

    This class intentionally has few public methods as it serves as a simple
    error response formatter. Its specific purpose is to:
    - Convert error enum objects to standardized response format
    - Provide consistent error code and message structure
    - Support optional session ID and custom message enhancement

    The minimal interface is appropriate as error responses only need
    initialization to format error enums into proper API responses.
    """

    code: int
    message: str
    sid: Optional[str] = None

    @classmethod
    def from_enum(
        cls, code_enum: Any, sid: Optional[str] = None, message: Optional[str] = None
    ) -> "ErrorResponse":
        base_message = code_enum.msg
        if message:
            final_message = f"{base_message}({message})"
        else:
            final_message = base_message
        return cls(code=code_enum.code, message=final_message, sid=sid)


class ErrorCResponse(BaseModel):
    """Custom error response wrapper for API endpoints with direct error codes.

    This class has intentionally few public methods as it serves as a simple
    error response container for cases where error codes are provided directly
    rather than through error enums. Its purpose is to:
    - Handle raw error codes and messages
    - Provide consistent error response structure
    - Support optional session ID tracking

    The minimal interface is by design - it only requires initialization
    to create properly formatted custom error responses.
    """

    code: int
    message: Optional[str] = None
    sid: Optional[str] = None


class OCRLLM(BaseModel):
    file_url: str
    page_start: int = DOCUMENT_PAGE_UNLIMITED
    page_end: int = DOCUMENT_PAGE_UNLIMITED


class ImageGenerate(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024


class TTSInput(BaseModel):
    text: str
    vcn: str
    # speed: Optional[int] = None  # 可选的整数参数，默认值为 None
    speed: int = 50  # 可选的整数参数，默认值为 50


class SmartTTSInput(BaseModel):
    text: str
    vcn: str
    # speed: Optional[int] = None  # 可选的整数参数，默认值为 None
    speed: int = 50  # 可选的整数参数，默认值为 50


class ImageUnderstandingInput(BaseModel):
    question: str
    image_url: str


# 自定义验证器
def validate_english(value: str) -> str:
    if not re.match(r"^[a-zA-Z0-9\s]*$", value):
        raise HTTPException(status_code=422, detail="search_query参数不支持中文检索")
    return value


class ArXivInput(BaseModel):
    search_query: str

    @validator("search_query")
    @classmethod
    def check_english(cls, v: str) -> str:
        return validate_english(v)


class TTIInput(BaseModel):
    description: str


class ISEInput(BaseModel):
    audio_data: str  # Base64编码的音频数据
    text: str = ""  # 评测文本（可选）
    language: str = "cn"  # 语言类型: cn(中文)/en(英文)
    category: str = "read_sentence"  # 评测类型: read_syllable/read_word/read_sentence等
    group: str = "adult"  # 年龄组: pupil(小学)/youth(中学)/adult(成人)

    @field_validator("group")
    @classmethod
    def validate_group(cls, value: str) -> str:
        valid_groups = ["pupil", "youth", "adult"]
        if value not in valid_groups:
            raise ValueError(f"Invalid group: {value}. Valid options: {valid_groups}")
        return value

    @field_validator("audio_data")
    @classmethod
    def validate_audio_data(cls, value: str) -> str:
        if not value:
            raise ValueError("audio_data cannot be empty")
        try:
            base64.b64decode(value)
        except Exception as exc:
            raise ValueError("audio_data must be valid base64 encoded string") from exc
        return value


class TranslationInput(BaseModel):
    text: str  # 待翻译文本
    target_language: str  # 目标语言代码
    source_language: str = CHINESE_LANGUAGE_CODE  # 源语言代码，默认中文

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Translation text cannot be empty")
        if len(value) > 5000:
            raise ValueError("Translation text cannot exceed 5000 characters")
        return value

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, value: str) -> str:
        if value not in VALID_LANGUAGE_CODES:
            raise ValueError(
                f"Invalid target language: {value}.\n"
                f"Valid options: {list(VALID_LANGUAGE_CODES)}"
            )
        return value

    @field_validator("source_language")
    @classmethod
    def validate_source_language(cls, value: str) -> str:
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
