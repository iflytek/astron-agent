"""
Chat status constants.

This module defines the execution-state constants used to track
a chat interaction’s life-cycle inside the workflow engine.
"""

from enum import Enum


class ChatStatus(Enum):
    """
    Chat status enumeration.

    Tracks the execution state of chat operations.
    """

    PING = "ping"
    RUNNING = "running"
    INTERRUPT = "interrupt"
    FINISH_REASON = "stop"


class SparkLLMStatus(Enum):
    """
    XFLLM (Xinghuo Large Language Model) execution status enumeration.

    Tracks the execution state of LLM operations.
    """

    START = 0
    RUNNING = 1
    END = 2
