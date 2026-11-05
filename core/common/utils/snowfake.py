"""
Snowflake ID generator utility for generating unique identifiers.

This module provides a simple interface for generating unique IDs using the
Snowflake algorithm, which ensures globally unique identifiers across
distributed systems.
"""

import threading
import time

from snowflake import SnowflakeGenerator  # type: ignore

# Initialize snowflake generator with a unique worker ID
t = time.time()
work_id = int(round(t * 1000)) % 1024  # Generate worker ID from current timestamp
gen = SnowflakeGenerator(work_id)
lock = threading.Lock()
_MAX_WAIT_SECONDS = 1.0
_RETRY_INTERVAL_SECONDS = 0.001


def get_id() -> int:
    """
    Generate a unique snowflake ID.

    :return: Unique snowflake ID as integer
    :raises TimeoutError: If the clock cannot produce an ID within one second.
    """
    with lock:
        snowflake_id = next(gen)
        if snowflake_id is not None:
            return snowflake_id

        # The SDK returns None on sequence exhaustion or a backward clock jump.
        # Keep its state and wait for a usable timestamp, bounded independently
        # of the wall clock so a prolonged rollback cannot block indefinitely.
        deadline = time.monotonic() + _MAX_WAIT_SECONDS
        while snowflake_id is None:
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    "Snowflake ID generation timed out after one second; "
                    "the system clock has not advanced sufficiently"
                )
            time.sleep(_RETRY_INTERVAL_SECONDS)
            snowflake_id = next(gen)
        return snowflake_id
