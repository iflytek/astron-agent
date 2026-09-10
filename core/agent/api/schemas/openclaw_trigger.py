"""Schemas for controlled OpenClaw-to-Astron workflow triggers."""

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class OpenClawTriggerInputs(BaseModel):
    """Webhook payload accepted from an OpenClaw trigger."""

    trigger_id: str = Field(..., min_length=1, max_length=128)
    workflow_id: str = Field(..., min_length=1, max_length=128)
    operator_uid: str = Field(..., min_length=1, max_length=64)
    scenario: str = Field(..., min_length=1, max_length=128)
    action: str = Field(..., min_length=1, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)
    safety_level: Literal["low", "medium", "high"] = "high"
    approval_required: bool = True
    idempotency_key: str = Field(default="", max_length=128)
    audit_tags: list[str] = Field(default_factory=list)

    @field_validator("audit_tags")
    @classmethod
    def limit_audit_tags(cls, value: list[str]) -> list[str]:
        """Keep audit metadata bounded for logs and traces."""

        if len(value) > 16:
            raise ValueError("audit_tags cannot contain more than 16 items")
        return value


class OpenClawTriggerAuditEvent(BaseModel):
    """Audit record returned and logged for each trigger request."""

    event_id: str
    trigger_id: str
    workflow_id: str
    operator_uid: str
    scenario: str
    action: str
    safety_level: str
    approval_required: bool
    auth_mode: str
    status: str
    audit_tags: list[str] = Field(default_factory=list)


class OpenClawTriggerResponse(BaseModel):
    """Response for a controlled OpenClaw trigger request."""

    code: int = 0
    message: str = "success"
    status: Literal["pending_approval", "accepted"]
    audit_event: OpenClawTriggerAuditEvent
    dispatch_payload: dict[str, Any]
