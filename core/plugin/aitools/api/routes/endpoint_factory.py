"""
EndpointFactory module for building FastAPI endpoints.
"""

import inspect
from typing import Any, Callable, Dict, Literal, Optional

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from fastapi import Body, Header, Query, Request
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.schemas.types import BaseResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.log.logger import log
from plugin.aitools.utils.otlp_utils import update_span, upload_trace


class ServiceFunctionAdapter:
    """ServiceFunctionAdapter class for adapting a service function to a FastAPI endpoint."""

    def __init__(self, service_func: Callable):
        self.service_func = service_func
        self.sig = inspect.signature(service_func)
        self.param_names = list(self.sig.parameters.keys())

    def adapt(
        self, request: Request, **endpoint_kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adapt the service function to a FastAPI endpoint."""
        service_kwargs: Dict[str, Any] = {}

        handlers: Dict[str, Callable[[], Literal[False] | None]] = {
            "request": lambda: service_kwargs.update({"request": request}),
            "query": lambda: (
                "query" in endpoint_kwargs
                and service_kwargs.update({"query": endpoint_kwargs["query"]})
            ),
            "body": lambda: (
                "body" in endpoint_kwargs
                and service_kwargs.update({"body": endpoint_kwargs["body"]})
            ),
            "headers": lambda: (
                "headers" in endpoint_kwargs
                and service_kwargs.update(
                    {"headers": endpoint_kwargs.get("headers") or dict(request.headers)}
                )
            ),
            "span": lambda: service_kwargs.update(
                {"span": getattr(request.state, "span", None)}
            ),
            "meter": lambda: service_kwargs.update(
                {"meter": getattr(request.state, "meter", None)}
            ),
            "node_trace": lambda: service_kwargs.update(
                {"node_trace": getattr(request.state, "node_trace", None)}
            ),
        }

        for param_name in self.param_names:
            if param_name in handlers:
                handlers[param_name]()
            elif param_name in endpoint_kwargs:
                service_kwargs[param_name] = endpoint_kwargs[param_name]

        self._apply_default_values(service_kwargs)
        return service_kwargs

    def _apply_default_values(self, service_kwargs: Dict[str, Any]) -> None:
        for param_name in self.param_names:
            param = self.sig.parameters.get(param_name)
            if (
                param
                and param.default != inspect.Parameter.empty
                and param_name not in service_kwargs
            ):
                service_kwargs[param_name] = param.default

    @property
    def is_async(self) -> bool:
        """Return True if the service function is asynchronous, False otherwise."""
        return inspect.iscoroutinefunction(self.service_func)


class EndpointFactory:
    """EndpointFactory class for building FastAPI endpoints."""

    def _tracing_response(
        self,
        response: Any,
        span: Optional[SpanLike],
        node_trace: Optional[NodeTraceLog],
        meter: Optional[Meter],
    ) -> None:
        """Tracing response"""
        if isinstance(response, BaseResponse):
            try:
                update_span(response, span)
                if node_trace and meter:
                    upload_trace(response, meter, node_trace)
            except Exception as e:
                log.error(f"Failed to update span or upload trace: {e}")

    def _set_endpoint_signature(
        self,
        endpoint_func: Callable,
        service_func: Callable,
        meta: ApiMeta,
        adapter: ServiceFunctionAdapter,
    ) -> None:
        """Set the signature of the endpoint function."""
        params = []

        # add the request parameter
        params.append(
            inspect.Parameter(
                "request",
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                annotation=Request,
            )
        )

        # add the query parameter if it's required by the service function
        if (
            meta
            and hasattr(meta, "query")
            and meta.query
            and "query" in adapter.param_names
        ):
            params.append(
                inspect.Parameter(
                    "query",
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    default=Query(...),
                    annotation=meta.query,
                )
            )

        # add the body parameter if it's required by the service function
        if (
            meta
            and hasattr(meta, "body")
            and meta.body
            and "body" in adapter.param_names
        ):
            params.append(
                inspect.Parameter(
                    "body",
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    default=Body(...),
                    annotation=meta.body,
                )
            )

        # add the headers parameter if it's required by the service function
        if (
            meta
            and hasattr(meta, "headers")
            and meta.headers
            and "headers" in adapter.param_names
        ):
            params.append(
                inspect.Parameter(
                    "headers",
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    default=Header(...),
                    annotation=meta.headers,
                )
            )

        setattr(endpoint_func, "__signature__", inspect.Signature(params))
        endpoint_func.__name__ = service_func.__name__
        if meta and hasattr(meta, "description"):
            endpoint_func.__doc__ = meta.description
        else:
            endpoint_func.__doc__ = service_func.__doc__

    def build_endpoint(self, service_func: Callable) -> Callable:
        """Build a FastAPI endpoint from a service function."""
        meta: Optional[ApiMeta] = getattr(service_func, "__api_meta__", None)
        if not meta:
            raise ValueError(f"No API meta found for {service_func.__name__}")
        adapter = ServiceFunctionAdapter(service_func)

        if adapter.is_async:
            return self._build_async_endpoint(service_func, meta, adapter)
        else:
            return self._build_sync_endpoint(service_func, meta, adapter)

    def _build_sync_endpoint(
        self, service_func: Callable, meta: ApiMeta, adapter: ServiceFunctionAdapter
    ) -> Callable:
        """Build a synchronous FastAPI endpoint from a service function."""

        def endpoint_sync(request: Request, **endpoint_kwargs: Dict[str, Any]) -> Any:
            """Endpoint function for synchronous service function."""
            service_kwargs = adapter.adapt(request, **endpoint_kwargs)

            response = service_func(**service_kwargs)
            self._tracing_response(
                response,
                service_kwargs.get("span"),
                service_kwargs.get("node_trace"),
                service_kwargs.get("meter"),
            )
            return response

        self._set_endpoint_signature(endpoint_sync, service_func, meta, adapter)
        return endpoint_sync

    def _build_async_endpoint(
        self, service_func: Callable, meta: ApiMeta, adapter: ServiceFunctionAdapter
    ) -> Callable:
        """Build an asynchronous FastAPI endpoint from a service function."""

        async def endpoint_async(
            request: Request, **endpoint_kwargs: Dict[str, Any]
        ) -> Any:
            """Endpoint function for asynchronous service function."""
            service_kwargs = adapter.adapt(request, **endpoint_kwargs)

            response = await service_func(**service_kwargs)
            self._tracing_response(
                response,
                service_kwargs.get("span"),
                service_kwargs.get("node_trace"),
                service_kwargs.get("meter"),
            )
            return response

        self._set_endpoint_signature(endpoint_async, service_func, meta, adapter)
        return endpoint_async
