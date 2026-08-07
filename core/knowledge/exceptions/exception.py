# -*- coding: utf-8 -*-
"""
Custom exception module.

This module defines various custom exception classes used in the project, including:
- BaseCustomException: Base class for custom exceptions
- ProtocolParamException: Protocol parameter exception
- ServiceException: Service exception
- ThirdPartyException: Third-party service exception
- CustomException: General custom exception
"""

from typing import Optional

from knowledge.consts.error_code import CodeEnum


class BaseCustomException(Exception):
    """
    Base class for custom exceptions that encapsulates common exception behaviors and properties.
    All specific custom exceptions should inherit from this base class.
    """

    code: int
    message: str

    def __init__(self, code_enum: CodeEnum, detail_msg: Optional[str] = None):
        """
        Initialize base exception

        Args:
            code_enum: Error code enum value containing code and msg attributes
            detail_msg: Detailed error message to supplement the default message.
                       If None or empty string, only the default message is used.
        """
        self.code = code_enum.code
        base_message = code_enum.msg
        if detail_msg:
            self.message = f"{base_message}({detail_msg})"
        else:
            self.message = base_message
        super().__init__(self.message)

    def __str__(self) -> str:
        """Return string representation of the exception in 'code: message' format."""
        return f"{self.code}: {self.message}"

    def get_response(self) -> dict:
        """Get error information dictionary for API response."""
        return {"code": self.code, "message": self.message}


class ProtocolParamException(BaseCustomException):
    """Protocol parameter exception"""

    def __init__(self, msg: Optional[str] = None):
        super().__init__(CodeEnum.ParameterCheckException, msg)


class ServiceException(BaseCustomException):
    """Service exception"""

    def __init__(self, msg: Optional[str] = None):
        super().__init__(CodeEnum.ServiceException, msg)


class ThirdPartyException(BaseCustomException):
    """Third-party service exception"""

    def __init__(self, msg: Optional[str] = None, e: Optional[CodeEnum] = None):
        """
        Initialize third-party service exception

        Args:
            msg: Detailed error message.
            e: Specify error code enum. If None, use CodeEnum.ThirdPartyServiceFailed.
        """
        target_enum = e if e is not None else CodeEnum.ThirdPartyServiceFailed
        super().__init__(target_enum, msg)


class CustomException(BaseCustomException):
    """General custom exception"""

    def __init__(self, e: CodeEnum, msg: Optional[str] = None):
        super().__init__(e, msg)
