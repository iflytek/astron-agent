"""
Server startup module responsible for FastAPI application initialization and startup.
"""

import functools
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from common.service.base import ServiceType
from fastapi import APIRouter, FastAPI
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.common.clients.aiohttp_client import (
    close_aiohttp_session,
    reset_aiohttp_session,
)
from plugin.aitools.const.const import (
    INCLUDE_PATHS_KEY,
    OTLP_ENABLE_KEY,
    SAMPLE_RATE_KEY,
    SERVICE_PORT_KEY,
)
from plugin.aitools.utils import aitools_service_manager, get_kafka_producer_service
from plugin.aitools.utils.config_utils import ConfigWatcher
from plugin.aitools.utils.env_utils import (
    safe_get_bool_env,
    safe_get_float_env,
    safe_get_int_env,
    safe_get_list_env,
)
from plugin.aitools.utils.initialize import initialize_services

print = functools.partial(print, flush=True)
global_config_watcher: ConfigWatcher | None = None


class AIToolsServer:

    def start(self) -> None:
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
        global global_config_watcher
        global_config_watcher = ConfigWatcher()

        service_port = safe_get_int_env(SERVICE_PORT_KEY, 18667)
        print(f"🚀 Starting server on port {service_port}")
        uvicorn_config = uvicorn.Config(
            app=aitools_app(),
            host="0.0.0.0",
            port=service_port,
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
        if global_config_watcher:
            global_config_watcher.register_callback(
                aitools_service_manager.hot_load_callback
            )
            global_config_watcher.register_callback(reset_aiohttp_session)
            await global_config_watcher.start_watch()

        initialize_services()
        yield
    finally:
        await close_aiohttp_session()

        if ServiceType.KAFKA_PRODUCER_SERVICE in aitools_service_manager.services:
            kafka_service = get_kafka_producer_service()

            if kafka_service:
                await kafka_service.stop()

        if global_config_watcher:
            await global_config_watcher.stop_watch()


def aitools_app() -> FastAPI:
    """
    description: create ai tools app
    :return:
    """
    main_app = FastAPI(lifespan=lifespan)
    router = APIRouter()
    register_api_services(router)
    main_app.include_router(router)

    sample_rate = safe_get_float_env(SAMPLE_RATE_KEY, 1.0)
    include_paths = safe_get_list_env(INCLUDE_PATHS_KEY, ["/aitools/v1"])

    main_app.add_middleware(
        OTLPMiddleware,
        enabled=safe_get_bool_env(OTLP_ENABLE_KEY, False),
        sample_rate=sample_rate,
        include_paths=include_paths,
    )

    return main_app


if __name__ == "__main__":
    try:
        AIToolsServer().start()
    except KeyboardInterrupt:
        ...
