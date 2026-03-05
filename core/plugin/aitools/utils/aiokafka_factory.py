"""Factory for AioKafkaProducerService construction and cached instance management."""

import asyncio
import os
from typing import Optional

from common.service.base import ServiceFactory
from plugin.aitools.common.log.logger import log
from plugin.aitools.utils.aiokafka_service import AioKafkaProducerService


class AioKafkaProducerServiceFactory(ServiceFactory):
    """Env-driven factory with cached instance and rebuild callback support."""

    def __init__(self) -> None:
        super().__init__(AioKafkaProducerService)  # type: ignore[arg-type]
        self._cached_instance: Optional[AioKafkaProducerService] = None

    @staticmethod
    def parse_int_env(name: str, default: int) -> int:
        value = os.getenv(name, str(default))
        try:
            return int(value)
        except (TypeError, ValueError) as e:
            log.warning(f"Invalid {name} value '{value}', defaulting to {default}: {e}")
            return default

    @staticmethod
    def parse_acks_env() -> str | int:
        acks_env = os.getenv("KAFKA_ACKS", "1")
        if acks_env == "all":
            return "all"

        try:
            acks = int(acks_env)
        except (TypeError, ValueError) as e:
            log.warning(f"Invalid KAFKA_ACKS value '{acks_env}', defaulting to 1: {e}")
            return 1

        if acks not in (-1, 0, 1):
            log.warning(
                f"Unsupported KAFKA_ACKS value '{acks_env}', expected one of all/-1/0/1, defaulting to 1"
            )
            return 1

        return acks

    @staticmethod
    def is_kafka_enabled() -> bool:
        return os.getenv("KAFKA_ENABLE") == "1"

    async def start(self) -> None:
        """Start the Kafka producer service if enabled."""
        if self._cached_instance:
            await self._cached_instance.start()

    async def shutdown(self) -> None:
        """Shutdown the Kafka producer service if enabled."""
        if self._cached_instance:
            await self._cached_instance.stop()
            self._cached_instance = None

    def create(self, *args: tuple, **kwargs: dict) -> AioKafkaProducerService:
        """Create an AioKafkaProducerService from environment variables."""
        config = {
            "bootstrap_servers": os.getenv("KAFKA_SERVERS", "localhost:9092").split(
                ","
            ),
            "acks": self.parse_acks_env(),
            "linger_ms": self.parse_int_env("KAFKA_LINGER_MS", 10),
            "retry_backoff_ms": self.parse_int_env("KAFKA_RETRY_BACKOFF_MS", 10000),
            "value_serializer": lambda v: v.encode("utf-8"),
        }

        aiokafka_service = AioKafkaProducerService(
            config=config,
            topic=os.getenv("KAFKA_TOPIC", "default_topic"),
            retry_interval=self.parse_int_env("KAFKA_RETRY_INTERVAL", 10),
            timeout=self.parse_int_env("KAFKA_TIMEOUT", 5),
            queue_max_size=self.parse_int_env("KAFKA_QUEUE_MAX_SIZE", 10000),
            drain_timeout=self.parse_int_env("KAFKA_DRAIN_TIMEOUT", 5),
            enable=self.is_kafka_enabled(),
        )
        self._cached_instance = aiokafka_service

        loop = asyncio.get_event_loop()
        loop.create_task(aiokafka_service.start())

        return aiokafka_service
