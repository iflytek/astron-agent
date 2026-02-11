"""
OTLP Middleware for tracing requests and responses

This middleware is responsible for tracing requests and responses, including
capturing request and response details, creating spans, and logging them to
OTLP endpoints.
"""

import os
import random
import socket
import time
import uuid
from contextlib import contextmanager
from typing import Any, Callable, Dict, Iterator, Optional, Tuple

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from common.otlp.sid import SidGenerator2, SidInfo
from common.otlp.trace.span import SPAN_SIZE_LIMIT, Span
from common.otlp.trace.span_instance import SpanInstance
from fastapi import Request
from plugin.aitools.common.clients.adapters import adapt_span
from plugin.aitools.common.log.logger import log
from plugin.aitools.const.const import (
    SERVICE_LOCATION_KEY,
    SERVICE_PORT_KEY,
    SERVICE_SUB_KEY,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


def get_host_ip() -> str:
    """
    description: Get local ip
    """
    s: Optional[socket.socket] = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(3)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception as err:
        raise Exception(f"failed to get local ip, err reason {str(err)}") from err
    finally:
        if s is not None:
            s.close()

    return ip


class OTLPMiddleware(BaseHTTPMiddleware):
    """Middleware for tracing requests and responses"""

    def __init__(
        self,
        app: ASGIApp,
        enabled: str = "1",
        sample_rate: float = 1.0,
        exclude_paths: list | None = None,
    ):
        super().__init__(app)
        self.enabled = enabled
        self.sample_rate = sample_rate
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics",
            "/favicon.ico",
            "/robots.txt",
        ]

        self.app_id = os.getenv("AI_APP_ID", "")
        self.uid = str(uuid.uuid1())
        self.sid_info = SidInfo(
            sub=os.getenv(SERVICE_SUB_KEY, "aitools"),
            location=os.getenv(SERVICE_LOCATION_KEY, "default"),
            index=0,
            local_ip=get_host_ip(),
            local_port=os.getenv(SERVICE_PORT_KEY, "18668"),
        )
        self.sid = SidGenerator2(self.sid_info).gen()

    async def dispatch(self, request: Request, call_next: Callable) -> Any:
        """Dispatch the request to the next middleware or the app"""
        span, meter, node_trace = None, None, None
        request.state.sid = self.sid

        try:
            if self._should_skip(request):
                return await call_next(request)

            # with self._init_span(request) as span:

            #     usr_input_str = await self._capture_user_input(request, span)
            #     node_trace, meter = self._init_node_trace(request, usr_input_str)

            #     request.state.span = span
            #     request.state.meter = meter
            #     request.state.node_trace = node_trace
            #     response = await call_next(request)

            #     return response

            span = self._init_span_instance(request)

            usr_input_str = await self._capture_user_input(request, span)
            node_trace, meter = self._init_node_trace(request, usr_input_str)

            setattr(request.state, "span", adapt_span(span))
            setattr(request.state, "meter", meter)
            setattr(request.state, "node_trace", node_trace)

            response = await call_next(request)
            return response

        except Exception:
            raise

        finally:
            self._clean(span)

    def _should_skip(self, request: Request) -> bool:
        """Should skip logging for this request?"""
        if self.enabled.lower() == "0":
            return True

        if random.random() > self.sample_rate:
            log.debug(f"Request not sampled: {request.url.path}")
            return True

        path = request.url.path
        return any(path.startswith(exclude) for exclude in self.exclude_paths)

    @contextmanager
    def _init_span(self, request: Request) -> Iterator[Span]:
        """Initialize a span for the request"""
        path = request.url.path
        func_name = path.split("/")[-1]

        span = Span(
            app_id=self.app_id,
            uid=self.uid,
        )

        with span.start(
            func_name=func_name,
            add_source_function_name=False,
            attributes=self._build_span_attributes(request),
        ) as span_context:

            sid = span_context.sid
            request.state.sid = sid

            yield span_context

    def _init_span_instance(self, request: Request) -> SpanInstance:
        """Initialize a span instance for the request"""
        path = request.url.path
        func_name = path.split("/")[-1]

        span_instance = SpanInstance(
            app_id=self.app_id,
            uid=self.uid,
        )

        span_instance.start(
            func_name=func_name,
            add_source_function_name=False,
            attributes=self._build_span_attributes(request),
        )

        sid = span_instance.sid
        request.state.sid = sid

        return span_instance

    async def _capture_user_input(
        self, request: Request, span: Span | SpanInstance
    ) -> str:
        """Capture user input from request"""
        usr_input_str = ""

        if request.query_params:
            usr_input_str = str(request.query_params)

        if request.method in {"POST", "PUT", "PATCH"}:
            try:
                body = await request.body()
                usr_input_str = body.decode("utf-8", errors="ignore")
            except Exception as e:
                log.warning(f"Failed to capture request body: {e}")

        if usr_input_str:
            if len(usr_input_str) >= SPAN_SIZE_LIMIT:
                usr_input_str = f"{usr_input_str[:SPAN_SIZE_LIMIT // 2]}...{len(usr_input_str) - SPAN_SIZE_LIMIT // 2}"
            span.add_info_events({"usr_input": usr_input_str})

        return usr_input_str

    def _init_node_trace(
        self, request: Request, usr_input_str: str
    ) -> Tuple[NodeTraceLog, Meter]:
        """Initialize a node trace for the request"""
        path = request.url.path
        func_name = path.split("/")[-1]

        sid = request.state.sid

        meter = Meter(
            app_id=self.app_id,
            func=func_name,
        )

        node_trace = NodeTraceLog(
            service_id="",
            sid=sid,
            app_id=self.app_id,
            uid=self.uid,
            chat_id=sid,
            sub=os.getenv(SERVICE_SUB_KEY, ""),
            caller="",
            log_caller=func_name,
            question=usr_input_str,
        )

        node_trace.start_time = int(time.time() * 1000)

        return (node_trace, meter)

    def _build_span_attributes(self, request: Request) -> Dict[str, Any]:
        """Build span attributes from request and trace infos"""
        attributes = {
            "http.method": request.method,
            "http.url": str(request.url),
        }

        return attributes

    def _clean(self, span_instance: Optional[SpanInstance] = None) -> None:
        """Clean up span instance"""
        if span_instance is not None:
            span_instance.stop()
