"""
Custum exception module and global exception handling for AiTools.

This module provides custom exception classes for AiTools and a global
exception handler that logs and handles exceptions.
"""

from typing import Optional

from plugin.aitools.api.schemas.types import ErrorResponse
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums


class ServiceException(Exception):
    """Custom API exception"""

    default_code: int = CodeEnums.ServiceInernalError.code
    default_message: str = CodeEnums.ServiceInernalError.message

    def __init__(
        self,
        code: int = 500,
        message: str = "Internal server error",
        sid: Optional[str] = None,
    ):
        self.code = code if code is not None else self.default_code
        self.message = message if message is not None else self.default_message
        self.sid = sid
        super().__init__(self.message)

    @classmethod
    def from_error_code(
        cls,
        error_code: CodeEnums,
        sid: Optional[str] = None,
        extra_message: Optional[str] = None,
    ) -> "ServiceException":
        """Create APIException from error code"""
        return cls(
            code=error_code.code,
            message=f"{error_code.message}: {extra_message}",
            sid=sid,
        )

    def convert_to_response(self) -> ErrorResponse:
        """Convert exception to error response"""
        return ErrorResponse(
            code=self.code,
            message=self.message,
        )


class HTTPClientException(ServiceException):
    """HTTP client exception"""

    default_code: int = CodeEnums.HTTPClientError.code
    default_message: str = CodeEnums.HTTPClientError.message


class WebSocketClientException(ServiceException):
    """WebSocket client exception"""

    default_code: int = CodeEnums.WebSocketClientError.code
    default_message: str = CodeEnums.WebSocketClientError.message
