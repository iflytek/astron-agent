"""Tests for OpenClaw controlled trigger intake."""

import hashlib
import hmac
import json

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from agent.api.schemas.openclaw_trigger import OpenClawTriggerInputs
from agent.api.v1.openclaw_trigger import openclaw_trigger_router
from agent.service.openclaw_trigger import build_dispatch_payload


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "trigger_id": "oc-001",
        "workflow_id": "finance-reimbursement-rpa",
        "operator_uid": "alice",
        "scenario": "finance-reimbursement",
        "action": "submit-reimbursement",
        "payload": {"amount": 128.5, "currency": "CNY"},
        "safety_level": "high",
        "approval_required": True,
        "audit_tags": ["openclaw", "rpa"],
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(openclaw_trigger_router)
    return test_app


@pytest.mark.asyncio
async def test_high_risk_trigger_defaults_to_pending_approval(
    app: FastAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENCLAW_ALLOW_UNSIGNED_DEV", "true")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/openclaw/triggers/workflows", json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending_approval"
    assert body["audit_event"]["approval_required"] is True
    assert body["audit_event"]["auth_mode"] == "unsigned-dev"
    assert body["dispatch_payload"]["plugin"]["workflow_ids"] == [
        "finance-reimbursement-rpa"
    ]


@pytest.mark.asyncio
async def test_low_risk_trigger_can_be_accepted(
    app: FastAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENCLAW_ALLOW_UNSIGNED_DEV", "true")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/openclaw/triggers/workflows",
            json=_payload(safety_level="low", approval_required=False),
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["audit_event"]["status"] == "accepted"


@pytest.mark.asyncio
async def test_hmac_signature_is_required_when_secret_configured(
    app: FastAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENCLAW_WEBHOOK_SECRET", "secret")
    raw_body = json.dumps(_payload()).encode("utf-8")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unsigned = await client.post(
            "/openclaw/triggers/workflows",
            content=raw_body,
            headers={"content-type": "application/json"},
        )
        digest = hmac.new(b"secret", raw_body, hashlib.sha256).hexdigest()
        signed = await client.post(
            "/openclaw/triggers/workflows",
            content=raw_body,
            headers={
                "content-type": "application/json",
                "x-openclaw-signature": f"sha256={digest}",
            },
        )

    assert unsigned.status_code == 401
    assert signed.status_code == 200
    assert signed.json()["audit_event"]["auth_mode"] == "hmac-sha256"


@pytest.mark.asyncio
async def test_malformed_utf8_body_returns_422(
    app: FastAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENCLAW_ALLOW_UNSIGNED_DEV", "true")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/openclaw/triggers/workflows",
            content=b"\xff",
            headers={"content-type": "application/json"},
        )

    assert response.status_code == 422
    assert response.json()["code"] == 422


def test_dispatch_payload_preserves_audit_context() -> None:
    inputs = OpenClawTriggerInputs.model_validate(_payload(idempotency_key="idem-1"))

    dispatch_payload = build_dispatch_payload(inputs)

    assert dispatch_payload["uid"] == "alice"
    assert dispatch_payload["meta_data"]["caller"] == "openclaw_trigger"
    assert dispatch_payload["meta_data"]["caller_sid"] == "oc-001"
    assert dispatch_payload["openclaw_context"]["idempotency_key"] == "idem-1"
