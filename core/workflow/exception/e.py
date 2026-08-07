"""
Custom exception classes for the workflow system.

This module provides a comprehensive set of custom exception classes that extend the
standard Python Exception class with additional error code and message handling
capabilities. These exceptions are designed to provide consistent error handling
across the entire workflow system with proper error categorization and detailed
error information.

The exception hierarchy includes:
- CustomException: Base exception with error code and message support
- CustomExceptionCM: Manual error code handling for specific scenarios
- CustomExceptionInterrupt: Specialized exception for workflow interruptions
- CustomExceptionCD: Simplified exception with minimal string representation

All exceptions support detailed error tracking, cause error preservation, and
integration with the workflow's logging and tracing systems.
"""

import traceback
from typing import Optional

from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog


class CustomException(Exception):
    """
    Custom exception class with error code and message support.

    This exception class extends the standard Python Exception with additional
    error code tracking and detailed error message formatting capabilities.
    It provides a standardized way to handle errors throughout the workflow
    system with consistent error codes, messages, and cause tracking.

    Attributes:
        code: Integer error code for programmatic error identification
        message: Human-readable error message for user feedback
        cause_error: Root cause of the exception (string or Exception object)
        node_log: Detailed node execution log information (internal use)
    """

    code: int
    message: str
    cause_error: str | Exception | None

    def __init__(
        self,
        err_code: CodeEnum,
        err_msg: str = "",
        cause_error: Optional[str | Exception] = None,
        node_log: Optional[NodeLog] = None,
    ):
        """
        Initialize a custom exception with error code and message.

        :param err_code: Error code enum containing code and message
        :param err_msg: Additional error message, if empty uses error code message
        :param cause_error: Root cause of the exception (string or Exception)
        :param node_log: Detailed node log information (internal use only)
        """
        self.node_log = node_log
        self.code = err_code.code
        self.message = err_code.msg if not err_msg else f"{err_code.msg}({err_msg})"
        self.cause_error = cause_error

    def __str__(self) -> str:
        """
        Return string representation of the exception.

        :return: Formatted error string with code, message, and cause if available
        """
        if self.cause_error is not None:
            if isinstance(self.cause_error, Exception):
                cause_error_str = "".join(
                    traceback.format_exception(
                        type(self.cause_error),
                        self.cause_error,
                        self.cause_error.__traceback__,
                    )
                )
            else:
                cause_error_str = self.cause_error
            return f"{self.code}: {self.message}({cause_error_str})"
        return f"{self.code}: {self.message}"


class CustomExceptionCM(CustomException):
    """
    Custom exception class with manual error code handling.

    This exception class allows manual specification of error codes instead of
    using the CodeEnum system. It provides flexibility for scenarios where
    error codes need to be specified directly as integers rather than through
    the predefined enumeration system.

    This is particularly useful for:
    - Dynamic error code generation
    - Integration with external systems that use different error code formats
    - Legacy system compatibility
    - Custom error scenarios not covered by the standard CodeEnum
    """

    def __init__(
        self,
        err_code: int,
        err_msg: str = "",
        cause_error: str = "",
        node_log: Optional[NodeLog] = None,
    ):
        """
        Initialize a custom exception with manual error code.

        :param err_code: Manual error code (integer)
        :param err_msg: Error message
        :param cause_error: Root cause of the exception (string)
        :param node_log: Detailed node log information (internal use only)
        """
        self.node_log = node_log
        self.code = err_code
        self.message = err_msg
        self.cause_error = cause_error


class CustomExceptionInterrupt(CustomExceptionCM):
    """
    Custom exception for interrupt scenarios.

    This exception is used when workflow execution needs to be interrupted.
    It provides a specialized exception type for handling workflow interruption
    scenarios, allowing the system to distinguish between regular errors and
    intentional workflow interruptions.

    Common use cases include:
    - User-initiated workflow cancellation
    - System-level workflow suspension
    - Timeout-based workflow termination
    - Resource constraint-based workflow interruption
    """

    pass


class CustomExceptionCD(CustomExceptionCM):
    """
    Custom exception with simplified string representation.

    This exception class provides a simplified string representation that only
    shows the error message without the error code. It is designed for scenarios
    where a clean, user-friendly error message is preferred over the detailed
    error code format.

    This is particularly useful for:
    - User-facing error messages that should be clean and simple
    - Logging scenarios where error codes are handled separately
    - Integration with systems that expect simple error messages
    - Display in user interfaces where technical error codes are not appropriate
    """

    def __str__(self) -> str:
        """
        Return simplified string representation of the exception.

        :return: Error message only, without error code
        """
        return f"{self.message}"
