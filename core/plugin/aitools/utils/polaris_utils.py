"""Polaris utility class for AITools plugin, providing configuration management and change detection."""

import asyncio
import hashlib
import inspect
import os
from datetime import datetime
from io import StringIO
from typing import Any, Callable, Optional

import aiohttp
from common.settings.polaris import ConfigFilter, Polaris
from dotenv import dotenv_values
from plugin.aitools.common.log.logger import log


class AIToolsPolaris(Polaris):
    """AIToolsPolaris extends"""

    def __init__(self) -> None:
        """Initialize Polaris configuration and set up internal state for configuration management."""
        base_url = os.getenv("POLARIS_URL")
        username = os.getenv("POLARIS_USERNAME")
        password = os.getenv("POLARIS_PASSWORD")
        super().__init__(base_url=base_url, username=username, password=password)

        self._config_cache: dict[str, Any] = {}
        self._config_filter: Optional[ConfigFilter] = None
        self._config_hash: Optional[str] = None
        self._callbacks: list[Callable[..., None]] = []

        self._watch_task: Optional[asyncio.Task] = None

        self._load_config_filter()

    @staticmethod
    def _hash(content: str) -> str:
        """Generate an MD5 hash of the given content string for change detection."""
        return hashlib.md5(content.encode()).hexdigest()

    def _load_config_filter(self) -> None:
        """Load Polaris configuration filter parameters from environment variables."""
        project_name = os.getenv("PROJECT_NAME", "hy-spark-agent-builder")
        cluster_group = os.getenv("POLARIS_CLUSTER", "")
        service_name = os.getenv("SERVICE_NAME", "aitools")
        version = os.getenv("VERSION", "1.0.0")
        config_file = os.getenv("CONFIG_FILE", "config.env")

        self._config_filter = ConfigFilter(
            project_name=project_name,
            cluster_group=cluster_group,
            service_name=service_name,
            version=version,
            config_file=config_file,
        )

    def register_callback(self, callback: Callable[..., None]) -> None:
        """Register a callback function to be invoked when Polaris configuration changes are detected."""
        self._callbacks.append(callback)

    def pull_once(
        self,
        retry_count: int = 3,
        retry_interval: int = 5,
        set_env: bool = True,
    ) -> None:
        """Pull configuration from Polaris once with retries and optional environment variable setting."""
        config = self.pull(
            config_filter=self._config_filter,
            retry_count=retry_count,
            retry_interval=retry_interval,
            set_env=set_env,
        )
        content = "\n".join(f"{k}={v}" for k, v in config.items())
        self._config_hash = self._hash(content)
        self._config_cache = config

    async def pull_async(  # type: ignore
        self,
        config_filter: ConfigFilter,
        retry_count: int = 3,
        retry_interval: int = 5,
        set_env: bool = True,
    ) -> dict[str, Any]:
        """Asynchronously pull configuration from Polaris with retries and optional environment variable setting."""
        url = (
            f"{self.base_url}/config/download?"
            f"project={config_filter.project_name}"
            f"&cluster={config_filter.cluster_group}"
            f"&service={config_filter.service_name}"
            f"&version={config_filter.version}"
            f"&configName={config_filter.config_file}"
        )

        for i in range(retry_count):

            try:
                async with aiohttp.ClientSession() as session:

                    # login
                    login_url = f"{self.base_url}/api/v1/user/login"

                    async with session.post(
                        login_url,
                        json=self._login_payload(),
                        timeout=aiohttp.ClientTimeout(total=5),
                    ) as resp:

                        resp.raise_for_status()

                        cookies = resp.cookies

                        jessionid_cookie = cookies.get("JSESSIONID")
                        if not jessionid_cookie:
                            raise aiohttp.ClientError(
                                "Login failed, JSESSIONID cookie not found"
                            )
                        self.cookie = jessionid_cookie.value
                        self.cookie_create_at = datetime.now()

                    # download config
                    async with session.get(
                        url,
                        cookies={"JSESSIONID": self.cookie},
                    ) as resp:

                        resp.raise_for_status()

                        data = await resp.json()

                        content = data["data"]["content"]

                        if set_env:
                            self.set_env(content)

                        config_dict = dotenv_values(stream=StringIO(content))

                        return dict(config_dict)

            except Exception:

                if i == retry_count - 1:
                    raise

                await asyncio.sleep(retry_interval)

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

    async def _watch_loop(
        self,
        config_filter: ConfigFilter,
        interval: int,
    ) -> None:
        """Background thread loop."""
        if config_filter is None:
            config_filter = self._config_filter

        if config_filter is None:
            raise ValueError("ConfigFilter required")

        while True:
            try:
                config = await self.pull_async(config_filter)

                content = "\n".join(f"{k}={v}" for k, v in config.items())
                new_hash = self._hash(content)

                if new_hash != self._config_hash:

                    self._config_hash = new_hash
                    self._config_cache = config

                    await self._trigger_callbacks()

            except Exception as e:
                log.exception(f"[Polaris] watch error: {e}")

            await asyncio.sleep(interval)

    def start_watch(
        self,
        config_filter: Optional[ConfigFilter] = None,
        interval: int = 60,
    ) -> None:
        """Start config watching."""
        loop = asyncio.get_running_loop()

        self._watch_task = loop.create_task(self._watch_loop(config_filter, interval))

    def stop_watch(self) -> None:
        """Stop config watching."""
        if self._watch_task:
            self._watch_task.cancel()
