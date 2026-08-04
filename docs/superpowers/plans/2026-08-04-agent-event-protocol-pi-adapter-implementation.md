# Agent Event Protocol v1 and Pi Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze a runtime-neutral Agent Event Protocol v1, generate its JSON Schema contract, and make `PiRunner` emit it exclusively through a tested `PiEventAdapter` without regressing current streams, workflow outputs, or Trace.

**Architecture:** Exact Pydantic event subclasses form a discriminated union and generate the cross-language contract. A per-run Pi adapter owns public identity, sequencing, normalization, progress summaries, and lifecycle event construction; `PiRunner` keeps WebSocket, plugin, legacy text, `CotStep`, and Trace responsibilities.

**Tech Stack:** Python 3.11+, Pydantic 2, pytest/pytest-asyncio, aiohttp, existing OpenAI-compatible SSE models, Java/Jackson pass-through regression test.

## Global Constraints

- Keep `choices[0].delta.agent_event` as the public SSE field.
- Keep `content`, `reasoning_content`, `tool_calls`, `CotStep`, and current Trace construction.
- Keep existing `segment_*`, `turn_commit`, and `tool_*` payload shapes compatible.
- Assign public `runId` and strictly increasing positive `seq` in the Agent service.
- Public segment visibility is `user`; `debug` is diagnostic-only and `runtime` never crosses public SSE.
- Never fabricate reasoning or expose provider-hidden chain-of-thought.
- Use Pydantic's official JSON Schema generator; add no schema-generation dependency.
- Sanitize execution errors before emitting them; never include credentials, headers, stack traces, or raw provider requests.
- Do not implement `AgentExecutionPanel` or migrate Trace storage in this plan.

## File structure

- `core/agent/api/schemas/agent_event.py` — exact runtime-neutral protocol models, validator, and JSON Schema accessor.
- `core/agent/api/schemas/agent_response.py` — keeps response/CotStep models and imports the common event union.
- `core/agent/generate_agent_event_schema.py` — deterministic checked-in schema generator.
- `docs/contracts/agent-event-protocol-v1.schema.json` — generated cross-language contract.
- `core/agent/tests/test_agent_event_protocol.py` — schema, validation, serialization, and drift tests.
- `core/agent/engine/nodes/pi/event_adapter.py` — the only Pi-to-public-event mapping and sequence authority.
- `core/agent/tests/test_pi_event_adapter.py` — adapter normalization and lifecycle tests.
- `core/agent/engine/nodes/pi/pi_runner.py` — delegates public events while retaining runtime/tool orchestration.
- `core/agent/tests/test_pi_runner.py` — bridge, tool, lifecycle, cancellation, and legacy projection regressions.
- `core/agent/service/runner/workflow_agent_runner.py` — serializes the common event base rather than a Pi-era event class.
- `core/agent/tests/test_workflow_agent_runner.py` — public completion-delta serialization regression.
- `core/workflow/tests/engine/nodes/test_agent_event_stream.py` — event-only workflow transport regression.
- `core/workflow/tests/service/test_chat_service_response_filter.py` — release-chat filter regression.
- `console/backend/toolkit/src/test/java/com/iflytek/astron/console/toolkit/entity/core/workflow/sse/DeltaStructuredEventTest.java` — Java pass-through regression.

---

### Task 1: Freeze the typed protocol and generated JSON Schema

**Files:**
- Create: `core/agent/api/schemas/agent_event.py`
- Create: `core/agent/generate_agent_event_schema.py`
- Create: `core/agent/tests/test_agent_event_protocol.py`
- Create: `docs/contracts/agent-event-protocol-v1.schema.json`
- Modify: `core/agent/api/schemas/agent_response.py:1-68`
- Modify: `core/agent/tests/test_router_and_schemas.py:8-110`

**Interfaces:**
- Produces: `AgentEventBase`, `AgentEventV1`, `AgentExecutionStatus`, `AgentToolStatus`, `validate_agent_event_v1(value)`, and `agent_event_v1_json_schema()`.
- Produces: `AgentResponse.content` accepting validated `AgentEventV1` instances.
- Consumes: Pydantic `BaseModel`, `Field`, `ConfigDict`, and `TypeAdapter` only.

- [ ] **Step 1: Write the failing protocol contract tests**

Create `core/agent/tests/test_agent_event_protocol.py` with explicit fixtures for every v1 event:

```python
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


@pytest.mark.parametrize(
    "payload",
    [
        {"version": 2, "runId": "run-1", "seq": 1, "type": "execution_start", "startedAt": 1},
        {"version": 1, "runId": "", "seq": 1, "type": "execution_start", "startedAt": 1},
        {"version": 1, "runId": "run-1", "seq": 0, "type": "execution_start", "startedAt": 1},
        {"version": 1, "runId": "run-1", "seq": 1, "type": "tool_start", "turnId": "turn-1", "callId": "call-1", "arguments": {}},
        {"version": 1, "runId": "run-1", "seq": 1, "type": "execution_end", "status": "running", "finishedAt": 2, "durationMs": 1},
    ],
)
def test_invalid_v1_event_is_rejected(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        validate_agent_event_v1(payload)


def test_generated_json_schema_matches_committed_contract() -> None:
    assert json.loads(CONTRACT_PATH.read_text(encoding="utf-8")) == (
        agent_event_v1_json_schema()
    )
```

Update `core/agent/tests/test_router_and_schemas.py` to import `validate_agent_event_v1` and replace its permissive event construction with:

```python
event = validate_agent_event_v1(
    {
        "version": 1,
        "runId": "run-1",
        "seq": 3,
        "type": "tool_finish",
        "turnId": "turn-1",
        "callId": "call-1",
        "name": "lookup",
        "response": {"ready": True},
        "status": "success",
        "finishedAt": 120,
        "durationMs": 10,
    }
)
response = AgentResponse(typ="agent_event", content=event, model="model")

assert response.content == event
assert event.response == {"ready": True}
```

- [ ] **Step 2: Run the tests and verify the new module is missing**

Run:

```bash
cd core/agent
uv run pytest tests/test_agent_event_protocol.py tests/test_router_and_schemas.py -q
```

Expected: collection fails with `ModuleNotFoundError: No module named 'agent.api.schemas.agent_event'`.

- [ ] **Step 3: Implement the exact discriminated protocol models**

Create `core/agent/api/schemas/agent_event.py`:

```python
from typing import Annotated, Any, Literal, TypeAlias, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


AgentExecutionStatus: TypeAlias = Literal["success", "error", "cancelled"]
AgentToolStatus: TypeAlias = Literal["running", "success", "error", "cancelled"]
AgentToolTerminalStatus: TypeAlias = Literal["success", "error", "cancelled"]
AgentVisibility: TypeAlias = Literal["user", "debug", "runtime"]


class AgentEventBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: Literal[1] = 1
    runId: str = Field(min_length=1)
    seq: int = Field(gt=0)


class AgentExecutionStartEvent(AgentEventBase):
    type: Literal["execution_start"]
    startedAt: int = Field(ge=0)


class AgentSegmentStartEvent(AgentEventBase):
    type: Literal["segment_start"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)
    source: Literal["text", "thinking"]
    channel: Literal["pending", "reasoning", "content"]
    visibility: AgentVisibility = "user"


class AgentSegmentDeltaEvent(AgentEventBase):
    type: Literal["segment_delta"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)
    delta: str


class AgentSegmentEndEvent(AgentEventBase):
    type: Literal["segment_end"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)


class AgentTurnCommitEvent(AgentEventBase):
    type: Literal["turn_commit"]
    turnId: str = Field(min_length=1)
    channel: Literal["reasoning", "content"]
    partial: bool
    reason: Literal["tool_call", "message_end", "cancelled", "error"]


class AgentToolStartEvent(AgentEventBase):
    type: Literal["tool_start"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    arguments: Any
    status: Literal["running"] = "running"
    startedAt: int = Field(ge=0)


class AgentToolProgressEvent(AgentEventBase):
    type: Literal["tool_progress"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    summary: str = Field(max_length=200)


class AgentToolFinishEvent(AgentEventBase):
    type: Literal["tool_finish"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    name: str | None = Field(default=None, min_length=1)
    response: Any = None
    summary: str | None = Field(default=None, max_length=200)
    status: AgentToolTerminalStatus
    finishedAt: int = Field(ge=0)
    durationMs: int = Field(ge=0)


class AgentUsageUpdateEvent(AgentEventBase):
    type: Literal["usage_update"]
    inputTokens: int = Field(ge=0)
    outputTokens: int = Field(ge=0)
    totalTokens: int = Field(ge=0)


class AgentExecutionErrorEvent(AgentEventBase):
    type: Literal["execution_error"]
    code: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=500)
    occurredAt: int = Field(ge=0)


class AgentExecutionEndEvent(AgentEventBase):
    type: Literal["execution_end"]
    status: AgentExecutionStatus
    finishedAt: int = Field(ge=0)
    durationMs: int = Field(ge=0)


AgentEventV1: TypeAlias = Annotated[
    Union[
        AgentExecutionStartEvent,
        AgentSegmentStartEvent,
        AgentSegmentDeltaEvent,
        AgentSegmentEndEvent,
        AgentTurnCommitEvent,
        AgentToolStartEvent,
        AgentToolProgressEvent,
        AgentToolFinishEvent,
        AgentUsageUpdateEvent,
        AgentExecutionErrorEvent,
        AgentExecutionEndEvent,
    ],
    Field(discriminator="type"),
]

_AGENT_EVENT_V1_ADAPTER = TypeAdapter(AgentEventV1)


def validate_agent_event_v1(value: Any) -> AgentEventV1:
    return _AGENT_EVENT_V1_ADAPTER.validate_python(value)


def agent_event_v1_json_schema() -> dict[str, Any]:
    return _AGENT_EVENT_V1_ADAPTER.json_schema()
```

Modify `agent_response.py` so it imports `AgentEventBase` and `AgentEventV1`, removes the permissive `AgentStreamEvent` class, and keeps a temporary alias while existing Pi callers are migrated in Task 3:

```python
AgentStreamEvent = AgentEventBase

content: Union[str, CotStep, AgentEventV1, AgentEventBase, list]
```

The alias and base fallback preserve collection of the existing PiRunner and workflow-runner suites during the first independently testable commit. Both are removed after their imports move to the common protocol base in Task 3, leaving `content: Union[str, CotStep, AgentEventV1, list]` as the final declaration.

- [ ] **Step 4: Add and run the deterministic schema generator**

Create `core/agent/generate_agent_event_schema.py`:

```python
import json
from pathlib import Path

from agent.api.schemas.agent_event import agent_event_v1_json_schema


OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "docs/contracts/agent-event-protocol-v1.schema.json"
)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            agent_event_v1_json_schema(),
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
```

Run:

```bash
cd core/agent
uv run python generate_agent_event_schema.py
uv run pytest tests/test_agent_event_protocol.py tests/test_router_and_schemas.py -q
```

Expected: all tests pass and `docs/contracts/agent-event-protocol-v1.schema.json` is created.

- [ ] **Step 5: Verify formatting, schema drift, and existing schema callers**

Run:

```bash
cd core/agent
uv run black --check api/schemas/agent_event.py api/schemas/agent_response.py generate_agent_event_schema.py tests/test_agent_event_protocol.py tests/test_router_and_schemas.py
uv run pytest tests/test_agent_event_protocol.py tests/test_router_and_schemas.py tests/test_workflow_agent_runner.py -q
```

Expected: formatting and tests pass.

- [ ] **Step 6: Commit the protocol contract**

```bash
git add core/agent/api/schemas/agent_event.py core/agent/api/schemas/agent_response.py core/agent/generate_agent_event_schema.py core/agent/tests/test_agent_event_protocol.py core/agent/tests/test_router_and_schemas.py docs/contracts/agent-event-protocol-v1.schema.json
git commit -m "feat(agent): define event protocol v1"
```

---

### Task 2: Build the isolated Pi Event Adapter

**Files:**
- Create: `core/agent/engine/nodes/pi/event_adapter.py`
- Create: `core/agent/tests/test_pi_event_adapter.py`

**Interfaces:**
- Consumes: `validate_agent_event_v1`, `AgentEventV1`, `AgentExecutionStatus`, and `AgentToolStatus` from Task 1.
- Produces: `PiEventAdapter(run_id: str, started_at: int)` and `PiEventAdapterError`.
- Produces: normalized runtime segment events plus typed execution/tool/usage/error factories with one sequence counter.

- [ ] **Step 1: Write failing adapter tests**

Create `core/agent/tests/test_pi_event_adapter.py`:

```python
import pytest

from agent.engine.nodes.pi.event_adapter import PiEventAdapter, PiEventAdapterError


def test_adapter_assigns_one_public_identity_and_sequence() -> None:
    adapter = PiEventAdapter(run_id="public-run", started_at=100)
    started = adapter.execution_started()
    runtime = adapter.adapt_runtime_event(
        {
            "type": "agent_event",
            "event": {
                "version": 1,
                "runId": "runtime-run",
                "seq": 900,
                "type": "segment_start",
                "turnId": "turn-1",
                "segmentId": "segment-1",
                "source": "text",
                "channel": "pending",
            },
        }
    )[0]
    tool = adapter.tool_started(
        turn_id="turn-1",
        call_id="call-1",
        name="lookup",
        arguments={"id": "7"},
        started_at=110,
    )
    usage = adapter.usage_updated(
        input_tokens=4, output_tokens=6, total_tokens=10
    )
    finished = adapter.execution_finished(status="success", finished_at=120)

    events = [started, runtime, tool, usage, finished]
    assert [event.runId for event in events] == ["public-run"] * 5
    assert [event.seq for event in events] == [1, 2, 3, 4, 5]
    assert runtime.visibility == "user"
    assert finished.durationMs == 20


def test_adapter_builds_bounded_tool_progress_and_terminal_tool() -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    progress = adapter.tool_progressed(
        turn_id="turn-1", call_id="call-1", value={"body": "x" * 500}
    )
    finished = adapter.tool_finished(
        turn_id="turn-1",
        call_id="call-1",
        name="lookup",
        response={"ready": True},
        status="success",
        finished_at=130,
        duration_ms=20,
    )

    assert len(progress.summary) == 200
    assert progress.summary.endswith("…")
    assert finished.response == {"ready": True}
    assert finished.status == "success"


def test_adapter_normalizes_public_error_text() -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    event = adapter.execution_failed(
        code="PI_RUNTIME_ERROR",
        message="  Pi agent runtime failed\n",
        occurred_at=120,
    )
    assert event.code == "PI_RUNTIME_ERROR"
    assert event.message == "Pi agent runtime failed"


@pytest.mark.parametrize(
    "payload",
    [
        {"type": "agent_event", "event": None},
        {"type": "agent_event", "event": {"type": "tool_start"}},
        {"type": "agent_event", "event": {"type": "unknown"}},
    ],
)
def test_adapter_rejects_invalid_pi_runtime_events(payload: dict[str, object]) -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    with pytest.raises(PiEventAdapterError):
        adapter.adapt_runtime_event(payload)
```

- [ ] **Step 2: Run the tests and verify the adapter is missing**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_event_adapter.py -q
```

Expected: collection fails because `agent.engine.nodes.pi.event_adapter` does not exist.

- [ ] **Step 3: Implement the adapter and keep Pi concerns inside it**

Create `core/agent/engine/nodes/pi/event_adapter.py` with these exact behaviors:

```python
import json
from dataclasses import dataclass, field
from typing import Any

from agent.api.schemas.agent_event import (
    AgentEventV1,
    AgentExecutionStatus,
    AgentToolStatus,
    validate_agent_event_v1,
)


_RUNTIME_SEGMENT_TYPES = frozenset(
    {"segment_start", "segment_delta", "segment_end", "turn_commit"}
)


class PiEventAdapterError(ValueError):
    pass


@dataclass
class PiEventAdapter:
    run_id: str
    started_at: int
    _seq: int = field(default=0, init=False)

    def _next(self, payload: dict[str, Any]) -> AgentEventV1:
        self._seq += 1
        return validate_agent_event_v1(
            {
                **payload,
                "version": 1,
                "runId": self.run_id,
                "seq": self._seq,
            }
        )

    @staticmethod
    def _summary(value: Any) -> str:
        try:
            text = (
                value
                if isinstance(value, str)
                else json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            )
        except (TypeError, ValueError):
            text = str(value)
        return text if len(text) <= 200 else f"{text[:199]}…"

    def execution_started(self) -> AgentEventV1:
        return self._next({"type": "execution_start", "startedAt": self.started_at})

    def adapt_runtime_event(self, payload: dict[str, Any]) -> list[AgentEventV1]:
        event = payload.get("event")
        if not isinstance(event, dict):
            raise PiEventAdapterError("Pi runtime returned an invalid agent event")
        event_type = event.get("type")
        if event_type not in _RUNTIME_SEGMENT_TYPES:
            raise PiEventAdapterError(
                f"Pi runtime returned unsupported agent event: {event_type}"
            )
        normalized = {
            key: value
            for key, value in event.items()
            if key not in {"version", "runId", "seq"}
        }
        if event_type == "segment_start":
            normalized["visibility"] = "user"
        try:
            return [self._next(normalized)]
        except ValueError as error:
            raise PiEventAdapterError(
                "Pi runtime returned an invalid agent event"
            ) from error

    def tool_started(
        self,
        *,
        turn_id: str,
        call_id: str,
        name: str,
        arguments: Any,
        started_at: int,
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "tool_start",
                "turnId": turn_id,
                "callId": call_id,
                "name": name,
                "arguments": arguments,
                "status": "running",
                "startedAt": started_at,
            }
        )

    def tool_progressed(
        self, *, turn_id: str, call_id: str, value: Any
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "tool_progress",
                "turnId": turn_id,
                "callId": call_id,
                "summary": self._summary(value),
            }
        )

    def tool_finished(
        self,
        *,
        turn_id: str,
        call_id: str,
        name: str,
        response: Any,
        status: AgentToolStatus,
        finished_at: int,
        duration_ms: int,
    ) -> AgentEventV1:
        if status == "running":
            raise PiEventAdapterError("A finished tool cannot have running status")
        return self._next(
            {
                "type": "tool_finish",
                "turnId": turn_id,
                "callId": call_id,
                "name": name,
                "response": response,
                "status": status,
                "finishedAt": finished_at,
                "durationMs": max(0, duration_ms),
            }
        )

    def usage_updated(
        self, *, input_tokens: int, output_tokens: int, total_tokens: int
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "usage_update",
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "totalTokens": total_tokens,
            }
        )

    def execution_failed(
        self, *, code: str, message: str, occurred_at: int
    ) -> AgentEventV1:
        public_message = " ".join(message.split())[:500]
        return self._next(
            {
                "type": "execution_error",
                "code": code,
                "message": public_message,
                "occurredAt": occurred_at,
            }
        )

    def execution_finished(
        self, *, status: AgentExecutionStatus, finished_at: int
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "execution_end",
                "status": status,
                "finishedAt": finished_at,
                "durationMs": max(0, finished_at - self.started_at),
            }
        )
```

- [ ] **Step 4: Run adapter and protocol tests**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_event_adapter.py tests/test_agent_event_protocol.py -q
uv run black --check engine/nodes/pi/event_adapter.py tests/test_pi_event_adapter.py
```

Expected: all tests and formatting checks pass.

- [ ] **Step 5: Commit the adapter boundary**

```bash
git add core/agent/engine/nodes/pi/event_adapter.py core/agent/tests/test_pi_event_adapter.py
git commit -m "feat(pi-agent): add event protocol adapter"
```

---

### Task 3: Delegate existing segment and tool events from PiRunner

**Files:**
- Modify: `core/agent/engine/nodes/pi/pi_runner.py:1-333`
- Modify: `core/agent/api/schemas/agent_response.py:1-70`
- Modify: `core/agent/tests/test_pi_runner.py:180-646`
- Modify: `core/agent/service/runner/workflow_agent_runner.py:1-115`
- Modify: `core/agent/tests/test_workflow_agent_runner.py:186-210`

**Interfaces:**
- Consumes: `PiEventAdapter` from Task 2 and `AgentEventBase` from Task 1.
- Produces: unchanged `AgentResponse(typ="agent_event")` and public SSE dictionaries for current segment/tool events.
- Preserves: plugin invocation, model-visible tool results, legacy text deltas, `CotStep`, and Trace.

- [ ] **Step 1: Update tests to require delegation results**

In `test_structured_runtime_events_receive_one_public_sequence`, assign the helper result before running it, retain the public identity/sequence assertions, and add:

```python
runner = pi_runner(url, [])
responses = [
    response
    async for response in runner.run(
        Span(app_id="app", uid="uid"), node_trace()
    )
]
events = [item.content for item in responses if item.typ == "agent_event"]
assert events[0].visibility == "user"
assert not hasattr(runner, "_event_seq")
```

In the remote tool, subworkflow progress, wait, plugin failure, and cancellation tests, keep the exact current event order and payload assertions. Change progress expectations to prove the adapter serializes the raw streamed value:

```python
assert events[1].summary == '{"reasoning_content":"checking","content":"part-1"}'
assert events[2].summary == '{"reasoning_content":"","content":"part-2"}'
```

In `test_workflow_agent_runner.py`, import `validate_agent_event_v1`, build the event, and assert exact public serialization:

```python
event = validate_agent_event_v1(
    {
        "version": 1,
        "runId": "run-1",
        "seq": 1,
        "type": "segment_delta",
        "turnId": "turn-1",
        "segmentId": "turn-1-text-0",
        "delta": "Hi",
    }
)
chunk = await result.convert_message(
    AgentResponse(typ="agent_event", content=event, model="model"),
    span,
    node_trace,
)
assert chunk.choices[0].delta.agent_event == event.model_dump(exclude_none=True)
```

- [ ] **Step 2: Run the focused tests and verify the new assertions fail**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_runner.py tests/test_workflow_agent_runner.py -q
```

Expected: failure because `PiRunner` still owns `_event_seq`, runtime segment starts have no explicit public visibility, and `WorkflowAgentRunner` still checks `AgentStreamEvent`.

- [ ] **Step 3: Replace PiRunner's public event constructor with adapter delegation**

Make these mechanical changes in `pi_runner.py`:

```python
from agent.api.schemas.agent_event import AgentEventBase, AgentEventV1
from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.engine.nodes.pi.event_adapter import PiEventAdapter, PiEventAdapterError
```

Replace `_event_seq` with:

```python
_event_adapter: PiEventAdapter = field(init=False)

def __post_init__(self) -> None:
    self._event_adapter = PiEventAdapter(
        run_id=self.run_id,
        started_at=self._now_ms(),
    )

def _event_response(self, event: AgentEventV1) -> AgentResponse:
    return AgentResponse(
        typ="agent_event", content=event, model=self.model_config.id
    )
```

Delete `_agent_event`, `_runtime_agent_event`, and `_progress_summary`. Change `_ExecutionEvent.progress` to `Any | None`, and yield the raw plugin result as progress:

```python
yield _ExecutionEvent(progress=result)
```

For a Pi runtime structured event:

```python
try:
    events = self._event_adapter.adapt_runtime_event(payload)
except PiEventAdapterError as error:
    raise AgentInternalExc(str(error)) from error
for event in events:
    yield self._event_response(event)
```

Replace every direct tool event construction with the matching adapter method. The start pattern is:

```python
yield self._event_response(
    self._event_adapter.tool_started(
        turn_id=turn_id,
        call_id=call_id,
        name=plugin.name if plugin is not None else runtime_name,
        arguments=arguments,
        started_at=started_at,
    )
)
```

The progress pattern is:

```python
yield self._event_response(
    self._event_adapter.tool_progressed(
        turn_id=turn_id,
        call_id=call_id,
        value=event.progress,
    )
)
```

The finish pattern is:

```python
yield self._event_response(
    self._event_adapter.tool_finished(
        turn_id=turn_id,
        call_id=call_id,
        name=plugin.name,
        response=action_output,
        status="error" if result.code != 0 else "success",
        finished_at=finished_at,
        duration_ms=finished_at - started_at,
    )
)
```

Use the same finish method for unknown tools, cancellation, wait completion, and pending-wait cleanup. Reinitialize the adapter at the start of each `run()` so rerunning one `PiRunner` instance starts a fresh sequence:

```python
self._event_adapter = PiEventAdapter(
    run_id=self.run_id,
    started_at=self._now_ms(),
)
```

In `workflow_agent_runner.py`, import `AgentEventBase` and serialize only instances of that base:

```python
if isinstance(message.content, AgentEventBase):
    chunk.choices[0].delta.agent_event = message.content.model_dump(
        exclude_none=True
    )
```

After all production and test imports use `AgentEventBase`, `AgentEventV1`, or `validate_agent_event_v1`, delete the temporary `AgentStreamEvent = AgentEventBase` alias and remove `AgentEventBase` from the `AgentResponse.content` union in `agent_response.py`. The final field is:

```python
content: Union[str, CotStep, AgentEventV1, list]
```

Verify `rg -n "AgentStreamEvent" core/agent -g '*.py'` returns no matches.

- [ ] **Step 4: Run Pi bridge, workflow-runner, and schema regressions**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_event_adapter.py tests/test_pi_runner.py tests/test_workflow_agent_runner.py tests/test_router_and_schemas.py -q
uv run black --check engine/nodes/pi/pi_runner.py service/runner/workflow_agent_runner.py tests/test_pi_runner.py tests/test_workflow_agent_runner.py
```

Expected: all tests pass; existing exact segment/tool ordering remains unchanged.

- [ ] **Step 5: Commit the PiRunner delegation**

```bash
git add core/agent/api/schemas/agent_response.py core/agent/engine/nodes/pi/pi_runner.py core/agent/service/runner/workflow_agent_runner.py core/agent/tests/test_pi_runner.py core/agent/tests/test_workflow_agent_runner.py
git commit -m "refactor(pi-agent): delegate public event mapping"
```

---

### Task 4: Emit execution lifecycle, usage, and sanitized error events

**Files:**
- Modify: `core/agent/engine/nodes/pi/pi_runner.py:335-483`
- Modify: `core/agent/tests/test_pi_runner.py:90-733`

**Interfaces:**
- Consumes: lifecycle/usage/error factories from `PiEventAdapter`.
- Produces: `execution_start` first, `usage_update` cumulatively, sanitized `execution_error`, and `execution_end` as the final public event when the generator can still yield.
- Preserves: existing `CompletionUsage` output and raised `AgentExc` behavior.

- [ ] **Step 1: Add lifecycle success, failure, and cancellation assertions**

Add a helper in `test_pi_runner.py`:

```python
from agent.api.schemas.agent_event import AgentEventBase
from agent.api.schemas.agent_response import AgentResponse


def public_events(responses: list[AgentResponse]) -> list[AgentEventBase]:
    return [
        response.content
        for response in responses
        if response.typ == "agent_event"
        and isinstance(response.content, AgentEventBase)
    ]
```

Update the simple successful run to assert:

```python
legacy_responses = [
    response for response in responses if response.typ != "agent_event"
]
assert [(item.typ, item.content) for item in legacy_responses[:2]] == [
    ("reasoning_content", "thinking"),
    ("content", "answer"),
]
events = public_events(responses)
assert [event.type for event in events] == [
    "execution_start",
    "usage_update",
    "execution_end",
]
assert [event.seq for event in events] == [1, 2, 3]
assert events[1].totalTokens == 13
assert events[-1].status == "success"
assert events[-1].durationMs >= 0
```

Update the remote-tool exact order to:

```python
assert [event.type for event in events] == [
    "execution_start",
    "turn_commit",
    "tool_start",
    "tool_finish",
    "execution_end",
]
assert [event.seq for event in events] == [1, 2, 3, 4, 5]
```

Add a runtime-error assertion that collects yielded responses before the raised exception:

```python
responses: list[AgentResponse] = []
with pytest.raises(AgentExc, match="runtime stopped"):
    async for response in pi_runner(url, []).run(
        Span(app_id="app", uid="uid"), node_trace()
    ):
        responses.append(response)

events = public_events(responses)
assert [event.type for event in events] == [
    "execution_start",
    "tool_start",
    "tool_finish",
    "execution_error",
    "execution_end",
]
assert events[-2].message == "Pi agent runtime failed"
assert events[-1].status == "error"
```

For full-run cancellation, assert that any pending tool finish is followed by `execution_end(status="cancelled")` before `CancelledError` propagates.

- [ ] **Step 2: Run lifecycle-focused tests and verify they fail**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_runner.py -q
```

Expected: lifecycle assertions fail because `PiRunner` does not emit the new event types.

- [ ] **Step 3: Emit start, usage, success, error, and cancellation in PiRunner**

Immediately after reinitializing the adapter in `run()` and before opening the WebSocket, emit:

```python
yield self._event_response(self._event_adapter.execution_started())
```

When `usage` arrives, emit the structured update before retaining the current `CompletionUsage` response:

```python
input_tokens = int(payload.get("inputTokens") or 0)
output_tokens = int(payload.get("outputTokens") or 0)
total_tokens = int(payload.get("totalTokens") or 0)
yield self._event_response(
    self._event_adapter.usage_updated(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
    )
)
yield AgentResponse(
    typ="content",
    content="",
    model=self.model_config.id,
    usage=CompletionUsage(
        prompt_tokens=input_tokens,
        completion_tokens=output_tokens,
        total_tokens=total_tokens,
    ),
)
```

When `done` arrives, emit the terminal event and return:

```python
finished_at = self._now_ms()
yield self._event_response(
    self._event_adapter.execution_finished(
        status="success", finished_at=finished_at
    )
)
completed = True
return
```

Use fixed public messages rather than raw exception text. In the existing `AgentExc` branch, after finishing pending wait tools and before re-raising:

```python
failed_at = self._now_ms()
yield self._event_response(
    self._event_adapter.execution_failed(
        code="PI_RUNTIME_ERROR",
        message="Pi agent runtime failed",
        occurred_at=failed_at,
    )
)
yield self._event_response(
    self._event_adapter.execution_finished(
        status="error", finished_at=failed_at
    )
)
```

Use `PI_RUNTIME_UNAVAILABLE` / `Pi agent runtime unavailable` in the `aiohttp.ClientError` and `OSError` branch. Use `PI_RUNTIME_DISCONNECTED` / `Pi agent runtime disconnected` when the socket closes before `done`.

In the cancellation branch, finish pending tools, then emit only:

```python
cancelled_at = self._now_ms()
yield self._event_response(
    self._event_adapter.execution_finished(
        status="cancelled", finished_at=cancelled_at
    )
)
```

Then re-raise `CancelledError`. Do not emit `execution_error` for user cancellation.

- [ ] **Step 4: Update all exact Pi event-order assertions once**

For every completed `run()` test that currently asserts an exact event list, add `execution_start` as the first item and `execution_end` as the last. Keep `_handle_tool_call()` unit tests unchanged because they intentionally test the isolated helper without a whole execution lifecycle.

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_event_adapter.py tests/test_pi_runner.py tests/test_workflow_agent_runner.py -q
```

Expected: all tests pass, including success, tool error, runtime error, unavailable runtime, wait cleanup, and cancellation.

- [ ] **Step 5: Commit lifecycle emission**

```bash
git add core/agent/engine/nodes/pi/pi_runner.py core/agent/tests/test_pi_runner.py
git commit -m "feat(pi-agent): emit execution lifecycle events"
```

---

### Task 5: Prove lifecycle events survive existing transport layers

**Files:**
- Modify: `core/workflow/tests/engine/nodes/test_agent_event_stream.py`
- Modify: `core/workflow/tests/service/test_chat_service_response_filter.py`
- Modify: `console/backend/toolkit/src/test/java/com/iflytek/astron/console/toolkit/entity/core/workflow/sse/DeltaStructuredEventTest.java`

**Interfaces:**
- Consumes: raw `choices[0].delta.agent_event` dictionaries.
- Produces: evidence that lifecycle events without `turnId` remain opaque pass-through data in Workflow and Console.
- Production code: unchanged unless one of these tests exposes a field-dropping bug.

- [ ] **Step 1: Change pass-through fixtures to a lifecycle event without turnId**

Use this fixture in the Python transport/filter tests and the Java serialization test:

```json
{
  "version": 1,
  "runId": "run-1",
  "seq": 1,
  "type": "execution_start",
  "startedAt": 100
}
```

Keep each existing equality assertion against the complete nested object. This specifically proves that no layer requires Pi turn fields.

- [ ] **Step 2: Run the transport tests**

Run:

```bash
cd core/workflow
uv run pytest tests/engine/nodes/test_agent_event_stream.py tests/service/test_chat_service_response_filter.py -q
```

Then run the focused Java test with the repository's existing module wrapper:

```bash
cd console/backend
mvn -pl toolkit -Dtest=DeltaStructuredEventTest test
```

Expected: all tests pass without production changes because each layer already carries `agent_event` as an opaque object.

- [ ] **Step 3: Commit the cross-service contract evidence**

```bash
git add core/workflow/tests/engine/nodes/test_agent_event_stream.py core/workflow/tests/service/test_chat_service_response_filter.py console/backend/toolkit/src/test/java/com/iflytek/astron/console/toolkit/entity/core/workflow/sse/DeltaStructuredEventTest.java
git commit -m "test(agent): verify lifecycle event transport"
```

---

## Final verification

- [ ] Run the Agent contract and Pi suites:

```bash
cd core/agent
uv run pytest tests/test_agent_event_protocol.py tests/test_pi_event_adapter.py tests/test_pi_runner.py tests/test_workflow_agent_runner.py tests/test_router_and_schemas.py -q
```

- [ ] Regenerate the schema and prove there is no drift:

```bash
cd core/agent
uv run python generate_agent_event_schema.py
git diff --exit-code -- docs/contracts/agent-event-protocol-v1.schema.json
```

- [ ] Run Workflow transport suites:

```bash
cd core/workflow
uv run pytest tests/engine/nodes/util/test_frame_processor.py tests/engine/nodes/test_agent_event_stream.py tests/engine/callbacks/test_callback_handler.py tests/service/test_chat_service_response_filter.py -q
```

- [ ] Run the Console backend structured-event test:

```bash
cd console/backend
mvn -pl toolkit -Dtest=DeltaStructuredEventTest test
```

- [ ] Prove the unchanged frontend still accepts existing segment/tool events and ignores new lifecycle events safely:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.js _tests_/chat-store-streaming.test.js
npm run type-check
npm run build:dev
```

- [ ] Inspect the final branch:

```bash
git status --short --branch
git log --oneline origin/feat/pi-agent-runtime..HEAD
```

Expected: the worktree is clean and every implementation task has a focused commit.
