"""
EndpointFactory module for building FastAPI endpoints.
"""

import inspect
from typing import Any, Callable, cast

from fastapi import Body, Depends, Request
from plugin.aitools.api.decorators.api_meta import ApiMeta, BodyT, QueryT
from plugin.aitools.api.schemas.types import BaseResponse
from plugin.aitools.common.clients.adapters import adapt_span
from plugin.aitools.utils.otlp_utils import update_span, upload_trace


def build_endpoint(service_func: Callable) -> Callable:
    """
    Build a FastAPI endpoint from a service function.
    """
    meta: ApiMeta = getattr(service_func, "__api_meta__")

    def endpoint_sync(
        request: Request,
        query: QueryT | None = None,
        body: BodyT | None = None,
    ) -> BaseResponse:
        span = adapt_span(
            request.state.span if hasattr(request.state, "span") else None
        )
        node_trace = (
            request.state.node_trace if hasattr(request.state, "node_trace") else None
        )
        meter = request.state.meter if hasattr(request.state, "meter") else None

        if meta.query:
            response = service_func(query, request, span, meter, node_trace)
        elif meta.body:
            response = service_func(body, request, span, meter, node_trace)
        else:
            response = service_func(request, span, meter, node_trace)

        update_span(response, span)
        upload_trace(response, meter, node_trace)

        return response

    async def endpoint_async(
        request: Request,
        query: QueryT | None = None,
        body: BodyT | None = None,
    ) -> BaseResponse:
        span = adapt_span(
            request.state.span if hasattr(request.state, "span") else None
        )
        node_trace = (
            request.state.node_trace if hasattr(request.state, "node_trace") else None
        )
        meter = request.state.meter if hasattr(request.state, "meter") else None

        if meta.query:
            response = await service_func(query, request, span, meter, node_trace)
        elif meta.body:
            response = await service_func(body, request, span, meter, node_trace)
        else:
            response = await service_func(request, span, meter, node_trace)

        update_span(response, span)
        upload_trace(response, meter, node_trace)

        return response

    params = [
        inspect.Parameter(
            "request",
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
            annotation=Request,
        )
    ]

    if meta.query:
        params.append(
            inspect.Parameter(
                "query",
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                default=Depends(meta.query),
                annotation=meta.query,
            )
        )

    if meta.body:
        params.append(
            inspect.Parameter(
                "body",
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                default=Body(...),
                annotation=meta.body,
            )
        )

    if inspect.iscoroutinefunction(service_func):
        cast(Any, endpoint_async).__signature__ = inspect.Signature(params)
        endpoint_async.__name__ = service_func.__name__
        endpoint_async.__doc__ = meta.description or service_func.__doc__
        return endpoint_async

    cast(Any, endpoint_sync).__signature__ = inspect.Signature(params)
    endpoint_sync.__name__ = service_func.__name__
    endpoint_sync.__doc__ = meta.description or service_func.__doc__
    return endpoint_sync
