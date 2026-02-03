"""
Exception handlers for the workflow system.

This module provides FastAPI-compatible exception handlers for various types
of errors that can occur during request processing. It ensures consistent
error response formatting across different endpoints and handles both
standard JSON responses and Server-Sent Events (SSE) for real-time communication
scenarios.

Key Features:
- Request validation error handling with detailed error formatting
- Support for both JSON and SSE response formats
- Integration with the workflow's tracing and logging systems
- Consistent error code and message formatting across all endpoints
- Automatic error categorization and user-friendly error messages

The handlers are designed to provide clear, actionable error information to clients
while maintaining security by not exposing internal system details.
"""

from fastapi import Request, Response
from fastapi.exceptions import RequestValidationError

from workflow.extensions.fastapi.base import JSONResponseBase
from workflow.extensions.otlp.trace.span import Span
from workflow.utils.validation import ValidationParse


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> Response:
    """
    Handle request validation errors with appropriate response formatting.

    This handler processes FastAPI RequestValidationError exceptions and returns
    appropriate error responses based on the request path. It automatically
    determines the response format based on the endpoint type:
    - Chat endpoints receive SSE-formatted responses for real-time communication
    - Other endpoints receive standard JSON responses

    The handler formats validation errors into human-readable messages that include:
    - Parameter location in the request structure
    - The actual input value that caused the error
    - The specific validation error message and type

    All errors are logged with the tracing system for debugging and monitoring purposes.

    :param request: The FastAPI request object containing path and other request details
    :param exc: The RequestValidationError exception containing validation error details
    :return: Formatted error response
             (JSON for standard endpoints, SSE for chat endpoints)
    """
    span = Span()
    with span.start() as span_ctx:
        # Format validation errors into human-readable
        # messages with detailed information
        error_message = ValidationParse.validation_error(exc)
        # Log validation errors to the tracing system for monitoring and debugging
        span_ctx.add_error_events(attributes={"errors": error_message})

        return JSONResponseBase.generate_error_response(
            request.url.path, error_message, span_ctx.sid
        )
