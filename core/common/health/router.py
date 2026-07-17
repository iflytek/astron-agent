import asyncio
from enum import Enum
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

STATUS_UP = "UP"
STATUS_DOWN = "DOWN"


def create_health_router(service_name: str, service_manager: Any) -> APIRouter:
    router = APIRouter(tags=["health"])

    @router.get("/health/live")
    async def liveness() -> dict[str, str]:
        return {"service": service_name, "status": STATUS_UP}

    @router.get("/health")
    @router.get("/health/ready")
    async def readiness() -> JSONResponse:
        payload = await asyncio.to_thread(
            build_readiness_payload, service_name, service_manager
        )
        status_code = 200 if payload["status"] == STATUS_UP else 503
        return JSONResponse(status_code=status_code, content=payload)

    return router


def build_readiness_payload(service_name: str, service_manager: Any) -> dict[str, Any]:
    checks = {
        _normalize_service_name(name): _build_service_check(
            _normalize_service_name(name), service
        )
        for name, service in _iter_services(service_manager)
    }
    status = (
        STATUS_DOWN
        if any(check["status"] == STATUS_DOWN for check in checks.values())
        else STATUS_UP
    )
    return {"service": service_name, "status": status, "checks": checks}


def _iter_services(service_manager: Any) -> list[tuple[Any, Any]]:
    services = getattr(service_manager, "services", {})
    return sorted(services.items(), key=lambda item: _normalize_service_name(item[0]))


def _normalize_service_name(name: Any) -> str:
    if isinstance(name, Enum):
        return str(name.value)
    value = getattr(name, "value", None)
    if isinstance(value, str):
        return value
    return str(name)


def _build_service_check(service_name: str, service: Any) -> dict[str, Any]:
    ready = bool(getattr(service, "ready", False))
    check: dict[str, Any] = {
        "ready": ready,
        "status": STATUS_UP if ready else STATUS_DOWN,
    }

    if service_name == "database_service" and ready and hasattr(service, "engine"):
        database_check = _check_database_connection(service)
        check["database"] = database_check
        if not database_check["connected"]:
            check["status"] = STATUS_DOWN

    return check


def _check_database_connection(service: Any) -> dict[str, Any]:
    try:
        with service.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        return {"connected": False, "error": type(exc).__name__}
    return {"connected": True}
