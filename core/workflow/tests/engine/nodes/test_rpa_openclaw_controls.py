from typing import Any

import pytest

from workflow.engine.nodes.entities.node_run_result import WorkflowNodeExecutionStatus
from workflow.engine.nodes.rpa.rpa_node import RPANode
from workflow.exception.e import CustomException


class DummySpan:
    sid = "sid-1"

    def __init__(self) -> None:
        self.events: list[Any] = []

    async def add_info_event_async(self, event: Any) -> None:
        self.events.append(event)

    async def add_info_events_async(self, event: Any) -> None:
        self.events.append(event)

    def record_exception(self, _error: Any) -> None:
        return None


class DummyVariablePool:
    def get_variable(self, node_id: str, key_name: str, span: DummySpan) -> Any:
        values = {
            "trigger_id": "trigger-1",
            "amount": 1200,
            "trigger_signature": "do-not-log",
        }
        return values[key_name]


def build_rpa_node(**overrides: Any) -> RPANode:
    payload: dict[str, Any] = {
        "node_id": "rpa::node-1",
        "alias_name": "Controlled RPA",
        "node_type": "rpa",
        "input_identifier": ["trigger_id", "amount", "trigger_signature"],
        "output_identifier": ["status", "message", "audit"],
        "projectId": "expense-bot",
        "header": {"apiKey": "rpa-api-key"},
        "triggerSource": "openclaw",
        "scenario": "financial_reimbursement",
        "allowedScenarios": ["financial_reimbursement"],
        "riskLevel": "high",
    }
    payload.update(overrides)
    return RPANode(**payload)


def test_openclaw_signature_payload_excludes_signature() -> None:
    node = build_rpa_node(triggerAuthRequired=True)
    inputs = {
        "trigger_id": "trigger-1",
        "amount": 1200,
        "trigger_signature": "do-not-forward",
    }

    payload = node.build_openclaw_signature_payload(inputs)
    audit = node.build_openclaw_audit_event(inputs, "approved")

    assert "do-not-forward" not in payload
    assert "trigger_signature" not in audit["input_keys"]
    assert audit["event"] == "openclaw_rpa_trigger"


def test_openclaw_control_enabled_handles_null_trigger_source() -> None:
    node = build_rpa_node(allowedScenarios=[])
    node.triggerSource = None

    assert node.openclaw_control_enabled() is False


@pytest.mark.asyncio
async def test_openclaw_requires_valid_trigger_signature(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = build_rpa_node(triggerAuthRequired=True)
    inputs = {
        "trigger_id": "trigger-1",
        "amount": 1200,
        "trigger_signature": "invalid",
    }
    monkeypatch.setenv("OPENCLAW_RPA_TRIGGER_SECRET", "secret")

    with pytest.raises(CustomException, match="signature is invalid"):
        await node.evaluate_openclaw_controls(inputs, DummySpan())


@pytest.mark.asyncio
async def test_openclaw_rejects_empty_trigger_secret_env() -> None:
    node = build_rpa_node(triggerAuthRequired=True, triggerSecretEnv="")

    with pytest.raises(CustomException, match="secret env cannot be empty"):
        await node.evaluate_openclaw_controls(
            {"trigger_id": "trigger-1", "trigger_signature": "signature"}, DummySpan()
        )


@pytest.mark.asyncio
async def test_openclaw_requires_declared_trigger_signature_input() -> None:
    node = build_rpa_node(triggerAuthRequired=True)

    with pytest.raises(CustomException, match="signature input trigger_signature"):
        await node.evaluate_openclaw_controls({"trigger_id": "trigger-1"}, DummySpan())


@pytest.mark.asyncio
async def test_openclaw_waits_for_human_approval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = build_rpa_node(
        triggerAuthRequired=True,
        approvalRequired=True,
        approvalStatus="pending",
    )
    inputs = {"trigger_id": "trigger-1", "amount": 1200}
    inputs["trigger_signature"] = node.build_openclaw_signature(inputs, "secret")
    monkeypatch.setenv("OPENCLAW_RPA_TRIGGER_SECRET", "secret")

    result = await node.evaluate_openclaw_controls(inputs, DummySpan())

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.inputs == {"trigger_id": "trigger-1", "amount": 1200}
    assert result.outputs["status"] == "approval_required"
    assert result.outputs["audit"]["decision"] == "approval_required"


@pytest.mark.asyncio
async def test_openclaw_handles_empty_approval_status() -> None:
    node = build_rpa_node(approvalRequired=True)
    node.approvalStatus = None

    result = await node.evaluate_openclaw_controls(
        {"trigger_id": "trigger-1", "amount": 1200}, DummySpan()
    )

    assert result.outputs["status"] == "approval_required"


@pytest.mark.asyncio
async def test_openclaw_execute_masks_signature_before_tracing_inputs() -> None:
    node = build_rpa_node(approvalRequired=True, approvalStatus="pending")
    span = DummySpan()

    result = await node.execute(DummyVariablePool(), span)

    assert result.outputs["status"] == "approval_required"
    assert not any("do-not-log" in str(event) for event in span.events)


@pytest.mark.asyncio
async def test_openclaw_approved_trigger_returns_audit_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = build_rpa_node(
        triggerAuthRequired=True,
        approvalRequired=True,
        approvalStatus="approved",
        approver="finance-lead",
    )
    inputs = {"trigger_id": "trigger-1", "amount": 1200}
    inputs["trigger_signature"] = node.build_openclaw_signature(inputs, "secret")
    monkeypatch.setenv("OPENCLAW_RPA_TRIGGER_SECRET", "secret")

    audit = await node.evaluate_openclaw_controls(inputs, DummySpan())

    assert audit["decision"] == "approved"
    assert audit["approver"] == "finance-lead"
    assert audit["scenario"] == "financial_reimbursement"


@pytest.mark.asyncio
async def test_openclaw_denies_unlisted_scenario() -> None:
    node = build_rpa_node(
        scenario="contract_update",
        allowedScenarios=["financial_reimbursement"],
    )

    with pytest.raises(CustomException, match="is not allowed"):
        await node.evaluate_openclaw_controls({"trigger_id": "trigger-1"}, DummySpan())
