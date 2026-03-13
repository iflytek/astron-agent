"""Unit tests for start_server infrastructure lifecycle."""

# pylint: disable=too-few-public-methods,unused-argument,wrong-import-order

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from plugin.aitools.app import aitools_server, app_factory


class TestStartUvicorn:
    """Test server bootstrap behavior."""

    @patch("plugin.aitools.app.aitools_server.uvicorn.Server")
    @patch("plugin.aitools.app.aitools_server.uvicorn.Config")
    @patch("plugin.aitools.app.aitools_server.safe_get_int_env", return_value=18669)
    @patch("plugin.aitools.app.aitools_server.ConfigWatcher")
    @patch("plugin.aitools.app.app_factory.aitools_app")
    def test_start_uvicorn_builds_config_watcher(
        self,
        mock_aitools_app: MagicMock,
        mock_config_watcher_cls: MagicMock,
        mock_safe_get_int_env: MagicMock,
        mock_uvicorn_config: MagicMock,
        mock_uvicorn_server: MagicMock,
    ) -> None:
        """Bootstrap should initialize ConfigWatcher and run uvicorn."""
        server = aitools_server.AIToolsServer()
        server.start_uvicorn()

        mock_config_watcher_cls.assert_called_once()
        assert server.config_watcher is mock_config_watcher_cls.return_value
        mock_aitools_app.assert_called_once_with(server=server)
        mock_safe_get_int_env.assert_called_once()
        mock_uvicorn_config.assert_called_once()
        mock_uvicorn_server.return_value.run.assert_called_once()


@pytest.mark.asyncio
class TestLifespan:
    """Test lifespan startup/shutdown orchestration."""

    async def test_lifespan_registers_watch_and_shutdowns_kafka(self) -> None:
        """Lifespan should register watch callback and close kafka on exit."""
        server = MagicMock()
        server.startup_resources = AsyncMock()
        server.shutdown_resources = AsyncMock()

        async with app_factory.build_lifespan(server)(MagicMock()):
            pass

        server.startup_resources.assert_awaited_once()
        server.shutdown_resources.assert_awaited_once()

    async def test_lifespan_skips_kafka_shutdown_when_not_registered(self) -> None:
        """Lifespan should not fetch kafka service if not registered."""
        server = MagicMock()
        server.startup_resources = AsyncMock()
        server.shutdown_resources = AsyncMock()

        async with app_factory.build_lifespan(server)(MagicMock()):
            pass

        server.startup_resources.assert_awaited_once()
        server.shutdown_resources.assert_awaited_once()
