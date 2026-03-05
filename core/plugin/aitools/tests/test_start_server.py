"""Unit tests for start_server infrastructure lifecycle."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.service.base import ServiceType
from plugin.aitools.app import start_server


class TestStartUvicorn:
    """Test server bootstrap behavior."""

    @patch("plugin.aitools.app.start_server.uvicorn.Server")
    @patch("plugin.aitools.app.start_server.uvicorn.Config")
    @patch("plugin.aitools.app.start_server.aitools_app")
    @patch("plugin.aitools.app.start_server.AIToolsPolaris")
    def test_start_uvicorn_with_polaris(
        self,
        mock_polaris_cls: MagicMock,
        mock_aitools_app: MagicMock,
        mock_uvicorn_config: MagicMock,
        mock_uvicorn_server: MagicMock,
    ) -> None:
        """When USE_POLARIS=true, bootstrap should pull polaris config once."""
        with patch.dict(
            os.environ,
            {"USE_POLARIS": "true", "SERVICE_PORT": "18669"},
            clear=False,
        ):
            start_server.global_polaris = None
            start_server.AIToolsServer.start_uvicorn()

        mock_polaris = mock_polaris_cls.return_value
        mock_polaris.pull_onece.assert_called_once()
        mock_uvicorn_config.assert_called_once()
        mock_uvicorn_server.return_value.run.assert_called_once()


@pytest.mark.asyncio
class TestLifespan:
    """Test lifespan startup/shutdown orchestration."""

    async def test_lifespan_registers_watch_and_shutdowns_kafka(self) -> None:
        """Lifespan should register watch callback and close kafka on exit."""
        mock_polaris = MagicMock()
        mock_kafka = MagicMock()
        mock_kafka.stop = AsyncMock()

        with (
            patch.object(start_server, "global_polaris", mock_polaris),
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
        mock_polaris.register_callback.assert_called_once_with(
            start_server.aitools_service_manager.hot_load_callback
        )
        mock_polaris.start_watch.assert_called_once()
        mock_close_session.assert_awaited_once()
        mock_get_kafka.assert_called_once()
        mock_kafka.stop.assert_awaited_once()
        mock_polaris.stop_watch.assert_called_once()

    async def test_lifespan_skips_kafka_shutdown_when_not_registered(self) -> None:
        """Lifespan should not fetch kafka service if not registered."""
        mock_polaris = MagicMock()

        with (
            patch.object(start_server, "global_polaris", mock_polaris),
            patch.object(start_server, "initialize_services"),
            patch.object(start_server, "close_aiohttp_session", new=AsyncMock()),
            patch.object(start_server.aitools_service_manager, "services", {}),
            patch.object(start_server, "get_kafka_producer_service") as mock_get_kafka,
        ):
            async with start_server.lifespan(MagicMock()):
                pass

        mock_get_kafka.assert_not_called()
