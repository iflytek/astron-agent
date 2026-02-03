"""
Workflow domain entities for flow management.

This module defines data models for workflow operations including reading,
updating, publishing, and authentication of workflows.
"""

from typing import Dict, Optional

from pydantic import BaseModel, Field

from workflow.engine.entities.workflow_dsl import WorkflowDSL


class FlowRead(BaseModel):
    """
    Value object for reading workflow data.

    :param flow_id: The workflow ID
    :param app_id: Optional application ID
    """

    flow_id: str = Field(..., description="Flow ID")
    app_id: str | None = Field(default=None, description="Optional app ID")


class FlowUpdate(BaseModel):
    """
    Value object for updating workflow data.

    :param id: Workflow ID
    :param name: Workflow name
    :param description: Workflow description
    :param data: Workflow data dictionary
    :param app_id: Application ID
    """

    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    data: Optional[Dict] = None
    app_id: Optional[str] = None


class Edge(BaseModel):
    """
    Represents a connection between two nodes in a workflow.

    :param sourceNodeId: The ID of the source node
    :param targetNodeId: The ID of the target node
    :param sourceHandle: The handle of the source node
    """

    sourceNodeId: str = Field(..., description="The ID of the source node")
    targetNodeId: str = Field(..., description="The ID of the target node")
    sourceHandle: str = Field(None, description="The handle of the source node")


class WorkflowData(BaseModel):
    """
    Complete workflow data structure.

    :param id: Unique identifier for the workflow
    :param name: Name of the workflow
    :param description: Description of the workflow
    :param version: Version of the workflow (must match v3.x.x pattern)
    :param data: Workflow structure data
    """

    id: str = Field(..., min_length=1, description="Unique identifier for the workflow")
    name: str = Field(..., min_length=1, description="Name of the workflow")
    description: str = Field(None, description="Description of the workflow")
    version: str = Field(
        ..., pattern=r"^v3(\.\d+)*(\.\d+)$", description="Version of the workflow"
    )
    data: WorkflowDSL = Field(..., description="Workflow data")


class PublishInput(BaseModel):
    """
    Input data for publishing a workflow.

    :param flow_id: The workflow ID to publish
    :param release_status: Release status code
    :param data: Optional workflow data
    :param plat: Platform identifier (defaults to 0)
    :param version: Version string (defaults to empty)
    """

    # TODO: Nested data structure needs optimization
    flow_id: str = Field(..., description="Flow ID")
    release_status: int = Field(..., description="Release status")
    data: Optional[WorkflowData] = Field(None, description="Data")
    plat: Optional[int] = Field(0, description="Platform")
    version: Optional[str] = Field("", description="Version")


class AuthInput(BaseModel):
    """
    Input data for workflow authentication.

    :param flow_id: The workflow ID
    :param app_id: The application ID
    """

    flow_id: str = Field(..., description="Flow ID")
    app_id: str = Field(..., description="App ID")
