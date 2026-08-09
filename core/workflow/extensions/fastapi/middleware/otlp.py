from typing import Any, Mapping
from urllib.parse import unquote_plus

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from workflow.extensions.otlp.trace.span import Span


def _safe_trace_carrier(headers: Mapping[str, str]) -> dict[str, str]:
    """Preserve ordinary W3C baggage while removing Langfuse authority fields."""
    carrier = dict(headers)
    baggage_value = next(
        (value for key, value in carrier.items() if key.lower() == "baggage"), ""
    )
    if not baggage_value:
        return carrier

    safe_members = []
    for member in baggage_value.split(","):
        raw_key = member.split("=", 1)[0]
        key = unquote_plus(raw_key).strip().lower()
        if not key.startswith("langfuse."):
            safe_members.append(member.strip())

    baggage_key = next(key for key in carrier if key.lower() == "baggage")
    if safe_members:
        carrier[baggage_key] = ",".join(safe_members)
    else:
        carrier.pop(baggage_key, None)
    return carrier


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
        # Continue an upstream W3C trace when workflow calls are nested under an
        # agent or another workflow.  ``Headers`` is a case-insensitive mapping
        # and is accepted by the OpenTelemetry propagator as a carrier.
        # Keep W3C parentage, but do not treat unsigned remote baggage as an
        # authority for Langfuse user/session/trace attribution.
        trace_context = _safe_trace_carrier(dict(request.headers))
        with span.start(func_name=request.url.path, trace_context=trace_context):
            return await call_next(request)
