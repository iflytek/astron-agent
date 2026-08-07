"""
Register module for registering API services.
"""

from enum import Enum
from typing import Optional, cast

from fastapi import APIRouter
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.routes.endpoint_factory import EndpointFactory
from plugin.aitools.api.routes.service_scanner import iter_api_services


def register_api_services(
    router: APIRouter,
    *,
    include_internal: bool = False,
) -> None:
    """
    Register all API services in a FastAPI router.
    """
    for service_func in iter_api_services():
        meta: Optional[ApiMeta] = getattr(service_func, "__api_meta__", None)

        if not meta:
            raise ValueError(f"Service function {service_func} has no API meta")
        # if meta.internal and not include_internal:
        #     continue
        if meta.deprecated:
            continue

        endpoint_factory = EndpointFactory()
        endpoint = endpoint_factory.build_endpoint(service_func)

        router.add_api_route(
            path=meta.path,
            endpoint=endpoint,
            methods=[meta.method],
            response_model=meta.response,
            summary=meta.summary,
            description=meta.description,
            tags=cast("list[str | Enum] | None", meta.tags),
            deprecated=meta.deprecated,
        )
