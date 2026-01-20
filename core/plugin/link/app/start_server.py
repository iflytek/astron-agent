import functools
import os
from pathlib import Path

import uvicorn
from common.initialize.initialize import initialize_services
from common.settings.polaris import ConfigFilter, Polaris
from fastapi import FastAPI
from loguru import logger
from plugin.link.api.router import router
from plugin.link.consts import const
from plugin.link.domain.models.manager import init_data_base
from plugin.link.service.community.tools.http.execution_server import (
    init_kafka_send_workers,
)
from plugin.link.utils.json_schemas.read_json_schemas import (
    load_create_tool_schema,
    load_http_run_schema,
    load_mcp_register_schema,
    load_tool_debug_schema,
    load_update_tool_schema,
)
from plugin.link.utils.log.logger import configure
from plugin.link.utils.sid.sid_generator2 import spark_link_init_sid

print = functools.partial(print, flush=True)


class SparkLinkServer:

    def start(self) -> None:
        """
        Start the Spark Link server by setting up the environment,
        configuring the server, and launching Uvicorn.

        This method orchestrates the complete server startup process including
        environment configuration, server setup, and HTTP server initialization.
        """
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
        service_name = os.getenv("SERVICE_NAME", "spark-link")
        version = os.getenv("VERSION", "2.0.0")
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
            "log_service",
            "otlp_sid_service",
            "otlp_span_service",
            "otlp_metric_service",
            "kafka_producer_service",
        ]
        initialize_services(services=need_init_services)

        try:
            import asyncio

            from plugin.link.extension.gateway.watchdog import setup_watchdog

            asyncio.run(setup_watchdog())
        except (ModuleNotFoundError, ImportError):
            pass
        except Exception as e:
            print(f"[Service] ⚠️  gateway watchdog setup exception:{str(e)}")

    @staticmethod
    def start_uvicorn() -> None:
        """
        Start the Uvicorn ASGI server with configuration loaded from environment
        variables.

        This method creates and starts a Uvicorn server instance using configuration
        parameters such as host, port, worker count, reload settings, and WebSocket
        ping intervals retrieved from environment variables.
        """
        service_port = os.getenv(const.SERVICE_PORT_KEY)
        if not service_port:
            raise ValueError("SERVICE_PORT_KEY is not set")
        uvicorn_config = uvicorn.Config(
            app=spark_link_app(),
            host="0.0.0.0",
            port=int(service_port),
            workers=20,
            reload=False,
            log_config=None,
        )
        uvicorn_server = uvicorn.Server(uvicorn_config)
        uvicorn_server.run()


def spark_link_app() -> FastAPI:
    """
    Create Spark Link app.

    Returns:
        FastAPI: The configured FastAPI application instance
    """
    log_path = os.getenv(const.LOG_PATH_KEY)
    if not log_path:
        raise ValueError("LOG_PATH_KEY is not set")
    configure(
        os.getenv(const.LOG_LEVEL_KEY),
        Path(__file__).parent.parent / log_path,
    )
    init_data_base()
    load_create_tool_schema()
    load_update_tool_schema()
    load_http_run_schema()
    load_tool_debug_schema()
    load_mcp_register_schema()
    spark_link_init_sid()
    init_kafka_send_workers()
    app = FastAPI()
    app.include_router(router)
    logger.error("init success")
    return app


if __name__ == "__main__":
    SparkLinkServer().start()
