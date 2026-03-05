"""Unit tests for aiokafka_factory module."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from plugin.aitools.utils.aiokafka_factory import AioKafkaProducerServiceFactory


class TestAioKafkaProducerServiceFactory:
    """Test cases for kafka factory."""

    def test_parse_int_env_fallback(self) -> None:
        with patch("os.getenv", return_value="bad"):
            assert AioKafkaProducerServiceFactory.parse_int_env("X", 5) == 5

    def test_parse_acks_env_all(self) -> None:
        with patch("os.getenv", return_value="all"):
            assert AioKafkaProducerServiceFactory.parse_acks_env() == "all"

    def test_parse_acks_env_invalid(self) -> None:
        with patch("os.getenv", return_value="9"):
            assert AioKafkaProducerServiceFactory.parse_acks_env() == 1

    def test_is_kafka_enabled(self) -> None:
        with patch("os.getenv", return_value="1"):
            assert AioKafkaProducerServiceFactory.is_kafka_enabled() is True

    @patch("plugin.aitools.utils.aiokafka_factory.asyncio.get_event_loop")
    @patch("plugin.aitools.utils.aiokafka_factory.AioKafkaProducerService")
    def test_create_builds_service_and_schedules_start(
        self,
        mock_service_cls: MagicMock,
        mock_get_event_loop: MagicMock,
    ) -> None:
        factory = AioKafkaProducerServiceFactory()

        mock_service = MagicMock()
        mock_service.start = AsyncMock()
        mock_service_cls.return_value = mock_service

        loop = MagicMock()
        mock_get_event_loop.return_value = loop

        with patch.dict(
            "os.environ",
            {
                "KAFKA_SERVERS": "k1:9092,k2:9092",
                "KAFKA_TOPIC": "topic-x",
                "KAFKA_ENABLE": "1",
            },
            clear=False,
        ):
            result = factory.create()

        assert result is mock_service
        assert factory._cached_instance is mock_service
        loop.create_task.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_stops_cached_service(self) -> None:
        factory = AioKafkaProducerServiceFactory()
        cached = MagicMock()
        cached.stop = AsyncMock()
        factory._cached_instance = cached

        await factory.shutdown()

        cached.stop.assert_awaited_once()
        assert factory._cached_instance is None
