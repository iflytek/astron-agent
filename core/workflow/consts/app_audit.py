"""
Application audit policy constants.

This module defines the audit policies for applications in the workflow system.
"""

from enum import Enum


class AppAuditPolicy(Enum):
    """
    Application audit policy enumeration.

    Defines different audit strategies for applications in the platform.
    """

    # Default audit policy, platform does not interfere
    DEFAULT = 0
    # Platform audit policy, platform intervenes
    AGENT_PLATFORM = 1
