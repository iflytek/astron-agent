"""Main module for the FastAPI application.

This module initializes the FastAPI app, sets up middleware,
configures routes, and handles application lifecycle events.
"""

import asyncio
import json
import os
import platform
import socket
import sys
from asyncio.subprocess import PIPE
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import uvicorn
from common.initialize.initialize import initialize_services
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from memory.database.api import router
from memory.database.domain.entity.views.http_resp import format_response
from memory.database.exceptions.e import CustomException
from memory.database.exceptions.error_code import CodeEnum
from memory.database.repository.middleware.database.database_migration import (
    run_database_migration,
)
from starlette.middleware.cors import CORSMiddleware


def initialize_extensions() -> None:
    """Initialize required extensions and services for the application."""
    os.environ["CONFIG_ENV_PATH"] = "./memory/database/config.env"

    need_init_services = [
        "settings_service",
        "log_service",
        "cache_service",
        "otlp_sid_service",
        "otlp_span_service",
        "otlp_metric_service",
    ]
    initialize_services(services=need_init_services)


async def rep_initialize_extensions() -> None:
    """Initialize middleware initialize services for the application."""

    # pylint: disable=import-outside-toplevel
    from repository.middleware.initialize import (
        initialize_services as rep_initialize_services,
    )

    await rep_initialize_services()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Async context manager for application lifespan events.

    Args:
        app: The FastAPI application instance.

    Yields:
        None: After successful initialization.
    """
    try:
        # Execute before application startup
        yield
        # Execute after application startup
        route_infos = []
        for route in app.routes:
            if hasattr(route, "path") and hasattr(route, "name"):
                route_infos.append(
                    {
                        "path": route.path,
                        "name": route.name,
                        "methods": (
                            list(route.methods) if hasattr(route, "methods") else "chat"
                        ),
                    }
                )
        logger.info("Registered routes:")
        for route_info in route_infos:
            logger.info(json.dumps(route_info, ensure_ascii=False))
    except Exception as e:  # pylint: disable=broad-except
        logger.exception(f"Failed during lifespan startup.\n{e}")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        FastAPI: The configured FastAPI application instance.
    """
    try:
        app = FastAPI(lifespan=lifespan)

        origins = ["*"]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        app.include_router(router.router)

        # Define global Pydantic validation exception handler (applies to all routes)
        @app.exception_handler(RequestValidationError)
        async def global_validation_exception_handler(
            _request: Request, exc: RequestValidationError
        ) -> JSONResponse:
            """Global validation exception handler.

            Args:
                _request: The incoming request (unused).
                exc: The validation error.

            Returns:
                JSONResponse: Formatted error response.
            """
            # Format error information (extract field path and error description)
            error_details = [
                f"field: {'.'.join(map(str, err['loc']))}, message: {err['msg']}"
                for err in exc.errors()
            ]
            return format_response(  # type: ignore[no-any-return]
                code=CodeEnum.ParamError.code,
                message=f"Parameter validation failed: {error_details}",
            )

        # Register global exception handler
        @app.exception_handler(Exception)
        async def global_exception_handler(
            _request: Request, exc: Exception
        ) -> JSONResponse:
            """Global exception handler.

            Args:
                _request: The incoming request (unused).
                exc: The exception.

            Returns:
                JSONResponse: Formatted error response.
            """
            return format_response(  # type: ignore[no-any-return]
                code=CodeEnum.HttpError.code, message=f"{str(exc.__cause__)}"
            )

        # Register custom exception handler
        @app.exception_handler(CustomException)
        async def custom_exception_handler(_request: Request, exc: Any) -> JSONResponse:
            """Custom exception handler.

            Args:
                _request: The incoming request (unused).
                exc: The custom exception.

            Returns:
                JSONResponse: Formatted error response.
            """
            return JSONResponse(
                status_code=400,
                content={
                    "code": exc.code,
                    "message": exc.message,
                    "sid": getattr(exc, "sid", None),
                },
            )

    except Exception as e:  # pylint: disable=broad-except
        logger.error(f"Failed to create app: {e}")

    return app


async def _get_host_ip_from_hostname_command() -> str | None:
    """Get host IP using hostname -i command (Linux only)."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "hostname", "-i", stdout=PIPE, stderr=PIPE
        )
        out, _ = await proc.communicate()
        if proc.returncode == 0 and out:
            ip = out.decode().strip().split()[0]
            if ip:
                return ip
    except (OSError, ValueError):
        pass
    return None


def _get_host_ip_from_gethostbyname() -> str | None:
    """Get host IP using socket.gethostbyname."""
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except (OSError, socket.gaierror):
        pass
    return None


def _get_host_ip_from_getaddrinfo() -> str | None:
    """Get host IP using socket.getaddrinfo."""
    try:
        hostname = socket.gethostname()
        for fam, _, _, _, sockaddr in socket.getaddrinfo(hostname, None):
            if fam == socket.AF_INET:
                candidate = sockaddr[0]
                if isinstance(candidate, str) and not candidate.startswith("127."):
                    return candidate
    except (OSError, socket.gaierror):
        pass
    return None


async def _get_host_ip() -> str:
    """Get host IP address using multiple fallback strategies."""
    system = platform.system().lower()

    # Prefer hostname -i on Linux
    if system == "linux":
        ip = await _get_host_ip_from_hostname_command()
        if ip:
            return ip

    # Cross-platform fallback using socket
    ip = _get_host_ip_from_gethostbyname()
    if ip:
        return ip

    # Last resort: pick first non-loopback from getaddrinfo
    ip = _get_host_ip_from_getaddrinfo()
    if ip:
        return ip

    return "0.0.0.0"  # Fallback to localhost


def _write_watchdog_env(host_ip: str) -> None:
    """Write watchdog environment file for Linux systems."""
    with open("/etc/watchdog-env", "w", encoding="utf-8") as f:
        service_port = os.getenv("SERVICE_PORT", "")
        kong_service = os.getenv("KONG_SERVICE_NAME", "")
        kong_admin = os.getenv("KONG_ADMIN_API", "")
        f.write(
            f"""
export APP_HOST={host_ip}
export APP_PORT={service_port}
export KONG_SERVICE_NAME={kong_service}
export KONG_ADMIN_API={kong_admin}
"""
        )


def _print_env_vars(host_ip: str) -> None:
    """Print environment variables for non-Linux systems."""
    service_port = os.getenv("SERVICE_PORT", "")
    kong_service = os.getenv("KONG_SERVICE_NAME", "")
    kong_admin = os.getenv("KONG_ADMIN_API", "")
    print(f"""export APP_HOST={host_ip}""")
    print(f"""export APP_PORT={service_port}""")
    print(f"""export KONG_SERVICE_NAME={kong_service}""")
    print(f"""export KONG_ADMIN_API={kong_admin}""")


async def _log_ready_after_delay() -> None:
    """Log ready status after delay with host IP information."""
    host_ip = await _get_host_ip()
    system = platform.system().lower()
    # Prefer hostname -i on Linux
    if system == "linux":
        _write_watchdog_env(host_ip)
    else:
        _print_env_vars(host_ip)


if __name__ == "__main__":
    logger.debug(f"current platform {sys.platform}")
    # app = asyncio.run(create_app())
    # common init
    initialize_extensions()
    # postgresql init
    asyncio.run(rep_initialize_extensions())
    # kong init
    asyncio.run(_log_ready_after_delay())
    # alembic init
    run_database_migration()

    uvicorn.run(
        app="main:create_app",
        host="0.0.0.0",
        port=int(os.getenv("SERVICE_PORT", "7990")),
        workers=(
            None
            if sys.platform in ["win", "win32", "darwin"]
            else int(os.getenv("WORKERS", "1"))
        ),
        reload=False,
        log_level=os.getenv("LOG_LEVEL", "error").lower(),
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )
