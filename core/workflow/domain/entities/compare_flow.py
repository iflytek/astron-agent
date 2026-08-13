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


class ReadComparisonVo(BaseModel):
    """
    Value object for reading one exact flow comparison snapshot.

    ``flow_id`` is the original draft flow ID. It is kept separate from the
    comparison row ID so callers cannot substitute a row from another group.
    """

    flow_id: str = Field(..., min_length=1, description="Original flow ID")
    version: str = Field(..., min_length=1, description="Comparison version")


class DeleteComparisonVo(BaseModel):
    """
    Value object for deleting flow comparison data.

    :param flow_id: The workflow ID
    :param version: Version identifier to delete
    """

    flow_id: str = Field(..., description="Flow ID")
    version: str = Field(..., description="Version")
