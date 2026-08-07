"""API package initialization module.

This module defines the public API exports for the package.
The `__all__` variable specifies which symbols are exported
when using 'from api import *'.
"""

from memory.database.exceptions.e import CustomException

__all__ = ["CustomException"]
