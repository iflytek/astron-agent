from enum import Enum


class QueueTimeout(Enum):
    AsyncQT = 600
    # Keep the SSE connection active before the 30-second proxy idle boundary.
    PingQT = 15
