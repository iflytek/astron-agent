"""Factory for AioKafkaProducerService construction and cached instance management."""

import asyncio
import os
from typing import Optional

from common.service.base import ServiceFactory
from loguru import logger as log
from plugin.aitools.const.const import (
    KAFKA_ACKS_KEY,
    KAFKA_DRAIN_TIMEOUT_KEY,
    KAFKA_ENABLE_KEY,
    KAFKA_LINGER_MS_KEY,
    KAFKA_QUEUE_MAX_SIZE_KEY,
    KAFKA_RETRY_BACKOFF_MS_KEY,
    KAFKA_RETRY_INTERVAL_KEY,
    KAFKA_SERVERS_KEY,
    KAFKA_TIMEOUT_KEY,
    KAFKA_TOPIC_KEY,
)
from plugin.aitools.utils.aiokafka_service import AioKafkaProducerService
from plugin.aitools.utils.env_utils import (
    safe_get_bool_env,
    safe_get_int_env,
    safe_get_list_env,
)


class AioKafkaProducerServiceFactory(ServiceFactory):
    """Env-driven factory with cached instance and rebuild callback support."""

    def __init__(self) -> None:
        super().__init__(AioKafkaProducerService)  # type: ignore[arg-type]
        self._cached_instance: Optional[AioKafkaProducerService] = None

    @staticmethod
    def parse_acks_env() -> str | int:
        acks_env = os.getenv(KAFKA_ACKS_KEY, "1")
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
        return safe_get_bool_env(KAFKA_ENABLE_KEY, False)

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
            "bootstrap_servers": safe_get_list_env(
                KAFKA_SERVERS_KEY, ["localhost:9092"]
            ),
            "acks": self.parse_acks_env(),
            "linger_ms": safe_get_int_env(KAFKA_LINGER_MS_KEY, 10),
            "retry_backoff_ms": safe_get_int_env(KAFKA_RETRY_BACKOFF_MS_KEY, 10000),
            "value_serializer": lambda v: v.encode("utf-8"),
        }

        aiokafka_service = AioKafkaProducerService(
            config=config,
            topic=os.getenv(KAFKA_TOPIC_KEY, "default_topic"),
            retry_interval=safe_get_int_env(KAFKA_RETRY_INTERVAL_KEY, 10),
            timeout=safe_get_int_env(KAFKA_TIMEOUT_KEY, 5),
            queue_max_size=safe_get_int_env(KAFKA_QUEUE_MAX_SIZE_KEY, 10000),
            drain_timeout=safe_get_int_env(KAFKA_DRAIN_TIMEOUT_KEY, 5),
            enable=self.is_kafka_enabled(),
        )
        self._cached_instance = aiokafka_service

        loop = asyncio.get_event_loop()
        loop.create_task(aiokafka_service.start())

        return aiokafka_service
