"""
Register module for registering API services.
"""

import importlib
import sys
from enum import Enum
from typing import Optional, cast

from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.routes.endpoint_factory import EndpointFactory
from plugin.aitools.api.routes.service_scanner import iter_api_services

DYNAMIC_ROUTE_MARKER = "__aitools_dynamic_route__"
SERVICE_MODULE_PREFIX = "plugin.aitools.service"


def register_api_services(
    router: APIRouter,
    *,
    include_internal: bool = False,
    force_reload_modules: bool = False,
) -> None:
    """
    Register all API services in a FastAPI router.
    """
    for service_func in iter_api_services(force_reload=force_reload_modules):
        meta: Optional[ApiMeta] = getattr(service_func, "__api_meta__", None)

        if not meta:
            raise ValueError(f"Service function {service_func} has no API meta")
        # if meta.internal and not include_internal:
        #     continue
        if meta.deprecated:
            continue

        endpoint_factory = EndpointFactory()
        endpoint = endpoint_factory.build_endpoint(service_func)
        setattr(endpoint, DYNAMIC_ROUTE_MARKER, True)

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


def remove_dynamic_api_routes(app: FastAPI) -> int:
    """Remove previously registered dynamic API routes."""
    removed_count = 0
    kept_routes = []

    for route in app.router.routes:
        endpoint = getattr(route, "endpoint", None)
        if (
            isinstance(route, APIRoute)
            and endpoint
            and getattr(endpoint, DYNAMIC_ROUTE_MARKER, False)
        ):
            removed_count += 1
            continue
        kept_routes.append(route)

    app.router.routes[:] = kept_routes
    app.openapi_schema = None
    return removed_count


def _clear_service_import_cache() -> None:
    """Clear imported service modules so route scanning can load latest code."""
    module_names = [
        name
        for name in list(sys.modules.keys())
        if name == SERVICE_MODULE_PREFIX or name.startswith(SERVICE_MODULE_PREFIX + ".")
    ]
    for name in module_names:
        sys.modules.pop(name, None)
    importlib.invalidate_caches()


def reregister_api_services(
    app: FastAPI,
    *,
    include_internal: bool = False,
) -> int:
    """Re-register dynamic API routes from service modules and return route count."""
    remove_dynamic_api_routes(app)
    _clear_service_import_cache()

    register_api_services(
        app.router,
        include_internal=include_internal,
        force_reload_modules=True,
    )

    return len(
        [
            route
            for route in app.router.routes
            if isinstance(route, APIRoute)
            and getattr(getattr(route, "endpoint", None), DYNAMIC_ROUTE_MARKER, False)
        ]
    )
