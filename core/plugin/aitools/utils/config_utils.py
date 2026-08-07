"""Polaris utility class for AITools plugin, providing configuration management and change detection."""

import asyncio
import hashlib
import inspect
import os
from io import StringIO
from typing import Any, Callable, Dict, Optional, Tuple

import aiohttp
from common.settings.polaris import ConfigFilter, LoginPayload
from dotenv import dotenv_values, load_dotenv
from loguru import logger as log
from plugin.aitools.common.log.logger import init_uvicorn_logger
from plugin.aitools.const.const import (
    CONFIG_FILE_KEY,
    CONFIG_WATCH_INTERVAL_KEY,
    HOT_RELOAD_ENABLE_KEY,
    POLARIS_CLUSTER_KEY,
    POLARIS_PASSWORD_KEY,
    POLARIS_URL_KEY,
    POLARIS_USERNAME_KEY,
    PROJECT_NAME_KEY,
    SERVICE_SUB_KEY,
    USE_POLARIS_KEY,
    VERSION_KEY,
)
from plugin.aitools.utils.env_utils import safe_get_bool_env, safe_get_int_env


class PolarisClient:
    """Polaris client for AITools plugin."""

    def __init__(
        self, base_url: str, username: str, password: str, config_filter: ConfigFilter
    ) -> None:
        """Initialize Polaris client with configuration from environment variables."""
        self.base_url = base_url
        self.username = username
        self.password = password
        self.payload = LoginPayload(addr=base_url, account=username, password=password)
        self.config_filter = config_filter
        self.cookie: Optional[str] = None

    async def download_config(self) -> Tuple[Dict[str, Any], str]:
        """Download configuration from Polaris using the provided filter."""
        login_url = f"{self.base_url}/api/v1/user/login"

        download_url = (
            f"{self.base_url}/config/download?"
            f"project={self.config_filter.project_name}"
            f"&cluster={self.config_filter.cluster_group}"
            f"&service={self.config_filter.service_name}"
            f"&version={self.config_filter.version}"
            f"&configName={self.config_filter.config_file}"
        )
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    login_url, json=self.payload.model_dump(by_alias=False)
                ) as response:
                    response.raise_for_status()
                    jsession_id = response.cookies.get("JSESSIONID")

                    if not jsession_id:
                        raise ValueError(
                            "Login successful but JSESSIONID cookie not found"
                        )

                    self.cookie = jsession_id.value

                async with session.get(
                    download_url, cookies={"JSESSIONID": self.cookie}
                ) as response:
                    response.raise_for_status()
                    data: Dict[str, Dict[str, Any]] = await response.json()

                    content = data.get("data", {}).get("content", "")
                    config_dict = dotenv_values(stream=StringIO(content))

                    return config_dict, content
        except Exception as e:
            log.exception(f"Error downloading config from Polaris: {e}")
            raise


class EnvFileLoader:

    def __init__(self, env_file_path: str) -> None:
        self.env_file_path = env_file_path

    def load_env_file(self) -> dict[str, Any]:
        """Load environment variables from a file specified by CONFIG_FILE_KEY."""
        if not os.path.exists(self.env_file_path):
            raise FileNotFoundError(f"Config file not found: {self.env_file_path}")

        config_dict = dotenv_values(self.env_file_path)

        return dict(config_dict)


class ConfigWatcher:

    def __init__(self) -> None:
        self.enable_polaris: bool = False
        self.enable_hot_reload: bool = False

        self.env_loader: Optional[EnvFileLoader] = None
        self.polaris_client: Optional[PolarisClient] = None
        self.config_filter: Optional[ConfigFilter] = None
        self.base_url: str = ""
        self.username: str = ""
        self.password: str = ""

        self.current_config: Dict[str, Any] = {}
        self.current_config_hash: Optional[str] = None
        self.interval: int = 60

        self._callbacks: list[Callable[..., None]] = []
        self._watch_task: Optional[asyncio.Task] = None

        self._initialize()

    def _initialize(self) -> None:
        """Initialize the configuration watcher by performing the first load."""
        env_file = os.getenv(CONFIG_FILE_KEY, "./config.env")
        self.env_loader = EnvFileLoader(env_file)

        config = self.env_loader.load_env_file()
        self.current_config.update(config)
        self.current_config_hash = self._hash_config(self.current_config)
        load_dotenv(self.env_loader.env_file_path, override=False)
        print("✅ Configuration loaded successfully from env file.")
        print(f"Environment file path: {self.env_loader.env_file_path}")
        self.enable_polaris = safe_get_bool_env(USE_POLARIS_KEY, False)
        self.enable_hot_reload = safe_get_bool_env(HOT_RELOAD_ENABLE_KEY, False)
        self.interval = max(
            self.interval, safe_get_int_env(CONFIG_WATCH_INTERVAL_KEY, self.interval)
        )

        if self.enable_polaris:
            self.config_filter = ConfigFilter(
                project_name=os.getenv(PROJECT_NAME_KEY, "hy-spark-agent-builder"),
                cluster_group=os.getenv(POLARIS_CLUSTER_KEY, ""),
                service_name=os.getenv(SERVICE_SUB_KEY, "aitools"),
                version=os.getenv(VERSION_KEY, "1.0.0"),
                config_file=env_file.split("/")[-1],
            )

            self.base_url = os.getenv(POLARIS_URL_KEY, "")
            self.username = os.getenv(POLARIS_USERNAME_KEY, "")
            self.password = os.getenv(POLARIS_PASSWORD_KEY, "")

            self.polaris_client = PolarisClient(
                base_url=self.base_url,
                username=self.username,
                password=self.password,
                config_filter=self.config_filter,
            )

            polaris_config, polaris_config_content = asyncio.run(
                self.polaris_client.download_config()
            )

            self.current_config.update(polaris_config)
            polaris_config_hash = self._hash_config(self.current_config)

            if polaris_config_hash != self.current_config_hash:
                self.current_config_hash = polaris_config_hash
                load_dotenv(stream=StringIO(polaris_config_content), override=True)
                print("✅ Configuration loaded successfully from Polaris.")
        init_uvicorn_logger()

    @staticmethod
    def _hash_config(config: dict[str, Any]) -> str:
        """Generate a hash of the configuration dictionary for change detection."""
        config_str = "\n".join(f"{k}={v}" for k, v in sorted(config.items()))
        return hashlib.md5(config_str.encode()).hexdigest()

    def register_callback(self, callback: Callable[..., None]) -> None:
        """Register a callback function to be invoked when configuration changes are detected."""
        self._callbacks.append(callback)

    async def _trigger_callbacks(self) -> None:
        """Invoke registered callbacks when configuration changes are detected, supporting both sync and async functions."""
        tasks = []

        for cb in self._callbacks:
            if inspect.iscoroutinefunction(cb):
                tasks.append(cb())
            else:
                cb()

        if tasks:
            await asyncio.gather(*tasks)

    async def watch_polaris(self) -> None:
        """Watch for configuration changes and invoke the callback when a change is detected."""
        while True:
            try:
                if not self.polaris_client:
                    self.polaris_client = PolarisClient(
                        base_url=self.base_url,
                        username=self.username,
                        password=self.password,
                        config_filter=self.config_filter,
                    )
                config_dict, config_content = (
                    await self.polaris_client.download_config()
                )
                self.current_config = config_dict
                new_hash = self._hash_config(self.current_config)

                if new_hash != self.current_config_hash:
                    self.current_config_hash = new_hash
                    load_dotenv(stream=StringIO(config_content), override=True)
                    await self._trigger_callbacks()

            except Exception as e:
                log.exception(f"Error watching config: {e}")
            finally:
                await asyncio.sleep(self.interval)

    async def start_watch(self) -> None:
        """Start watching for configuration changes."""
        if self.enable_hot_reload:
            if self.enable_polaris:
                self._watch_task = asyncio.create_task(self.watch_polaris())

    async def stop_watch(self) -> None:
        """Stop watching for configuration changes."""
        if self._watch_task:
            self._watch_task.cancel()
            try:
                await self._watch_task
            except asyncio.CancelledError:
                pass
