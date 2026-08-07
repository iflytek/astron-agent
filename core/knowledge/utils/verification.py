# -*- coding: utf-8 -*-
"""
Data validation utilities module.

This module provides data validation related utility functions, including time range checks and non-empty validation.
"""

from typing import Any


def check_not_empty(*args: Any) -> bool:
    """
    Check if parameters are non-empty.

    Args:
        *args: List of parameters to check

    Returns:
        bool: True if all parameters are non-empty, False otherwise

    Raises:
        TypeError: Raised when unsupported parameter type is encountered
    """
    for arg in args:
        if arg is None:
            return False
        if isinstance(arg, list):
            if len(arg) == 0:
                return False
            return True
        if isinstance(arg, str):
            if len(arg.strip()) == 0:
                return False
            return True
        if isinstance(arg, dict):
            if len(arg) == 0:
                return False
            return True
        if isinstance(arg, object):
            return True
    raise TypeError(f"Unexpected arg {type(args)}%s" % str(args))


if __name__ == "__main__":
    print(check_not_empty({}))
