"""Kafka runtime service for producer, queue and worker task lifecycle."""

import asyncio
from typing import Optional, Tuple

from aiokafka import AIOKafkaProducer
from common.service.base import Service, ServiceType
from plugin.aitools.common.log.logger import log


class AioKafkaProducerService(Service):
    """Service responsible for producer/queue/workers lifecycle."""

    name = ServiceType.KAFKA_PRODUCER_SERVICE

    def __init__(
        self,
        *,
        config: dict,
        topic: str,
        retry_interval: int,
        timeout: int,
        queue_max_size: int,
        drain_timeout: int,
        enable: bool = False,
    ) -> None:
        self.config = config
        self.topic = topic
        self.retry_interval = retry_interval
        self.timeout = timeout
        self.queue_max_size = queue_max_size
        self.drain_timeout = drain_timeout

        self.queue: Optional[asyncio.Queue] = None
        self.producer: Optional[AIOKafkaProducer] = None
        self.create_task: Optional[asyncio.Task] = None
        self.send_task: Optional[asyncio.Task] = None
        self._producer_ready_logged = False
        self._producer_missing_warned = False
        self.enable = enable

    async def send_loop(self) -> None:
        """Asynchronously send messages from queue to Kafka."""
        if not self.queue:
            log.error("Kafka queue is not initialized")
            return

        while True:
            if not self.producer:
                if not self._producer_missing_warned:
                    log.warning("Kafka producer is not available, waiting...")
                    self._producer_missing_warned = True
                await asyncio.sleep(self.retry_interval)
                continue

            self._producer_missing_warned = False
            try:
                message = await self.queue.get()
            except asyncio.CancelledError:
                break

            try:
                await asyncio.wait_for(
                    self.producer.send_and_wait(self.topic, message),
                    timeout=self.timeout,
                )
            except asyncio.TimeoutError:
                log.error("Kafka send timeout")
            except Exception as e:
                log.error(f"Kafka send failed: {e}")
            finally:
                self.queue.task_done()

    async def create_loop(self) -> None:
        """Create and keep checking AIOKafkaProducer availability."""
        while True:
            try:
                if not self.producer:
                    self.producer = AIOKafkaProducer(**self.config)
                    await self.producer.start()

                await self.producer.partitions_for(self.topic)
                if not self._producer_ready_logged:
                    log.info(
                        f"Kafka producer connected and topic metadata loaded: {self.topic}"
                    )
                    self._producer_ready_logged = True
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._producer_ready_logged = False
                log.warning(
                    f"Kafka producer initialization failed, retrying in {self.retry_interval} seconds: {e}"
                )
                if self.producer:
                    await self.producer.stop()
                    self.producer = None

            await asyncio.sleep(self.retry_interval)

    async def start(self) -> Tuple[Optional[asyncio.Task], Optional[asyncio.Task]]:
        """Initialize producer tasks."""
        if not self.enable:
            return None, None

        self.queue = asyncio.Queue(maxsize=self.queue_max_size)
        self.create_task = asyncio.create_task(self.create_loop())
        self.send_task = asyncio.create_task(self.send_loop())

        log.info(
            f"Kafka producer tasks started (connection pending):\n"
            f"Kafka servers: {self.config.get('bootstrap_servers', ['localhost:9092'])}\n"
            f"Kafka topic: {self.topic}\n"
            f"Kafka acks: {self.config.get('acks')}\n"
            f"Kafka linger_ms: {self.config.get('linger_ms', 10)}\n"
            f"Kafka timeout: {self.timeout} seconds"
        )
        return self.create_task, self.send_task

    async def stop(
        self,
        *,
        create_producer_task: Optional[asyncio.Task] = None,
        send_task: Optional[asyncio.Task] = None,
    ) -> None:
        """Shutdown producer tasks and close producer."""
        if not self.enable:
            return

        create_task = create_producer_task or self.create_task
        send_worker_task = send_task or self.send_task

        await self._drain_pending_queue(send_worker_task)
        await self._cancel_task(send_worker_task, "Kafka send task cancelled")
        await self._cancel_task(
            create_task,
            "Kafka producer initialization task cancelled",
        )

        if self.producer:
            await self.producer.stop()
            self.producer = None

        self._reset_runtime_state()

    async def _drain_pending_queue(
        self, send_worker_task: Optional[asyncio.Task]
    ) -> None:
        """Drain queue before cancelling worker task."""
        if not self.queue or not send_worker_task:
            return

        try:
            await asyncio.wait_for(self.queue.join(), timeout=self.drain_timeout)
        except asyncio.TimeoutError:
            queue_size = self.queue.qsize()
            log.warning(
                f"Kafka queue drain timed out after {self.drain_timeout}s, dropping {queue_size} pending messages"
            )
            while not self.queue.empty():
                try:
                    self.queue.get_nowait()
                    self.queue.task_done()
                except asyncio.QueueEmpty:
                    break

    @staticmethod
    async def _cancel_task(task: Optional[asyncio.Task], cancel_log: str) -> None:
        """Cancel and await task safely."""
        if not task:
            return

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            log.info(cancel_log)

    def _reset_runtime_state(self) -> None:
        """Reset runtime state after stopping service."""
        self.create_task = None
        self.send_task = None
        self.queue = None
        self._producer_ready_logged = False
        self._producer_missing_warned = False

    def enqueue(self, message: str) -> None:
        """Enqueue telemetry message to Kafka queue."""
        if not self.queue:
            return

        try:
            self.queue.put_nowait(message)
        except asyncio.QueueFull:
            log.warning("Kafka queue is full, drop telemetry data")
