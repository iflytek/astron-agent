import multiprocessing
import os

from loguru import logger


def get_worker_count() -> int:
    """
    Get the number of workers to use for the application.
    """
    worker_count: int = int(os.getenv("WORKERS", "0"))
    if worker_count == 0:
        worker_count = multiprocessing.cpu_count() + 1
    logger.debug(f"🔍 Worker count: {worker_count}")
    return worker_count


worker_count = get_worker_count()
