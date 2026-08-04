import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from agent.api.schemas.agent_event import (
    AgentEventBase,
    agent_event_v1_json_schema,
    validate_agent_event_v1,
)


CONTRACT_PATH = (
    Path(__file__).resolve().parents[3]
    / "docs/contracts/agent-event-protocol-v1.schema.json"
)


def event_fixtures() -> list[dict[str, object]]:
    base = {"version": 1, "runId": "run-1"}
    return [
        {**base, "seq": 1, "type": "execution_start", "startedAt": 100},
        {
            **base,
            "seq": 2,
            "type": "segment_start",
            "turnId": "turn-1",
            "segmentId": "segment-1",
            "source": "text",
            "channel": "pending",
            "visibility": "user",
        },
        {
            **base,
            "seq": 3,
            "type": "segment_delta",
            "turnId": "turn-1",
            "segmentId": "segment-1",
            "delta": "Checking",
        },
        {
            **base,
            "seq": 4,
            "type": "segment_end",
            "turnId": "turn-1",
            "segmentId": "segment-1",
        },
        {
            **base,
            "seq": 5,
            "type": "turn_commit",
            "turnId": "turn-1",
            "channel": "reasoning",
            "partial": False,
            "reason": "tool_call",
        },
        {
            **base,
            "seq": 6,
            "type": "tool_start",
            "turnId": "turn-1",
            "callId": "call-1",
            "name": "lookup",
            "arguments": {"id": "7"},
            "status": "running",
            "startedAt": 110,
        },
        {
            **base,
            "seq": 7,
            "type": "tool_progress",
            "turnId": "turn-1",
            "callId": "call-1",
            "summary": "waiting",
        },
        {
            **base,
            "seq": 8,
            "type": "tool_finish",
            "turnId": "turn-1",
            "callId": "call-1",
            "name": "lookup",
            "response": {"ready": True},
            "status": "success",
            "finishedAt": 120,
            "durationMs": 10,
        },
        {
            **base,
            "seq": 9,
            "type": "usage_update",
            "inputTokens": 4,
            "outputTokens": 6,
            "totalTokens": 10,
        },
        {
            **base,
            "seq": 10,
            "type": "execution_error",
            "code": "PI_RUNTIME_ERROR",
            "message": "Pi agent runtime failed",
            "occurredAt": 121,
        },
        {
            **base,
            "seq": 11,
            "type": "execution_end",
            "status": "error",
            "finishedAt": 122,
            "durationMs": 22,
        },
    ]


@pytest.mark.parametrize("payload", event_fixtures())
def test_every_v1_event_validates_and_round_trips(payload: dict[str, object]) -> None:
    event = validate_agent_event_v1(payload)
    assert isinstance(event, AgentEventBase)
    assert event.model_dump(exclude_none=True) == payload


def test_event_models_accept_additive_metadata() -> None:
    payload = {
        "version": 1,
        "runId": "run-1",
        "seq": 1,
        "type": "execution_start",
        "startedAt": 100,
        "runtimeMetadata": {"provider": "pi"},
    }
    assert validate_agent_event_v1(payload).model_dump()["runtimeMetadata"] == {
        "provider": "pi"
    }


def test_missing_protocol_version_is_rejected() -> None:
    with pytest.raises(ValidationError):
        validate_agent_event_v1(
            {
                "runId": "run-1",
                "seq": 1,
                "type": "execution_start",
                "startedAt": 100,
            }
        )


@pytest.mark.parametrize(
    "payload",
    [
        {
            "version": 2,
            "runId": "run-1",
            "seq": 1,
            "type": "execution_start",
            "startedAt": 1,
        },
        {
            "version": 1,
            "runId": "",
            "seq": 1,
            "type": "execution_start",
            "startedAt": 1,
        },
        {
            "version": 1,
            "runId": "run-1",
            "seq": 0,
            "type": "execution_start",
            "startedAt": 1,
        },
        {
            "version": 1,
            "runId": "run-1",
            "seq": 1,
            "type": "tool_start",
            "turnId": "turn-1",
            "callId": "call-1",
            "arguments": {},
        },
        {
            "version": 1,
            "runId": "run-1",
            "seq": 1,
            "type": "execution_end",
            "status": "running",
            "finishedAt": 2,
            "durationMs": 1,
        },
    ],
)
def test_invalid_v1_event_is_rejected(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        validate_agent_event_v1(payload)


def test_generated_json_schema_matches_committed_contract() -> None:
    assert json.loads(CONTRACT_PATH.read_text(encoding="utf-8")) == (
        agent_event_v1_json_schema()
    )
