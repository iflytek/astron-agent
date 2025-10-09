"""Thread-safe atomic counter for telemetry metrics.

Provides atomic operations for counting telemetry events in multi-threaded environments.
"""

import threading


class AtomicCounter:
    """Thread-safe atomic counter for tracking telemetry metrics.

    Provides atomic increment operations with thread-safety using locks.
    Used for counting events like errors, requests, and other telemetry data.
    """

    def __init__(self) -> None:
        self.value = 0
        self.lock = threading.Lock()

    def increment(self) -> None:
        """Atomically increment the counter value by 1.

        Thread-safe operation that increments the counter value.
        Used for tracking telemetry event counts.
        """
        with self.lock:
            self.value += 1
