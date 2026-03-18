"""Kafka async telemetry module.

Provides a shared async queue + worker pool for sending telemetry data to Kafka.
Extracted from execution_server.py to be reused by management_server.py and
mcp_server.py, replacing their synchronous kafka_service.send() calls.
"""

import os
import queue
import threading
import time

from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.service import get_kafka_producer_service
from loguru import logger
from plugin.link.consts import const

global_kafka_queue: queue.Queue = queue.Queue(maxsize=10000)

KAFKA_MAX_WORKERS = 10
KAFKA_WORKER_TIMEOUT = 30
KAFKA_WATCHDOG_INTERVAL = 5

_worker_threads: list = []
_worker_last_active: list = []
_worker_lock = threading.Lock()


def init_kafka_send_workers() -> None:
    """Initialize Kafka producer workers and start them."""
    for idx in range(KAFKA_MAX_WORKERS):
        thread = threading.Thread(target=_kafka_worker_func, args=(idx,), daemon=True)
        thread.start()
        with _worker_lock:
            _worker_threads.append(thread)
            _worker_last_active.append(time.time())

    watchdog_thread = threading.Thread(target=_kafka_watchdog_func, daemon=True)
    watchdog_thread.start()


def _kafka_worker_func(worker_idx: int) -> None:
    """Kafka worker function."""

    kafka_producer = None
    while True:
        try:
            if not kafka_producer:
                kafka_producer = get_kafka_producer_service()

            with _worker_lock:
                _worker_last_active[worker_idx] = time.time()
            data = global_kafka_queue.get(timeout=1)
            logger.debug(
                f"kafka queue current size:{global_kafka_queue.qsize()}, pop out:{data}"
            )
            kafka_producer.send(os.getenv(const.KAFKA_TOPIC_KEY), data)

        except queue.Empty:
            time.sleep(1)
        except Exception as e:
            logger.error(f"[Worker {worker_idx}] Failed to send data to kafka: {e}")
            kafka_producer = None
        finally:
            continue


def _kafka_watchdog_func() -> None:
    """Watchdog to monitor worker threads and restart if stuck."""

    while True:
        time.sleep(KAFKA_WATCHDOG_INTERVAL)
        now = time.time()

        with _worker_lock:
            for idx, last_active in enumerate(_worker_last_active):
                if now - last_active > KAFKA_WORKER_TIMEOUT:
                    logger.error(f"[Watchdog] Worker {idx} seems stuck, restarting")

                    thread = threading.Thread(
                        target=_kafka_worker_func, args=(idx,), daemon=True
                    )
                    logger.info(f"[Watchdog] Starting worker {idx}")
                    thread.start()
                    _worker_threads[idx] = thread
                    _worker_last_active[idx] = now


def send_telemetry_sync(node_trace: NodeTraceLog) -> None:
    """Send telemetry data to Kafka via the shared queue.

    For use in synchronous contexts (e.g. management_server, mcp_server).
    """
    if os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1":
        node_trace.start_time = int(round(time.time() * 1000))
        try:
            global_kafka_queue.put(node_trace.to_json(), block=False)
            logger.debug(
                f"kafka queue current size:{global_kafka_queue.qsize()}, put in:{node_trace.to_json()}"
            )
        except queue.Full:
            logger.warning("Kafka queue is full, drop telemetry data")
