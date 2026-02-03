"""
Register module for registering API services.
"""

from fastapi import APIRouter
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.routes.endpoint_factory import build_endpoint
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
        meta: ApiMeta = service_func.__api_meta__  # type: ignore

        # if meta.internal and not include_internal:
        #     continue
        if meta.deprecated:
            continue

        endpoint = build_endpoint(service_func)

        router.add_api_route(
            path=meta.path,
            endpoint=endpoint,
            methods=[meta.method],
            response_model=meta.response,
            summary=meta.summary,
            description=meta.description,
            tags=meta.tags,  # type: ignore[arg-type]
            deprecated=meta.deprecated,
        )
