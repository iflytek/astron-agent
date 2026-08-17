from typing import Any, Mapping

from common.otlp.trace.langfuse import extract_trusted_langfuse_context
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from workflow.extensions.otlp.trace.span import Span


def _trusted_trace_carrier(headers: Mapping[str, str]) -> dict[str, str]:
    """Accept remote parentage only from an authenticated Astron service call."""

    return extract_trusted_langfuse_context(headers)


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
        trace_context = _trusted_trace_carrier(dict(request.headers))
        with span.start(
            func_name=request.url.path,
            trace_context=trace_context or None,
        ):
            return await call_next(request)
