from typing import Any, Mapping

from common.otlp.trace.langfuse import (
    WORKFLOW_TRACE_AUDIENCE,
    extract_trusted_langfuse_context,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from workflow.extensions.otlp.trace.span import Span


def _trusted_trace_carrier(
    headers: Mapping[str, str], *, method: str, path: str
) -> dict[str, str]:
    """Accept remote parentage only from an authenticated Astron service call."""

    if path != "/workflow/v1/chat/completions":
        return {}
    normalized_headers = {
        str(key).lower(): str(value) for key, value in headers.items()
    }
    return extract_trusted_langfuse_context(
        headers,
        method=method,
        audience=WORKFLOW_TRACE_AUDIENCE,
        tenant_id=normalized_headers.get("x-consumer-username", ""),
    )


class OtlpMiddleware(BaseHTTPMiddleware):

    def __init__(self, app: ASGIApp):
        """
        Initialize the otlp middleware

        :param app: The ASGI application
        """
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        """
        Add a span to the request.

        :param request: The request object
        :param call_next: The next function to call
        :return: The response object
        """
        span = Span()
        # Public W3C headers are untrusted.  Internal callers authenticate the
        # exact traceparent/tracestate/baggage carrier with a short-lived HMAC.
        trace_context = _trusted_trace_carrier(
            dict(request.headers),
            method=request.method,
            path=request.url.path,
        )
        with span.start(
            func_name=request.url.path,
            trace_context=trace_context or None,
        ):
            return await call_next(request)
