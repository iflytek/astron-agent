"""
Audit system enumerations and status definitions.

This module defines the enumeration types used throughout the audit system
for representing different states and statuses of audit operations.
"""

from enum import Enum


class Status(str, Enum):
    """
    Audit status enumeration for frame audit operations.

    This enumeration defines the possible states that a frame audit operation
    can be in during the content processing pipeline.
    """

    NONE = "none"  # No audit status - initial state
    STOP = "stop"  # Audit stopped - processing halted
