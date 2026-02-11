"""
OTLP utils module for generating OTLP spans and sending them to the collector.
"""

import json
import multiprocessing
import os
import queue
import threading
import time
from multiprocessing import Array as mp_array
from multiprocessing import Event
from multiprocessing.synchronize import Event as mp_event
from typing import Any, List, Optional, cast

from common.otlp.log_trace.node_trace_log import NodeTraceLog, Status
from common.otlp.metrics.meter import Meter
from common.otlp.trace.span import SPAN_SIZE_LIMIT
from common.service import get_kafka_producer_service
from common.service.kafka.kafka_service import KafkaProducerService
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.log.logger import log
from plugin.aitools.const import const

global_kafka_queue: multiprocessing.Queue = multiprocessing.Queue(maxsize=10000)
stop_event = Event()

SENTINEL = "__STOP__"
KAFKA_MAX_WORKERS = 3
KAFKA_WORKER_TIMEOUT = 30
KAFKA_WATCHDOG_INTERVAL = 5

_worker_heartbeats = mp_array("d", KAFKA_MAX_WORKERS)
_worker_processes: List[multiprocessing.Process] = []
_worker_lock = threading.Lock()


def update_span(response: BaseResponse, span: Optional[SpanLike] = None) -> None:
    """Update span with response details"""
    # Add response details to span
    if not span:
        return

    span.set_attribute("error.code", response.code)

    # Set status based on response code
    if isinstance(response, SuccessResponse):
        if response.data:
            response_data_str = json.dumps(response.data, ensure_ascii=False)
            if len(response_data_str) >= SPAN_SIZE_LIMIT:
                response_data_str = f"{response_data_str[:SPAN_SIZE_LIMIT // 2]}...{len(response_data_str) - SPAN_SIZE_LIMIT // 2}"
            span.add_info_events({"RESPONSE DATA": response_data_str})
        else:
            span.add_info_event("Empty response data")
    else:
        span.add_error_events({"ERROR MESSAGE": response.message})


def upload_trace(
    response: BaseResponse, meter: Meter | None, node_trace: NodeTraceLog | None
) -> None:
    """Upload node trace and meter data"""
    global global_kafka_queue

    if not meter or not node_trace:
        return

    if isinstance(response, SuccessResponse):
        meter.in_success_count()
        node_trace.answer = json.dumps(response.data, ensure_ascii=False)
    else:
        meter.in_error_count(response.code)
        node_trace.answer = response.message

    node_trace.status = Status(code=response.code, message=response.message)

    try:
        # log.debug(f"Current kafka queue size: {global_kafka_queue.qsize()}")
        global_kafka_queue.put(node_trace.to_json(), block=False)
    except queue.Full:
        # TODO: Handle queue full exception, maybe write into local file or database.
        log.debug("Kafka queue is full, drop telemetry data")


def init_kafka_send_workers() -> None:
    """Initialize Kafka producer workers (multiprocessing)"""
    global _worker_processes, _worker_heartbeats, global_kafka_queue, stop_event
    log.info("Initializing kafka workers...")

    for idx in range(KAFKA_MAX_WORKERS):
        p = multiprocessing.Process(
            target=_kafka_worker_process,
            args=(idx, global_kafka_queue, _worker_heartbeats, stop_event),
            daemon=True,
            name=f"kafka_worker_{idx}",
        )

        with _worker_lock:
            _worker_processes.append(p)
            _worker_heartbeats[idx] = time.time()

        p.start()

        time.sleep(0.1)

    watchdog_thread = threading.Thread(
        target=_kafka_watchdog_func,
        daemon=True,
    )
    watchdog_thread.start()

    log.info("Kafka workers initialized")


def shutdown_kafka_workers() -> None:
    """Shutdown Kafka producer workers (multiprocessing)"""
    global _worker_processes, _worker_heartbeats, global_kafka_queue, stop_event
    log.info("Shutting down kafka workers...")

    stop_event.set()

    # unblock all workers
    for _ in _worker_processes:
        try:
            global_kafka_queue.put_nowait(SENTINEL)
        except queue.Full:
            pass

    for p in _worker_processes:
        p.join(timeout=5)
        if p.is_alive():
            log.error(f"Worker {p.name} did not exit")
    log.info("Kafka workers shut down")


def _kafka_worker_process(
    worker_idx: int,
    data_queue: multiprocessing.Queue,
    heartbeats: Any,
    stop_event: mp_event,
) -> None:
    """Kafka worker process"""
    kafka_producer: Optional[KafkaProducerService] = None
    kafka_topic = os.getenv(const.KAFKA_TOPIC_KEY, "")

    while not stop_event.is_set():
        try:
            if not kafka_producer:
                kafka_producer = cast(
                    KafkaProducerService, get_kafka_producer_service()
                )

            heartbeats[worker_idx] = time.time()

            data = data_queue.get(timeout=1)
            if data == SENTINEL:
                break
            kafka_producer.send(kafka_topic, data)
        except queue.Empty:
            continue
        except Exception as e:
            log.error(f"[Worker {worker_idx}] Failed to send data to kafka: {e}")
            kafka_producer = None


def _kafka_watchdog_func() -> None:
    """Watchdog running in main process"""
    global _worker_processes, _worker_heartbeats, global_kafka_queue, stop_event
    while not stop_event.is_set():
        time.sleep(KAFKA_WATCHDOG_INTERVAL)
        now = time.time()

        with _worker_lock:
            for idx, old_proc in enumerate(_worker_processes):
                last_hearbeat = _worker_heartbeats[idx]
                if now - last_hearbeat > KAFKA_WORKER_TIMEOUT:
                    log.error(f"[Watchdog] Worker {idx} stuck, restarting process")

                    if old_proc.is_alive():
                        old_proc.kill()
                        old_proc.join(timeout=5)
                        # TODO: When old_proc join failed,
                        # which means the process maybe stuck in D state or internal kernel.
                        # Maybe we should not start a new process,
                        # instead, we should wait for the old process to exit,
                        # or kill the main process to restart the whole service.
                        if old_proc.is_alive():
                            log.error(f"[Watchdog] Failed to kill worker {idx}")

                    new_proc = multiprocessing.Process(
                        target=_kafka_worker_process,
                        args=(idx, global_kafka_queue, _worker_heartbeats),
                        daemon=True,
                        name=f"kafka_worker_{idx}",
                    )

                    _worker_processes[idx] = new_proc
                    _worker_heartbeats[idx] = now

                    new_proc.start()
                    log.info(f"[Watchdog] Worker {idx} restarted")
