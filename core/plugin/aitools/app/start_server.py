"""
Server startup module responsible for FastAPI application initialization and startup.
"""

import functools
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from common.service.base import ServiceType
from fastapi import APIRouter, FastAPI
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.common.clients.aiohttp_client import close_aiohttp_session
from plugin.aitools.common.log.logger import init_uvicorn_logger
from plugin.aitools.const.const import OTLP_ENABLE_KEY, SERVICE_PORT_KEY
from plugin.aitools.utils import aitools_service_manager, get_kafka_producer_service
from plugin.aitools.utils.initialize import initialize_services
from plugin.aitools.utils.polaris_utils import AIToolsPolaris

print = functools.partial(print, flush=True)
global_polaris = None


class AIToolsServer:

    def start(self) -> None:
        init_uvicorn_logger()
        self.setup_watchdog()
        self.start_uvicorn()

    @staticmethod
    def setup_watchdog() -> None:
        """Initialize service suite"""
        try:
            import asyncio

            from plugin.aitools.extension.gateway.watchdog import (
                setup_watchdog,  # type: ignore[import]
            )

            asyncio.run(setup_watchdog())
        except (ModuleNotFoundError, ImportError):
            pass
        except Exception as e:
            print(f"[Service] ⚠️  gateway watchdog setup exception:{str(e)}")

    @staticmethod
    def start_uvicorn() -> None:
        global global_polaris
        if os.getenv("USE_POLARIS", "false").lower() == "true":
            print("🔍 Polaris configuration watching enabled")
            global_polaris = AIToolsPolaris()
            global_polaris.pull_once()

        if not (service_port := os.getenv(SERVICE_PORT_KEY)):
            raise ValueError(f"Missing {SERVICE_PORT_KEY} environment variable")

        print(f"🚀 Starting server on port {service_port}")
        uvicorn_config = uvicorn.Config(
            app=aitools_app(),
            host="0.0.0.0",
            port=int(service_port),
            workers=20,
            reload=False,
            ws_ping_interval=None,
            ws_ping_timeout=NotImplemented,
            log_config=None,
        )
        uvicorn_server = uvicorn.Server(uvicorn_config)
        uvicorn_server.run()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        if global_polaris:
            global_polaris.register_callback(aitools_service_manager.hot_load_callback)
            global_polaris.start_watch()

        initialize_services()
        yield
    finally:
        await close_aiohttp_session()

        if ServiceType.KAFKA_PRODUCER_SERVICE in aitools_service_manager.services:
            kafka_service = get_kafka_producer_service()

            if kafka_service:
                await kafka_service.stop()

        if global_polaris:
            global_polaris.stop_watch()


def aitools_app() -> FastAPI:
    """
    description: create ai tools app
    :return:
    """
    main_app = FastAPI(lifespan=lifespan)
    router = APIRouter()
    register_api_services(router)
    main_app.include_router(router)

    sample_rate = float(os.getenv("SAMPLE_RATE", "1.0"))
    include_paths_str = os.getenv("INCLUDE_PATHS", None)
    include_paths = None
    if include_paths_str:
        include_paths = include_paths_str.split(",")

    main_app.add_middleware(
        OTLPMiddleware,
        enabled=os.getenv(OTLP_ENABLE_KEY, "0"),
        sample_rate=sample_rate,
        include_paths=include_paths,
    )

    return main_app


if __name__ == "__main__":
    try:
        AIToolsServer().start()
    except KeyboardInterrupt:
        ...
