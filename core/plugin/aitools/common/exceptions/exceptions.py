"""
Custum exception module and global exception handling for AiTools.

This module provides custom exception classes for AiTools and a global
exception handler that logs and handles exceptions.
"""

from typing import Optional

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from plugin.aitools.api.schemas.types import ErrorResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.utils.otlp_utils import update_span, upload_trace
from starlette import status as http_status


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


async def service_exception_handler(
    request: Request, exc: BaseException
) -> JSONResponse:
    """Handle API exceptions and log them with tracing"""
    assert isinstance(exc, ServiceException)
    span: Optional[SpanLike] = (
        request.state.span if hasattr(request.state, "span") else None
    )
    node_trace: Optional[NodeTraceLog] = (
        request.state.node_trace if hasattr(request.state, "node_trace") else None
    )
    meter: Optional[Meter] = (
        request.state.meter if hasattr(request.state, "meter") else None
    )

    content = exc.convert_to_response()
    if not content.sid:
        content.sid = request.state.sid if hasattr(request.state, "sid") else None

    update_span(content, span)
    upload_trace(content, meter, node_trace)

    return JSONResponse(
        status_code=http_status.HTTP_200_OK,
        content=content.model_dump(),
    )


async def http_exception_handler(request: Request, exc: BaseException) -> JSONResponse:
    """Handle HTTP client exceptions and log them with tracing"""
    assert isinstance(exc, HTTPException)
    span: Optional[SpanLike] = (
        request.state.span if hasattr(request.state, "span") else None
    )
    node_trace: Optional[NodeTraceLog] = (
        request.state.node_trace if hasattr(request.state, "node_trace") else None
    )
    meter: Optional[Meter] = (
        request.state.meter if hasattr(request.state, "meter") else None
    )

    if span:
        span.set_attribute("error.code", exc.status_code)
        span.record_exception(exc)

    content = ErrorResponse(
        code=exc.status_code,
        message=exc.detail,
        sid=request.state.sid if hasattr(request.state, "sid") else None,
    )

    upload_trace(content, meter, node_trace)

    return JSONResponse(
        status_code=http_status.HTTP_200_OK,
        content=content.model_dump(),
    )


async def generic_exception_handler(
    request: Request, exc: BaseException
) -> JSONResponse:
    """Handle generic exceptions and log them with tracing"""
    span: Optional[SpanLike] = (
        request.state.span if hasattr(request.state, "span") else None
    )
    node_trace: Optional[NodeTraceLog] = (
        request.state.node_trace if hasattr(request.state, "node_trace") else None
    )
    meter: Optional[Meter] = (
        request.state.meter if hasattr(request.state, "meter") else None
    )

    content = ErrorResponse.from_enum(
        CodeEnums.ServiceInernalError, sid=request.state.sid, extra_message=str(exc)
    )

    if span:
        span.set_attribute("error.code", content.code)
        span.record_exception(exc)  # type: ignore[arg-type]

    upload_trace(content, meter, node_trace)

    return JSONResponse(
        status_code=http_status.HTTP_200_OK,
        content=content.model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers for API and HTTP client exceptions"""
    app.add_exception_handler(ServiceException, service_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
