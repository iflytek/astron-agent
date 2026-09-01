"""OpenClaw trigger intake service.

The service intentionally separates intake, audit, and dispatch planning. High
risk RPA scenarios default to human approval instead of direct execution.
"""

import hashlib
import hmac
import os
from typing import Any
from uuid import uuid4

from loguru import logger

from agent.api.schemas.openclaw_trigger import (
    OpenClawTriggerAuditEvent,
    OpenClawTriggerInputs,
    OpenClawTriggerResponse,
)

SIGNATURE_HEADER_PREFIX = "sha256="


class OpenClawSignatureError(ValueError):
    """Raised when the OpenClaw webhook signature is missing or invalid."""


def verify_openclaw_signature(raw_body: bytes, signature: str | None) -> str:
    """Verify optional HMAC-SHA256 signature for OpenClaw webhooks.

    If OPENCLAW_WEBHOOK_SECRET is not configured, unsigned requests are allowed
    only when OPENCLAW_ALLOW_UNSIGNED_DEV=true is set for local development.
    """

    secret = os.getenv("OPENCLAW_WEBHOOK_SECRET", "")
    if not secret:
        if os.getenv("OPENCLAW_ALLOW_UNSIGNED_DEV", "").lower() == "true":
            return "unsigned-dev"
        raise OpenClawSignatureError("OPENCLAW_WEBHOOK_SECRET is not configured")
    if not signature:
        raise OpenClawSignatureError("missing OpenClaw signature")

    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    expected = f"{SIGNATURE_HEADER_PREFIX}{digest}"
    if not hmac.compare_digest(signature, expected):
        raise OpenClawSignatureError("invalid OpenClaw signature")
    return "hmac-sha256"


def build_dispatch_payload(inputs: OpenClawTriggerInputs) -> dict[str, Any]:
    """Build the workflow-agent request body for the accepted trigger."""

    prompt = (
        f"OpenClaw triggered controlled action `{inputs.action}` for scenario "
        f"`{inputs.scenario}`. Execute only the configured workflow and preserve "
        "the supplied audit context."
    )
    return {
        "uid": inputs.operator_uid,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "model_config": {"domain": "", "api": "", "provider": "", "api_key": ""},
        "plugin": {"workflow_ids": [inputs.workflow_id]},
        "max_loop_count": 1,
        "meta_data": {
            "caller": "openclaw_trigger",
            "caller_sid": inputs.trigger_id,
            "workflow_id": inputs.workflow_id,
        },
        "openclaw_context": {
            "trigger_id": inputs.trigger_id,
            "scenario": inputs.scenario,
            "action": inputs.action,
            "payload": inputs.payload,
            "idempotency_key": inputs.idempotency_key,
        },
    }


def create_openclaw_trigger_response(
    inputs: OpenClawTriggerInputs, auth_mode: str
) -> OpenClawTriggerResponse:
    """Create an auditable response and dispatch plan for an OpenClaw trigger."""

    requires_approval = inputs.approval_required or inputs.safety_level == "high"
    status = "pending_approval" if requires_approval else "accepted"
    audit_event = OpenClawTriggerAuditEvent(
        event_id=f"openclaw-{uuid4()}",
        trigger_id=inputs.trigger_id,
        workflow_id=inputs.workflow_id,
        operator_uid=inputs.operator_uid,
        scenario=inputs.scenario,
        action=inputs.action,
        safety_level=inputs.safety_level,
        approval_required=requires_approval,
        auth_mode=auth_mode,
        status=status,
        audit_tags=inputs.audit_tags,
    )
    logger.bind(openclaw_audit=True).info(audit_event.model_dump())
    return OpenClawTriggerResponse(
        status=status,
        audit_event=audit_event,
        dispatch_payload=build_dispatch_payload(inputs),
    )
