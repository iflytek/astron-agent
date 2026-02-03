"""
API data type definitions module containing request and response data structures.
"""

from typing import Any, Optional

from pydantic import BaseModel


class BaseResponse(BaseModel):
    """Base response wrapper for API endpoints

    This class is a wrapper for API responses that provides a consistent
    response format across all API endpoints. Its primary purpose is to
    provide a common interface for all API responses with:
    - Standardized response code and message
    - Optional data payload
    - Optional session ID

    The minimal interface is by design - it only needs initialization
    to create properly formatted responses.
    """

    code: int
    message: str
    data: Optional[Any] = None
    sid: Optional[str] = None


class SuccessResponse(BaseResponse):
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


class ErrorResponse(BaseResponse):
    """Standard error response wrapper for API endpoints using error enums.

    This class intentionally has few public methods as it serves as a simple
    error response formatter. Its specific purpose is to:
    - Convert error enum objects to standardized response format
    - Provide consistent error code and message structure
    - Support optional session ID and custom message enhancement

    The minimal interface is appropriate as error responses only need
    initialization to format error enums into proper API responses.
    """

    @classmethod
    def from_enum(
        cls,
        code_enum: Any,
        *,
        sid: Optional[str] = None,
        extra_message: Optional[str] = None,
    ) -> "ErrorResponse":
        base_message = code_enum.message
        message = f"{base_message} ({extra_message})" if extra_message else base_message
        return cls(code=code_enum.code, message=message, sid=sid)

    @classmethod
    def from_code(
        cls,
        *,
        code: int,
        message: str,
        sid: Optional[str] = None,
    ) -> "ErrorResponse":
        return cls(code=code, message=message, sid=sid)
