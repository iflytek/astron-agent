# Agent Execution Experience v1 Design

**Date:** 2026-08-04
**Status:** Approved architecture captured for written review

## Context

The Pi migration already carries versioned `agent_event` objects from the Pi
runtime, through the Agent and Workflow services, to a shared frontend reducer.
That work proved the transport path and solved lossless ordering of streamed
text and tools, but the public schema and its construction still live inside Pi
integration code. Adding another runtime would require copying Pi's sequencing,
validation, tool lifecycle, and failure behavior.

The next architectural baseline is therefore an **Agent Execution Experience**
layer. Pi is its first runtime adapter, not the frontend's data model.

This phase delivers three things:

1. a frozen Agent Event Protocol v1 design and interface contract;
2. a concrete Pi Adapter boundary in the Agent service;
3. an implementation plan for migrating the frontend to
   `AgentExecutionPanel`.

The phase does not yet redesign Trace storage or replace the current frontend
timeline.

## Goals

- Give all agent runtimes one transport-independent, versioned event contract.
- Make the Agent service the authority for execution identity, sequence, public
  validation, and events produced by Python-side tool execution.
- Move Pi payload interpretation and Pi-specific error handling behind a
  `PiEventAdapter`.
- Keep the current SSE envelope, workflow outputs, Trace construction, and
  legacy consumers working throughout the staged migration.
- Preserve the existing first-token streaming and deterministic
  pending-to-analysis/final-answer reclassification.
- Define explicit lifecycle, error, and usage events needed by a runtime-neutral
  execution panel.
- Prevent runtime identity or Pi event names from controlling frontend routing.
- Define safe thought visibility and persistence behavior without fabricating or
  exposing hidden chain-of-thought.

## Non-goals

- Do not implement `AgentExecutionPanel` in this phase.
- Do not rename the outer `choices[0].delta.agent_event` SSE field.
- Do not remove `content`, `reasoning_content`, `tool_calls`, or `CotStep`.
- Do not migrate the Workflow Trace persistence model in this phase.
- Do not add Kafka, a new event service, or a new runtime registry.
- Do not generate summaries with an additional model call.
- Do not make the protocol a replayable command bus; it is an ordered
  observation stream for one execution.

## Considered approaches

### A. Replace the wire format with semantic deltas immediately

Rename current events to `thought_delta`, `message_delta`,
`tool_call_start`, and related types, then update every producer and consumer in
one change.

This produces attractive examples but loses an important behavior: ordinary Pi
text is ambiguous until a tool call or message end occurs. Buffering it until
classification regresses first-token streaming, while sending it as a message
and later retracting it makes the protocol harder to reason about. It also
forces a synchronized backend/frontend deployment before the adapter boundary
has been tested.

### B. Elevate the lossless stream model into the common protocol

Keep the proven segment and commit primitives, make them runtime-neutral, add
execution lifecycle/error/usage events, and move all Pi mapping behind an
adapter. The UI derives user-facing thought and message views from committed
segment channels.

This is the chosen approach. It preserves current behavior, keeps the migration
incremental, and still gives future runtimes a stable target.

### C. Rename classes but keep Pi constructing public events

Move `AgentStreamEvent` to a common file and otherwise leave `PiRunner`
responsible for mapping, sequencing, and validation.

This is the smallest diff, but it creates only a shared data class, not an
adapter layer. Runtime-specific behavior would continue leaking into public
event construction and would be copied by the next integration.

## Architecture

```text
Pi SDK / Pi WebSocket messages
              |
              v
        PiEventAdapter
              |
              v
      Agent Event Protocol v1
              |
       agent_event SSE field
              |
       -------------------
       |                 |
       v                 v
Agent stream reducer   Agent Trace projection
       |
       v
AgentExecutionPanel / LegacyRenderer capability switch
```

The protocol belongs to the Agent service API schema package. Runtime adapters
depend on that protocol; the protocol never imports a runtime.

The Workflow and Console backends remain transparent carriers. They do not
interpret the event union or branch on a runtime name.

## Agent Event Protocol v1

### Normative contract

The Pydantic discriminated union in
`core/agent/api/schemas/agent_event.py` is the executable source of truth.
Its generated JSON Schema is committed at
`docs/contracts/agent-event-protocol-v1.schema.json` so TypeScript and other
services can validate the same contract without importing Python.

The generated schema must be deterministic and checked by a contract test. No
new code-generation dependency is introduced; Pydantic's official JSON Schema
support is used.

### Common envelope

Every event contains:

```json
{
  "version": 1,
  "runId": "workflow-run-id",
  "seq": 12,
  "type": "segment_delta"
}
```

- `version` is exactly `1`.
- `runId` is the execution identifier. The existing field name remains stable
  on the wire; product and UI language calls the same concept an execution.
- `seq` is a positive integer, strictly increasing within one `runId`.
- `type` is the discriminant.
- Unknown object fields are accepted for forward-compatible additive metadata.
- Unknown event types or unsupported versions are ignored by consumers while
  legacy text continues to render.

The Agent service assigns `runId` and `seq` after runtime and Python-side tool
events have been merged. A runtime-provided sequence or run identifier is never
authoritative on the public stream.

### Execution lifecycle events

| Type | Required data | Meaning |
| --- | --- | --- |
| `execution_start` | `startedAt` | First public event for the execution. |
| `execution_end` | `status`, `finishedAt`, `durationMs` | Exactly one terminal event when the adapter can finish normally. |
| `execution_error` | `code`, `message`, `occurredAt` | A sanitized execution-level failure; terminal failures are followed by `execution_end(status=error)`. |
| `usage_update` | `inputTokens`, `outputTokens`, `totalTokens` | Latest cumulative token usage known for the execution. |

`execution_end.status` is `success`, `error`, or `cancelled`. A transport that
dies before a terminal event remains representable: the frontend finalizer
marks the local view `transport_closed` without inventing an event that was not
received.

### Text segment events

| Type | Required data | Meaning |
| --- | --- | --- |
| `segment_start` | `turnId`, `segmentId`, `source`, `channel`, `visibility` | Starts a stable streamed text block. |
| `segment_delta` | `turnId`, `segmentId`, `delta` | Appends one exact runtime-authorized text delta. |
| `segment_end` | `turnId`, `segmentId` | Closes the provider content block. |
| `turn_commit` | `turnId`, `channel`, `partial`, `reason` | Atomically classifies pending text in a turn. |

`source` is `text` or `thinking`. `channel` is `pending`, `reasoning`, or
`content`. `turn_commit.channel` is `reasoning` or `content`; its `reason` is
`tool_call`, `message_end`, `cancelled`, or `error`.

`visibility` is `user`, `debug`, or `runtime`:

- `user` may be sent to both chat surfaces and persisted with the message;
- `debug` may be shown only in authenticated diagnostic surfaces and must not be
  copied into normal chat history;
- `runtime` is internal adapter material and must not cross the public SSE
  boundary.

Pi's existing displayable text and thinking segments map to `user`. An adapter
must not fabricate reasoning and must not expose provider-hidden
chain-of-thought. A provider reasoning summary may be adapted only when the
provider explicitly returns it for display.

The earlier conceptual names `thought_delta` and `message_delta` are UI
selectors, not v1 wire events. A segment committed to `reasoning` feeds the
thought timeline; a segment committed to `content` feeds the final message.
This distinction preserves immediate streaming before Pi's intent is known.

### Tool events

| Type | Required data | Meaning |
| --- | --- | --- |
| `tool_start` | `turnId`, `callId`, `name`, `arguments`, `startedAt` | A tool call has been accepted for execution. |
| `tool_progress` | `turnId`, `callId`, `summary` | Replaces the latest compact progress description. |
| `tool_finish` | `turnId`, `callId`, `status`, `finishedAt`, `durationMs` | Completes the call and optionally carries `name`, `response`, and `summary`. |

Tool status is `running`, `success`, `error`, or `cancelled`. Arguments and
responses are JSON values, not encoded JSON strings. `summary` is bounded to 200
Unicode characters by the adapter. Full arguments and responses stay available
for the existing detail disclosure and Trace projection.

### Ordering and validity rules

- `execution_start` is the first event for a normally established execution.
- `seq` never repeats or decreases within a run.
- Entity identity is `(runId, segmentId)` or `(runId, callId)`.
- `segment_delta` and `segment_end` refer to a prior `segment_start`.
- `tool_progress` and `tool_finish` normally refer to a prior `tool_start`.
  Consumers still tolerate a finish-only record so partial/recovered streams
  remain inspectable.
- A tool has at most one effective terminal state; a repeated terminal event
  with a higher sequence replaces the same record rather than creating another.
- `execution_error` contains a user-safe message and code. Stack traces, API
  keys, internal authorization headers, and raw provider requests are forbidden.
- `execution_end` is the final adapter-produced event.

## Pi Adapter contract

Create `core/agent/engine/nodes/pi/event_adapter.py` with one concrete
`PiEventAdapter`. It owns the public sequence and event validation for one Pi
execution.

Its public interface is:

```python
class PiEventAdapter:
    def execution_started(self) -> AgentEventV1: ...
    def adapt_runtime_event(self, payload: dict[str, Any]) -> list[AgentEventV1]: ...
    def tool_started(self, *, turn_id: str, call_id: str, name: str,
                     arguments: Any, started_at: int) -> AgentEventV1: ...
    def tool_progressed(self, *, turn_id: str, call_id: str,
                        value: Any) -> AgentEventV1: ...
    def tool_finished(self, *, turn_id: str, call_id: str, name: str,
                      response: Any, status: AgentToolStatus,
                      finished_at: int, duration_ms: int) -> AgentEventV1: ...
    def usage_updated(self, *, input_tokens: int, output_tokens: int,
                      total_tokens: int) -> AgentEventV1: ...
    def execution_failed(self, *, code: str, message: str,
                         occurred_at: int) -> AgentEventV1: ...
    def execution_finished(self, *, status: AgentExecutionStatus,
                           finished_at: int) -> AgentEventV1: ...
```

The adapter accepts only the Pi runtime's internal segment events in
`adapt_runtime_event`. It removes runtime-supplied `version`, `runId`, and `seq`,
validates the remaining type-specific fields, applies the public execution
identity and next sequence, and returns normalized protocol events.

Tool execution stays in `PiRunner`; only conversion to public events moves into
the adapter. `PiRunner` therefore continues to control plugins, spans,
`CotStep`, legacy model deltas, WebSocket lifetime, and model-visible tool
results.

Future runtime adapters do not need to inherit from Pi or import its internal
WebSocket protocol. Their conformance requirement is simply to emit validated
`AgentEventV1` objects with the lifecycle and ordering rules above.

## Agent service integration

- Move `AgentStreamEvent` out of `agent_response.py` and replace it with the
  runtime-neutral `AgentEventV1` union. Keep a temporary import alias only where
  needed to avoid unrelated churn.
- `AgentResponse(typ="agent_event")` carries an `AgentEventV1` instance.
- `WorkflowAgentRunner` serializes the protocol model with aliases and excludes
  absent optional fields.
- `PiRunner` creates one adapter per run and delegates every public event to it.
- `PiRunner` emits `execution_start` before runtime content, `usage_update` when
  usage arrives, sanitized `execution_error` on handled failures, and one
  `execution_end` on success/error/cancellation when the stream can still yield.
- Existing `reasoning_content`, `content`, `tool_calls`, `CotStep`, and Trace log
  construction remain unchanged.

## Compatibility and staged rollout

The outer browser payload remains:

```json
{
  "choices": [
    {
      "delta": {
        "agent_event": { "version": 1, "runId": "...", "seq": 1 }
      }
    }
  ]
}
```

This phase retains the current `segment_*`, `turn_commit`, and `tool_*` field
shapes. Existing frontend reducers therefore continue rendering the stream.
They ignore newly added lifecycle, error, and usage event types until the
frontend migration, while later recognized events keep their increasing
sequence numbers.

The compatibility projection remains authoritative for old consumers:

- classified final text continues through `content`;
- classified visible analysis continues through `reasoning_content`;
- tool Trace continues through `CotStep` and `tool_calls`;
- non-structured workflows continue through `LegacyRenderer` behavior;
- persisted `AgentStreamState.schemaVersion = 2` remains readable.

No Java schema interpretation or Workflow output schema migration is required.
All services must continue passing unknown `agent_event` types unchanged.

## Frontend AgentExecutionPanel integration plan

The follow-up implementation plan will migrate the frontend in four
independently testable steps:

1. Extend the TypeScript protocol union/parser with execution lifecycle, usage,
   error, and visibility fields while retaining v1 segment/tool parsing.
2. Evolve persisted stream state to store execution status and metrics, with an
   explicit parser migration from schema version 2.
3. Replace `AgentTimeline` internals with `AgentExecutionPanel`, deriving
   thought/message views from committed segment channels and preserving tool
   details, live expansion, one-time terminal collapse, and manual disclosure
   authority.
4. Keep the capability switch based on valid structured events. Streams without
   them use the existing message renderer; no runtime-name or workflow-version
   checks are allowed.

Workflow debug chat and published chat continue importing the same shared
component. The final answer remains outside the execution panel.

## Trace direction

Trace remains behaviorally unchanged in this phase. The protocol creates the
future input to an `Agent Execution Trace` projection containing input,
displayable thought summaries, tools, external-service spans, output, errors,
latency, tokens, and cost.

Raw provider-hidden reasoning and `visibility=runtime` events must not be
persisted. Full user-visible thought text may remain in the live/persisted chat
stream under current retention policy; a future Trace migration stores summaries
and metrics by default.

## Error handling

- Invalid Pi runtime event data raises a Pi adapter error before it can enter the
  public stream.
- A malformed or unsupported public event is ignored by the frontend and does
  not disable legacy content rendering.
- Tool failures remain normal `tool_finish(status=error)` events and are still
  returned to Pi as model-visible tool results.
- Execution failures use sanitized error codes/messages; operational detail
  stays in service logs and spans.
- Cancellation and connection loss preserve all previously received segments
  and tools.
- If cancellation prevents a terminal event from being delivered, consumers
  finalize local state from the transport outcome rather than synthesizing a
  protocol event.

## Testing strategy

Implementation follows test-driven development.

### Protocol contract tests

- validate one fixture for every event type;
- reject missing type-specific required fields and invalid enum values;
- accept additive unknown fields;
- generate the committed JSON Schema deterministically;
- verify serialized field names and omission of absent optionals.

### Pi Adapter tests

- assign one monotonically increasing public sequence across runtime, tool,
  usage, error, and terminal events;
- override runtime-provided identity/sequence fields;
- map displayable segments with `visibility=user`;
- reject unknown Pi internal event types;
- bound tool progress summaries to 200 characters;
- emit matched lifecycle start/end events for success, error, and cancellation;
- sanitize execution errors.

### PiRunner regression tests

- preserve first-token structured and legacy text behavior;
- preserve Python plugin start/progress/finish order;
- preserve `CotStep` Trace arguments and output;
- finish pending wait tools on error/cancellation;
- keep final content, reasoning, usage, and model-visible tool results unchanged.

### Cross-service verification

- run focused Agent, Workflow, Console backend, and frontend reducer tests;
- confirm lifecycle events survive the existing Workflow/Console pass-through;
- run frontend type checking and production build;
- verify a deterministic non-quota Pi tool run before browser acceptance.

## Acceptance criteria

1. Agent Event Protocol v1 has a typed, discriminated schema and committed JSON
   Schema contract independent of Pi.
2. `PiRunner` no longer constructs or validates public `agent_event` dictionaries
   directly; it delegates those responsibilities to `PiEventAdapter`.
3. Public event sequence is monotonic across runtime text, Python tools, usage,
   errors, and lifecycle events.
4. Existing streamed content, reasoning, tool cards, workflow outputs, and Trace
   behavior pass their regression suites.
5. Non-structured workflows and older consumers continue using the legacy
   projection without fabricated reasoning.
6. The frontend follow-up plan names exact files, state migration, tests, and
   rollout checkpoints for `AgentExecutionPanel`.
