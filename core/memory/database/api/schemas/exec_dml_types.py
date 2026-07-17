"""DML Execution Schema Definitions.

This module contains the Pydantic model for validating DML (Data Manipulation Language)
execution requests. It defines the required and optional fields with their constraints
for executing database modification operations.
"""

from typing import Any, Dict, Literal, Optional

from memory.database.api.schemas.common_types import DidUidCommon
from pydantic import Field


class ExecDMLInput(DidUidCommon):  # pylint: disable=too-few-public-methods
    """Input validation model for executing DML statements.

    Attributes:
        app_id (str): Application ID (required, no Chinese/special characters)
        database_id (int): Target database ID (required)
        uid (str): User ID (required, 1-64 chars, no Chinese/special characters)
        dml (str): DML statement to execute (required)
        params (Dict[str, Any]): SQL binding parameters (optional)
        env (Literal["prod", "test"]): Environment (required, either 'prod' or 'test')
        space_id (Optional[str]): Team space ID (optional)
    """

    # app_id: Required, cannot contain Chinese and special characters
    app_id: str = Field(
        ...,
        min_length=1,
        pattern=r"^$|^[^！@#￥%……&*()\u4e00-\u9fa5]+$",
        description="Required, cannot contain Chinese and special symbols！@#￥%……&*()",
    )
    # dml: Required
    dml: str = Field(..., min_length=1, description="Required, minimum length 1")
    # params: Optional SQL bind parameters
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional SQL binding parameters for the DML statement",
    )
    # env: Required, can only be prod or test
    env: Literal["prod", "test"] = Field(
        ..., description="Required, can only be prod or test"
    )
    # space_id: Optional
    space_id: Optional[str] = Field(default="", description="Team space ID")
