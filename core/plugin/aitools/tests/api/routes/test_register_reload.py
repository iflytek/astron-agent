"""Unit tests for dynamic route re-register behavior."""

# pylint: disable=line-too-long,unused-argument,missing-function-docstring

from typing import Any

from fastapi import APIRouter, FastAPI, Request
from fastapi.routing import APIRoute
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.routes.register import (
    DYNAMIC_ROUTE_MARKER,
    register_api_services,
    reregister_api_services,
)


def _make_service(path: str) -> Any:
    def service_func(request: Request) -> dict[str, bool]:
        return {"ok": True}

    service_func.__api_meta__ = ApiMeta(method="GET", path=path)  # type: ignore[attr-defined]
    service_func.__name__ = path.strip("/").replace("/", "_")
    return service_func


def test_reregister_replaces_dynamic_routes(monkeypatch: Any) -> None:
    app = FastAPI()
    router = APIRouter()

    old_service = _make_service("/aitools/v1/old")
    new_service = _make_service("/aitools/v1/new")

    def old_iter_api_services(*, force_reload: bool = False) -> list[Any]:
        _ = force_reload
        return [old_service]

    monkeypatch.setattr(
        "plugin.aitools.api.routes.register.iter_api_services",
        old_iter_api_services,
    )

    register_api_services(router)
    app.include_router(router)

    old_routes = [
        route
        for route in app.router.routes
        if getattr(getattr(route, "endpoint", None), DYNAMIC_ROUTE_MARKER, False)
    ]
    assert len(old_routes) == 1

    def new_iter_api_services(*, force_reload: bool = False) -> list[Any]:
        _ = force_reload
        return [new_service]

    monkeypatch.setattr(
        "plugin.aitools.api.routes.register.iter_api_services",
        new_iter_api_services,
    )

    route_count = reregister_api_services(app)

    assert route_count == 1
    dynamic_paths = {
        route.path
        for route in app.router.routes
        if isinstance(route, APIRoute)
        if getattr(getattr(route, "endpoint", None), DYNAMIC_ROUTE_MARKER, False)
    }
    assert "/aitools/v1/old" not in dynamic_paths
    assert "/aitools/v1/new" in dynamic_paths
