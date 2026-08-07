from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from workflow.extensions.otlp.trace.span import Span


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
        with span.start(func_name=request.url.path):
            return await call_next(request)
