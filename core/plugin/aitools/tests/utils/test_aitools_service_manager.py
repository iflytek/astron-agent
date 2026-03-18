"""Unit tests for AitoolsServiceManager hot-reload behavior."""

from unittest.mock import AsyncMock, MagicMock, call

import pytest
from common.service import ServiceType
from plugin.aitools.utils import AitoolsServiceManager


@pytest.mark.asyncio
async def test_hot_load_callback_restarts_kafka_and_other_services() -> None:
    """Hot-load should use dedicated kafka restart path and generic recreate path."""
    manager = AitoolsServiceManager()

    manager.services = {
        ServiceType.SETTINGS_SERVICE: object(),
        ServiceType.KAFKA_PRODUCER_SERVICE: object(),
        ServiceType.OSS_SERVICE: object(),
    }

    kafka_factory = MagicMock()
    kafka_factory.shutdown = AsyncMock()
    new_kafka_service = object()
    kafka_factory.create = MagicMock(return_value=new_kafka_service)

    manager.factories = {
        ServiceType.KAFKA_PRODUCER_SERVICE: kafka_factory,
    }

    manager._create_service = MagicMock()  # type: ignore[method-assign]

    await manager.hot_load_callback()

    kafka_factory.shutdown.assert_awaited_once()
    kafka_factory.create.assert_called_once()
    assert manager.services[ServiceType.KAFKA_PRODUCER_SERVICE] is new_kafka_service

    # Only OSS service should use generic create path.
    manager._create_service.assert_has_calls(
        [
            call(ServiceType.OSS_SERVICE),
        ],
        any_order=False,
    )

    # Kafka service should not be recreated by generic path again.
    assert (
        call(ServiceType.KAFKA_PRODUCER_SERVICE)
        not in manager._create_service.call_args_list
    )
