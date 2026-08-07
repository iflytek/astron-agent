"""
Error-handling constants.

This module defines the strategies that can be chosen when an error
occurs during workflow execution.
"""

from enum import Enum


class ErrorHandler(Enum):
    """
    Error handling strategy enumeration.

    Defines different approaches for handling errors in workflow execution.
    """

    Interrupted = 0
    CustomReturn = 1
    FailBranch = 2
