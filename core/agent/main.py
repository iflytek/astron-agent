#!/usr/bin/env python3
"""
Agent main entry point
Load configuration files and start FastAPI service
"""

import asyncio
import json
import os
import platform
import socket
import sys
import time
from asyncio.subprocess import PIPE

import uvicorn
from common.initialize.initialize import initialize_services
from common.otlp.sid import sid_generator2
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.cors import CORSMiddleware

from agent.api import router
from agent.api.schemas.completion_chunk import ReasonChatCompletionChunk
from agent.exceptions.agent_exc import AgentExc


def initialize_extensions() -> None:
    """Initialize required extensions and services for the application."""

    os.environ["CONFIG_ENV_PATH"] = "./agent/config.env"

    need_init_services = [
        "settings_service",
        "log_service",
        "database_service",
        "kafka_producer_service",
        "otlp_sid_service",
        "otlp_span_service",
        "otlp_metric_service",
    ]
    initialize_services(services=need_init_services)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance.

    This function initializes all required extensions, sets up CORS middleware,
    includes API routers, and configures global exception handlers for the
    authentication service.

    Returns:
        FastAPI: The configured FastAPI application instance.
    """
    logger.info(""" AGENT SERVER START """)

    app = FastAPI()
    origins = ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router.router_v1)

    @app.exception_handler(AgentExc)  # type: ignore[misc]
    async def agent_exception_handler(_request: Request, exc: AgentExc) -> JSONResponse:
        """Handle AgentExc business exceptions"""
        request_id = (
            sid_generator2.gen() if sid_generator2 is not None else "agent-error"
        )

        rs = JSONResponse(
            status_code=200,  # Business errors return 200 with error code
            content=ReasonChatCompletionChunk(
                code=exc.c,
                message=exc.m,
                id=request_id,
                choices=[],
                created=int(time.time()),
                model="",
                object="chat.completion.chunk",
            ).model_dump(),
        )
        return rs

    @app.exception_handler(RequestValidationError)  # type: ignore[misc]
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors"""
        try:
            # Safely get the first error message
            errors = exc.errors()
            err = errors[0] if errors else {}
        except (IndexError, AttributeError):
            err = exc.body or {}
        message = f"{err['type']}, {err['loc'][-1]}, {err['msg']}"

        # Generate ID safely - fallback if sid_generator2 not initialized
        request_id = (
            sid_generator2.gen() if sid_generator2 is not None else "validation-error"
        )

        rs = JSONResponse(
            content=ReasonChatCompletionChunk(
                code=40002,
                message=message,
                id=request_id,
                choices=[],
                created=int(time.time()),
                model="",
                object="chat.completion.chunk",
            ).model_dump()
        )
        return rs

    @app.on_event("startup")
    async def print_routes() -> None:
        """Print all registered routes on application startup.

        This startup event handler collects information about all registered
        routes and logs them for debugging and monitoring purposes.
        """
        route_infos = []
        for route in app.routes:
            route_infos.append(
                {
                    "path": getattr(route, "path", str(route)),
                    "name": getattr(route, "name", type(route).__name__),
                    "methods": (
                        list(route.methods) if hasattr(route, "methods") else "chat"
                    ),
                }
            )
        logger.info("Registered routes:")
        print("Registered routes:")
        for route_info in route_infos:
            logger.info(json.dumps(route_info, ensure_ascii=False))
            print(json.dumps(route_info, ensure_ascii=False))

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
        service_port = os.getenv("SERVICE_PORT", "8700")
        kong_service = os.getenv("KONG_SERVICE_NAME", "upstream-astron-agent")
        kong_admin = os.getenv(
            "KONG_ADMIN_API", "http://172.30.209.27:8000/service_find"
        )
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
    service_port = os.getenv("SERVICE_PORT", "8700")
    kong_service = os.getenv("KONG_SERVICE_NAME", "upstream-astron-agent")
    kong_admin = os.getenv("KONG_ADMIN_API", "http://172.30.209.27:8000/service_find")
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
    initialize_extensions()

    asyncio.run(_log_ready_after_delay())

    uvicorn.run(
        app="main:create_app",
        host="0.0.0.0",
        port=int(os.getenv("SERVICE_PORT", "8700")),
        workers=(
            None
            if sys.platform in ["win", "win32", "darwin"]
            else int(os.getenv("WORKERS", "1"))
        ),
        reload=False,
        log_level="error",
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )
