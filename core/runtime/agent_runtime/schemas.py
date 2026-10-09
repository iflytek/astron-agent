from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    trace_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class RunCreate(BaseModel):
    conversation_id: str | None = Field(default=None, max_length=256)
    release_version: str | None = Field(default=None, max_length=64)
    input: dict[str, Any]


class RunResume(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: str
    status: str
    release_version: str
    trace_id: str
    result: dict[str, Any] | None = None
    error: ErrorBody | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReleaseCreate(BaseModel):
    agent_id: str = Field(min_length=1, max_length=128)
    space_id: str = Field(min_length=1, max_length=128)
    version: str = Field(min_length=1, max_length=64)
    mode: Literal["chat", "react", "workflow", "plan_execute"]
    snapshot: dict[str, Any]
    is_default: bool = True


class ReleaseResponse(BaseModel):
    release_id: str
    agent_id: str
    space_id: str
    version: str
    mode: str
    status: str
    is_default: bool


class BindingCreate(BaseModel):
    app_id: str = Field(min_length=1, max_length=128)
    agent_id: str = Field(min_length=1, max_length=128)
    space_id: str = Field(min_length=1, max_length=128)
    enabled: bool = True


class BindingResponse(BaseModel):
    binding_id: str
    app_id: str
    agent_id: str
    space_id: str
    enabled: bool


class ApprovalDecision(BaseModel):
    decision: Literal["APPROVED", "REJECTED"]
    reason: str = Field(default="", max_length=1000)
