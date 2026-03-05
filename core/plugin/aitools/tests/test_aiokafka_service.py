"""Unit tests for aiokafka_service module."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from plugin.aitools.utils.aiokafka_service import AioKafkaProducerService


@pytest.mark.asyncio
async def test_start_disabled_returns_none_tasks() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=1,
        timeout=1,
        queue_max_size=10,
        drain_timeout=1,
        enable=False,
    )

    create_task, send_task = await service.start()
    assert create_task is None
    assert send_task is None


@pytest.mark.asyncio
async def test_start_enabled_creates_worker_tasks_and_queue() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=1,
        timeout=1,
        queue_max_size=10,
        drain_timeout=1,
        enable=True,
    )

    create_task, send_task = await service.start()
    assert isinstance(create_task, asyncio.Task)
    assert isinstance(send_task, asyncio.Task)
    assert service.queue is not None

    await service.stop()


@pytest.mark.asyncio
async def test_enqueue_puts_message() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=1,
        timeout=1,
        queue_max_size=2,
        drain_timeout=1,
        enable=True,
    )
    service.queue = asyncio.Queue(maxsize=2)

    service.enqueue("payload")
    queued = await service.queue.get()
    assert queued == "payload"


@pytest.mark.asyncio
async def test_enqueue_queue_full_no_raise() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=1,
        timeout=1,
        queue_max_size=1,
        drain_timeout=1,
        enable=True,
    )
    service.queue = asyncio.Queue(maxsize=1)
    await service.queue.put("first")

    # should not raise
    service.enqueue("second")


@pytest.mark.asyncio
async def test_stop_cancels_tasks_and_stops_producer() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=1,
        timeout=1,
        queue_max_size=10,
        drain_timeout=1,
        enable=True,
    )

    service.queue = asyncio.Queue()
    service.create_task = asyncio.create_task(asyncio.sleep(10))
    service.send_task = asyncio.create_task(asyncio.sleep(10))

    producer = AsyncMock()
    service.producer = producer

    await service.stop()

    assert service.create_task is None
    assert service.send_task is None
    assert service.queue is None
    producer.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_loop_sends_message_with_producer() -> None:
    service = AioKafkaProducerService(
        config={},
        topic="test",
        retry_interval=0,
        timeout=1,
        queue_max_size=10,
        drain_timeout=1,
        enable=True,
    )

    service.queue = asyncio.Queue()
    await service.queue.put("payload")

    producer = AsyncMock()
    service.producer = producer

    task = asyncio.create_task(service.send_loop())
    await asyncio.wait_for(service.queue.join(), timeout=1)
    task.cancel()
    await task
    assert task.done()

    producer.send_and_wait.assert_awaited_once_with("test", "payload")


@pytest.mark.asyncio
async def test_create_loop_initializes_producer_once() -> None:
    service = AioKafkaProducerService(
        config={"bootstrap_servers": ["localhost:9092"]},
        topic="test",
        retry_interval=0,
        timeout=1,
        queue_max_size=10,
        drain_timeout=1,
        enable=True,
    )

    producer = AsyncMock()
    producer.partitions_for.side_effect = [set([0]), asyncio.CancelledError()]

    # monkeypatch class constructor on module symbol
    from plugin.aitools.utils import aiokafka_service as module

    original = module.AIOKafkaProducer
    module.AIOKafkaProducer = MagicMock(return_value=producer)  # type: ignore[assignment]
    try:
        await service.create_loop()
    finally:
        module.AIOKafkaProducer = original  # type: ignore[assignment]

    producer.start.assert_awaited_once()
