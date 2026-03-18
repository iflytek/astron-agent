"""Unit tests for start_server infrastructure lifecycle."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.service.base import ServiceType
from plugin.aitools.app import start_server


class TestStartUvicorn:
    """Test server bootstrap behavior."""

    @patch("plugin.aitools.app.start_server.uvicorn.Server")
    @patch("plugin.aitools.app.start_server.uvicorn.Config")
    @patch("plugin.aitools.app.start_server.safe_get_int_env", return_value=18669)
    @patch("plugin.aitools.app.start_server.ConfigWatcher")
    @patch("plugin.aitools.app.start_server.aitools_app")
    def test_start_uvicorn_builds_config_watcher(
        self,
        mock_aitools_app: MagicMock,
        mock_config_watcher_cls: MagicMock,
        mock_safe_get_int_env: MagicMock,
        mock_uvicorn_config: MagicMock,
        mock_uvicorn_server: MagicMock,
    ) -> None:
        """Bootstrap should initialize ConfigWatcher and run uvicorn."""
        start_server.global_config_watcher = None
        start_server.AIToolsServer.start_uvicorn()

        mock_config_watcher_cls.assert_called_once()
        assert (
            start_server.global_config_watcher is mock_config_watcher_cls.return_value
        )
        mock_safe_get_int_env.assert_called_once()
        mock_uvicorn_config.assert_called_once()
        mock_uvicorn_server.return_value.run.assert_called_once()


@pytest.mark.asyncio
class TestLifespan:
    """Test lifespan startup/shutdown orchestration."""

    async def test_lifespan_registers_watch_and_shutdowns_kafka(self) -> None:
        """Lifespan should register watch callback and close kafka on exit."""
        mock_config_watcher = MagicMock()
        mock_config_watcher.start_watch = AsyncMock()
        mock_config_watcher.stop_watch = AsyncMock()
        mock_kafka = MagicMock()
        mock_kafka.stop = AsyncMock()

        with (
            patch.object(start_server, "global_config_watcher", mock_config_watcher),
            patch.object(start_server, "initialize_services") as mock_init,
            patch.object(
                start_server, "close_aiohttp_session", new=AsyncMock()
            ) as mock_close_session,
            patch.object(
                start_server.aitools_service_manager,
                "services",
                {ServiceType.KAFKA_PRODUCER_SERVICE: object()},
            ),
            patch.object(
                start_server, "get_kafka_producer_service", return_value=mock_kafka
            ) as mock_get_kafka,
        ):
            async with start_server.lifespan(MagicMock()):
                pass

        mock_init.assert_called_once()
        mock_config_watcher.register_callback.assert_any_call(
            start_server.aitools_service_manager.hot_load_callback
        )
        mock_config_watcher.register_callback.assert_any_call(
            start_server.reset_aiohttp_session
        )
        mock_config_watcher.start_watch.assert_awaited_once()
        mock_close_session.assert_awaited_once()
        mock_get_kafka.assert_called_once()
        mock_kafka.stop.assert_awaited_once()
        mock_config_watcher.stop_watch.assert_awaited_once()

    async def test_lifespan_skips_kafka_shutdown_when_not_registered(self) -> None:
        """Lifespan should not fetch kafka service if not registered."""
        mock_config_watcher = MagicMock()
        mock_config_watcher.start_watch = AsyncMock()
        mock_config_watcher.stop_watch = AsyncMock()

        with (
            patch.object(start_server, "global_config_watcher", mock_config_watcher),
            patch.object(start_server, "initialize_services"),
            patch.object(start_server, "close_aiohttp_session", new=AsyncMock()),
            patch.object(start_server.aitools_service_manager, "services", {}),
            patch.object(start_server, "get_kafka_producer_service") as mock_get_kafka,
        ):
            async with start_server.lifespan(MagicMock()):
                pass

        mock_get_kafka.assert_not_called()
