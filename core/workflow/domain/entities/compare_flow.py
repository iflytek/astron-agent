"""
Flow comparison domain entities.

This module defines value objects for saving and deleting flow comparisons,
used for workflow version comparison functionality.
"""

from pydantic import BaseModel, Field


class SaveComparisonVo(BaseModel):
    """
    Value object for saving flow comparison data.

    :param flow_id: The workflow ID to compare
    :param data: Comparison data dictionary
    :param version: Version identifier for the comparison
    """

    flow_id: str
    data: dict
    version: str


class DeleteComparisonVo(BaseModel):
    """
    Value object for deleting flow comparison data.

    :param flow_id: The workflow ID
    :param version: Version identifier to delete
    """

    flow_id: str = Field(..., description="Flow ID")
    version: str = Field(..., description="Version")
