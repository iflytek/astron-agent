"""
Spark Flow Main Application Module

This module serves as the entry point for the Spark Flow workflow engine application.
It initializes the FastAPI application with all necessary middleware, routers, and
extensions including metrics, tracing, and graceful shutdown handling.
"""

import multiprocessing
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from loguru import logger
from starlette.middleware.cors import CORSMiddleware

from workflow.api.v1.router import old_auth_router, sparkflow_router, workflow_router
from workflow.cache.event_registry import EventRegistry
from workflow.extensions.fastapi.handler.validation import validation_exception_handler
from workflow.extensions.fastapi.lifespan.database_migration import (
    run_database_migration,
)
from workflow.extensions.fastapi.lifespan.http_client import HttpClient
from workflow.extensions.fastapi.lifespan.utils import print_routes
from workflow.extensions.fastapi.middleware.auth import AuthMiddleware
from workflow.extensions.fastapi.middleware.otlp import OtlpMiddleware
from workflow.extensions.graceful_shutdown.graceful_shutdown import GracefulShutdown
from workflow.extensions.middleware.initialize import initialize_services


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.

    This function initializes the FastAPI app with all necessary middleware,
    routers, exception handlers, and lifecycle event handlers. It sets up
    CORS, graceful shutdown, and route logging functionality.

    :return: Configured FastAPI application instance
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[Any]:

        # Initialize application services and middleware
        initialize_services()

        # Run database migration before starting the service
        run_database_migration()

        # Initialize the http connection pool when the entire service starts
        await HttpClient.setup()

        await print_routes(app)

        print("🚀 FastAPI service started successfully!")

        yield

        # Destroy the http connection pool when the service stops
        await HttpClient.close()

        # Exit gracefully
        async def do_final_shutdown_logic() -> None:
            print("🧹 Final shutdown hook executed.")

        await GracefulShutdown(
            event=EventRegistry(),
            check_interval=int(os.getenv("SHUTDOWN_INTERVAL", "2")),
            timeout=int(os.getenv("SHUTDOWN_TIMEOUT", "180")),
        ).run(shutdown_callback=do_final_shutdown_logic)

    # Create the FastAPI application instance
    app = FastAPI(lifespan=lifespan)

    # Configure CORS middleware to allow cross-origin requests
    origins = ["*"]
    app.add_middleware(
        CORSMiddleware,  # type: ignore[arg-type]
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(OtlpMiddleware)  # type: ignore[arg-type]
    app.add_middleware(AuthMiddleware)  # type: ignore[arg-type]

    # Include API routers for different endpoints
    app.include_router(sparkflow_router)
    app.include_router(workflow_router)
    app.include_router(old_auth_router)

    # Add global exception handler for request validation errors
    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,  # type: ignore[arg-type]
    )

    return app


def _get_worker_count() -> int:
    """
    Get the number of workers to use for the application.
    """
    worker_count: int = int(os.getenv("WORKERS", "0"))
    if worker_count == 0:
        worker_count = multiprocessing.cpu_count() + 1
    logger.debug(f"🔍 Worker count: {worker_count}")
    return worker_count


if __name__ == "__main__":
    # Main entry point for the Spark Flow application.
    # This block initializes the application environment and starts the Uvicorn
    # ASGI server with appropriate configuration for different platforms.

    # Log the current platform for debugging purposes
    logger.debug(f"🔍 Current platform: {sys.platform}")

    # Start the Uvicorn ASGI server with platform-specific configuration
    uvicorn.run(
        app="main:create_app",  # Reference to the FastAPI app factory function
        host="0.0.0.0",  # Bind to all available network interfaces
        port=int(os.getenv("SERVICE_PORT", "7880")),  # Default port 7880
        workers=_get_worker_count(),
        reload=(
            os.getenv("RELOAD", "false").lower() == "true"
        ),  # Enable auto-reload for development
        log_level=os.getenv(
            "LOG_LEVEL", "error"
        ).lower(),  # Set log level to error to reduce noise
        ws_ping_interval=None,  # Disable WebSocket ping interval
        ws_ping_timeout=None,  # Disable WebSocket ping timeout
    )
