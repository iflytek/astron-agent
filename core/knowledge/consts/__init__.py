# -*- coding: utf-8 -*-
"""
Constants module

Provides constant definitions used in the project, including error codes, service constants, etc.
"""

from .constants import KNOWLEDGE_SERVICE_NAME
from .error_code import CodeEnum

__all__ = [
    "KNOWLEDGE_SERVICE_NAME",
    "CodeEnum",
]
