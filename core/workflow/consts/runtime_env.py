"""
Runtime environment constants.

This module defines the different runtime environments available
for the workflow system deployment and execution.
"""

from enum import Enum


class RuntimeEnv(Enum):
    """
    Runtime environment enumeration.

    Defines the different environments where the workflow system can be deployed.
    """

    Prod = "prod"
    Dev = "dev"
    Test = "test"
    Local = "local"
