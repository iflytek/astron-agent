"""
Constants and configuration for iFlytek Spark LLM provider.

This module contains version mappings, API endpoints, and configuration constants
used throughout the Spark LLM integration.
"""

from enum import Enum

# Maximum number of retry attempts for failed requests
RETRY_CNT = 2


class RespFormatEnum(Enum):
    """Response format enumeration for different output types."""

    TEXT = 0
    MARKDOWN = 1
    JSON = 2
