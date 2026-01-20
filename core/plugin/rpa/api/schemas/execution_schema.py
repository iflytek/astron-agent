"""DTO definition module for RPA execution requests and responses.
This module defines data transfer objects (DTOs) related to RPA execution requests and responses.
"""

from typing import Any, Dict, Optional

from pydantic import BaseModel


class RPAExecutionRequest(BaseModel):
    """DTO definition for RPA execution request."""

    sid: Optional[str] = ""
    project_id: str
    version: Optional[int] = None
    phone_number: Optional[str] = None
    exec_position: Optional[str] = "EXECUTOR"
    params: Optional[Dict[Any, Any]] = None


class RPAExecutionResponse(BaseModel):
    """DTO definition for RPA execution response."""

    code: int
    message: str
    sid: Optional[str] = ""
    data: Optional[Dict[Any, Any]] = None
