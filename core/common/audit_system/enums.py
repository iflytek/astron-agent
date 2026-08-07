"""
enums.py
"""

from enum import Enum


class Status(str, Enum):
    """
    Status enum
    """

    NONE = "none"
    STOP = "stop"
