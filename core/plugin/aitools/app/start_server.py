"""
Server startup module responsible for FastAPI application initialization and startup.
"""

import functools
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from common.initialize.initialize import initialize_services
from common.settings.polaris import ConfigFilter, Polaris
from fastapi import APIRouter, FastAPI
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware

# from plugin.aitools.api.route import app
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.common.clients.aiohttp_client import close_aiohttp_session
from plugin.aitools.common.exceptions.exceptions import register_exception_handlers
from plugin.aitools.common.log.logger import init_uvicorn_logger
from plugin.aitools.const.const import OTLP_ENABLE_KEY, SERVICE_PORT_KEY
from plugin.aitools.utils.otlp_utils import (
    init_kafka_send_workers,
    shutdown_kafka_workers,
)

print = functools.partial(print, flush=True)


class AIToolsServer:

    def start(self) -> None:
        self.load_polaris()
        self.setup_server()
        self.start_uvicorn()

    @staticmethod
    def load_polaris() -> None:
        """
        Load remote configuration and override environment variables
        """
        use_polaris = os.getenv("USE_POLARIS", "false").lower()
        print(f"🔧 Config: USE_POLARIS :{use_polaris}")
        if use_polaris == "false":
            return

        base_url = os.getenv("POLARIS_URL")
        project_name = os.getenv("PROJECT_NAME", "hy-spark-agent-builder")
        cluster_group = os.getenv("POLARIS_CLUSTER", "")
        service_name = os.getenv("SERVICE_NAME", "aitools")
        version = os.getenv("VERSION", "1.0.0")
        config_file = os.getenv("CONFIG_FILE", "config.env")
        config_filter = ConfigFilter(
            project_name=project_name,
            cluster_group=cluster_group,
            service_name=service_name,
            version=version,
            config_file=config_file,
        )
        username = os.getenv("POLARIS_USERNAME")
        password = os.getenv("POLARIS_PASSWORD")

        # Ensure required parameters are not None
        if not base_url or not username or not password or not cluster_group:
            return  # Skip polaris config if required params are missing

        polaris = Polaris(base_url=base_url, username=username, password=password)
        try:
            _ = polaris.pull(
                config_filter=config_filter,
                retry_count=3,
                retry_interval=5,
                set_env=True,
            )
        except (ConnectionError, TimeoutError, ValueError) as e:
            print(
                f"⚠️ Polaris configuration loading failed, "
                f"continuing with local configuration: {e}"
            )

    @staticmethod
    def setup_server() -> None:
        """Initialize service suite"""
        need_init_services = [
            "settings_service",
            "oss_service",
            "kafka_producer_service",
            "otlp_sid_service",
            "otlp_span_service",
            "otlp_metric_service",
        ]
        initialize_services(services=need_init_services)

        # try:
        #     import asyncio

        #     from plugin.aitools.extension.gateway.watchdog import setup_watchdog

        #     asyncio.run(setup_watchdog())
        # except (ModuleNotFoundError, ImportError):
        #     pass
        # except Exception as e:
        #     print(f"[Service] ⚠️  gateway watchdog setup exception:{str(e)}")

    @staticmethod
    def start_uvicorn() -> None:
        if not (service_port := os.getenv(SERVICE_PORT_KEY)):
            raise ValueError(f"Missing {SERVICE_PORT_KEY} environment variable")

        init_uvicorn_logger()

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
        if os.getenv("KAFKA_ENABLE") == "1":
            init_kafka_send_workers()
        yield
    finally:
        await close_aiohttp_session()
        if os.getenv("KAFKA_ENABLE") == "1":
            shutdown_kafka_workers()


def aitools_app() -> FastAPI:
    """
    description: create ai tools app
    :return:
    """
    main_app = FastAPI(lifespan=lifespan)
    router = APIRouter()

    sample_rate = float(os.getenv("SAMPLE_RATE", "1.0"))
    exclude_paths_str = os.getenv("EXCLUDE_PATHS", None)
    exclude_paths = None
    if exclude_paths_str:
        exclude_paths = exclude_paths_str.split(",")

    main_app.add_middleware(
        OTLPMiddleware,
        enabled=os.getenv(OTLP_ENABLE_KEY, "0"),
        sample_rate=sample_rate,
        exclude_paths=exclude_paths,
    )

    register_api_services(router)
    register_exception_handlers(main_app)
    main_app.include_router(router)

    # main_app = OTLPMiddleware(
    #     app=main_app,
    #     enabled=os.getenv(OTLP_ENABLE_KEY, "0"),
    # )
    # main_app.include_router(app)

    return main_app


if __name__ == "__main__":
    try:
        AIToolsServer().start()
    except KeyboardInterrupt:
        ...
