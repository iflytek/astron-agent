"""AITools server runtime orchestration and uvicorn bootstrap."""

# pylint: disable=import-outside-toplevel,wrong-import-order

import os
from pathlib import Path

import uvicorn
from common.service.base import ServiceType
from fastapi import FastAPI
from loguru import logger as log
from plugin.aitools.common.clients.aiohttp_client import (
    close_aiohttp_session,
    reset_aiohttp_session,
)
from plugin.aitools.const.const import SERVICE_PORT_KEY
from plugin.aitools.utils import aitools_service_manager, get_kafka_producer_service
from plugin.aitools.utils.config_utils import ConfigWatcher
from plugin.aitools.utils.env_utils import safe_get_int_env
from plugin.aitools.utils.initialize import initialize_services
from plugin.aitools.utils.route_utils import RouteReloadWatcher


class AIToolsServer:
    """Owns server startup lifecycle and runtime watcher resources."""

    def __init__(self) -> None:
        self._prepare_environment()
        self.config_watcher = ConfigWatcher()
        self.route_reload_watcher: RouteReloadWatcher | None = None

    @staticmethod
    def _setup_python_path() -> None:
        """Set PYTHONPATH to include plugin root and parent directories."""
        current_file_path = Path(__file__)
        project_root = current_file_path.parents[1]
        parent_dir = project_root.parent
        grandparent_dir = parent_dir.parent

        python_path = os.environ.get("PYTHONPATH", "")
        new_paths = []
        for directory in [project_root, parent_dir, grandparent_dir]:
            directory_str = str(directory)
            if directory.exists() and directory_str not in python_path:
                new_paths.append(directory_str)

        if not new_paths:
            return

        new_paths_str = os.pathsep.join(new_paths)
        if python_path:
            os.environ["PYTHONPATH"] = f"{new_paths_str}{os.pathsep}{python_path}"
        else:
            os.environ["PYTHONPATH"] = new_paths_str

        print(f"🔧 PYTHONPATH: {os.environ['PYTHONPATH']}")

    def _prepare_environment(self) -> None:
        """Prepare environment variables needed before runtime services init."""
        os.environ["PYTHONWARNINGS"] = "ignore:pkg_resources is deprecated"
        self._setup_python_path()
        config_file = Path(__file__).resolve().parents[1] / "config.env"
        os.environ["CONFIG_FILE"] = str(config_file)

    async def setup_watchdog(self) -> None:
        """Initialize optional gateway watchdog hooks."""
        try:
            from plugin.aitools.extension.gateway.watchdog import (
                setup_watchdog,  # type: ignore[import]
            )

            await setup_watchdog()
        except (ModuleNotFoundError, ImportError):
            pass
        except Exception as e:  # pylint: disable=broad-exception-caught
            log.exception(f"[Service] gateway watchdog setup exception: {e}")

    async def startup_resources(self, app: FastAPI) -> None:
        """Start runtime watchers and initialize service factories."""
        self.config_watcher.register_callback(aitools_service_manager.hot_load_callback)
        self.config_watcher.register_callback(reset_aiohttp_session)
        await self.config_watcher.start_watch()

        self.route_reload_watcher = RouteReloadWatcher(app)
        await self.route_reload_watcher.start_watch()

        await self.setup_watchdog()
        initialize_services()

    async def shutdown_resources(self) -> None:
        """Stop runtime watchers and shutdown external resources."""
        await close_aiohttp_session()

        if ServiceType.KAFKA_PRODUCER_SERVICE in aitools_service_manager.services:
            kafka_service = get_kafka_producer_service()
            if kafka_service:
                await kafka_service.stop()

        await self.config_watcher.stop_watch()

        if self.route_reload_watcher:
            await self.route_reload_watcher.stop_watch()
            self.route_reload_watcher = None

    def start_uvicorn(self) -> None:
        """Build and run uvicorn server for the AITools app."""
        from plugin.aitools.app.app_factory import aitools_app

        service_port = safe_get_int_env(SERVICE_PORT_KEY, 18667)
        print(f"🚀 Starting server on port {service_port}")
        uvicorn_config = uvicorn.Config(
            app=aitools_app(server=self),
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
