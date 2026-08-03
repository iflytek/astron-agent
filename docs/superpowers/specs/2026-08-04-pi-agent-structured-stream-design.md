# Pi Agent Structured Streaming Design

**Date:** 2026-08-04
**Status:** Approved direction; detailed design prepared for implementation

## Context

All ReACT workflow nodes now execute through the Pi agent runtime. The first
integration deliberately waited for `message_end` before classifying normal
assistant text: a turn containing a tool call became reasoning, while the last
turn became final content. That preserved the workflow node's `output` and
`REASONING_CONTENT` semantics, but caused three user-visible regressions:

1. final text no longer appeared token by token;
2. text generated before cancellation could be lost;
3. tool arguments and responses were flattened into a large Markdown JSON block
   inside reasoning.

The Pi 0.83 SDK provides `text_start/delta/end`,
`thinking_start/delta/end`, and `toolcall_start/delta/end` before
`message_end`. We can therefore stream the original events without parsing
model-authored Markdown.

## Goals

- Stream Pi final-answer text from the first token in both workflow debug chat
  and the published user chat.
- Stream provider-native thinking and Pi's pre-tool explanatory text.
- Preserve already received text when a run is cancelled, aborted, or fails.
- Keep workflow string outputs correct: `output` contains the final answer and
  `REASONING_CONTENT` contains textual reasoning only.
- Represent tool execution as structured, chronological cards. Only tool
  `arguments` and `response` are collapsible; they must never be injected as raw
  JSON into reasoning text.
- Default large tool values to a compact summary and provide `查看全部`, `收起`,
  and `复制完整内容` actions.
- Preserve existing Trace persistence and non-Pi/OpenAI-compatible consumers.

## Non-goals

- No workflow-editor configuration or schema changes are required from users.
- This change does not redesign the Trace log page or its Elasticsearch storage.
- It does not replay the quota-bearing Zhiwen PPT workflow during unit or
  integration verification.
- It does not make tool responses part of workflow variable output; tool data
  remains observable through cards and Trace, while Pi consumes it internally.

## Architectural decision

Use a versioned structured turn-event protocol and retain the existing textual
fields as a compatibility and persistence projection.

The same Pi response has two projections:

1. **Structured live projection** — lossless segment and tool lifecycle events.
   New Astron frontends consume this projection for immediate rendering.
2. **Legacy text projection** — `content`, `reasoning_content`, and
   `tool_calls`. Workflow aggregation and older API consumers keep using these
   fields. Ambiguous normal text is emitted here only after it is classified.

This avoids relying on Markdown conventions and avoids an impossible rollback
in clients that only concatenate OpenAI-compatible string deltas.

## Event envelope

The agent service adds an optional `agent_event` to
`choices[0].delta`. Existing fields remain unchanged.

```json
{
  "version": 1,
  "runId": "workflow-run-id",
  "seq": 12,
  "turnId": "turn-3",
  "type": "segment_delta",
  "segmentId": "turn-3-text-0",
  "delta": "正在查询"
}
```

`seq` is monotonic within `runId`; the reducer uses `(runId, seq)` for
idempotency. The Python `PiRunner` is the single sequence authority because it
combines model-stream events with Python-side plugin lifecycle events. The Pi
runtime supplies stable `turnId`, `segmentId`, and `callId` values but does not
create a competing public sequence. These IDs remain stable across all events
for their respective entity. The workflow layer adds normal node metadata in
`workflow_step`; the event itself stays transport-independent.

### Text event types

| Type | Required data | Meaning |
| --- | --- | --- |
| `segment_start` | `turnId`, `segmentId`, `source`, `channel` | Starts a `thinking` or normal `text` segment. Normal text starts as `pending`; provider thinking starts as `reasoning`. |
| `segment_delta` | `turnId`, `segmentId`, `delta` | Appends exactly one provider delta. |
| `segment_end` | `turnId`, `segmentId` | The provider closed the content block; classification may still be pending. |
| `turn_commit` | `turnId`, `channel`, `partial`, `reason` | Atomically classifies every pending normal-text segment in the turn as `reasoning` or `content`. |

`source` is `text` or `thinking`. `channel` is `pending`, `reasoning`, or
`content`. `reason` is one of `tool_call`, `message_end`, `cancelled`, or
`error`.

### Tool event types

| Type | Required data | Meaning |
| --- | --- | --- |
| `tool_start` | `callId`, `turnId`, `name`, `arguments`, `startedAt` | The call was accepted and is about to execute. |
| `tool_progress` | `callId`, `summary` | Replaces the card's latest compact progress text. It does not append raw payloads to reasoning. |
| `tool_finish` | `callId`, `response`, `status`, `finishedAt`, `durationMs` | Completes the card with `success`, `error`, or `cancelled`. |

Arguments and responses are JSON values, not JSON-encoded strings. A plugin
exception produces a normal `tool_finish(status=error)` before the error result
is returned to Pi, so the UI and model observe the same outcome.

## Turn state machine

### Provider-native thinking

1. `thinking_start` creates a `reasoning` segment.
2. Every `thinking_delta` is immediately forwarded as `segment_delta` and as a
   legacy `reasoning_content` delta.
3. `thinking_end` closes the segment. No later reclassification is needed.

### Normal text followed by a tool call

1. `text_start/delta` creates and streams a `pending` segment.
2. The UI optimistically shows pending text in the live answer position so the
   user sees the first token immediately.
3. At the first `toolcall_start`, the runtime emits
   `turn_commit(channel=reasoning, reason=tool_call)`.
4. The reducer atomically removes the pending segment from the answer and inserts
   it into the chronological thinking timeline. The runtime emits its buffered
   text once as legacy `reasoning_content` for workflow string aggregation.
5. Tool cards then appear and update in that same timeline.

There is an inherent short optimistic interval: before the model emits
`toolcall_start`, no protocol can know that the current text will be followed by
a tool. The stable segment identity makes correction deterministic and prevents
duplicate text.

### Normal text without a tool call

1. `text_start/delta` streams a pending segment into the live answer position.
2. At `message_end`, the runtime emits
   `turn_commit(channel=content, reason=message_end)`.
3. The segment stays in the answer. Its buffered text is emitted once through
   legacy `content` so workflow variables, persistence, and old clients remain
   correct.

### Cancellation, abort, and error

The runtime tracks the active turn and all uncommitted segments. Before emitting
an error or closing an otherwise live socket it commits the active turn with
`partial=true`:

- if a tool call was observed, commit to `reasoning`;
- otherwise, commit to `content`.

The Python bridge forwards this event before raising the workflow-visible error.
If the transport is already unavailable, both frontends finalize any local
pending segments using the same rule when their stream ends. No received delta is
deleted. A partial marker remains in state so the UI may label the text as
interrupted without changing the text itself.

## Backend data flow

```text
Pi SDK events
  -> Pi runtime WebSocket protocol
  -> PiRunner AgentResponse(agent_event)
  -> WorkflowAgentRunner delta.agent_event
  -> Agent node streaming queue
  -> connected Message/End output node
  -> workflow SSE
  -> shared frontend reducer
```

### Pi runtime

- Translate SDK content indices into stable segment IDs.
- Stream every delta immediately.
- Commit pending normal text on the first tool call, normal message end, or
  abnormal termination.
- Continue sending the existing legacy deltas at classification time.
- Keep the current remote-tool bridge; its `tool_call` message already occurs
  immediately before Python executes a remote tool.
- Associate every SDK `toolcall_end` call ID with its turn ID so the later
  remote-tool request carries the correct `turnId`.
- Emit the local `wait` tool through the same start/finish lifecycle.

### Agent service

- Add `agent_event` as an `AgentResponse` variant and an optional field on the
  completion delta schema.
- On receipt of a remote `tool_call`, yield `tool_start` before awaiting the
  plugin and `tool_finish` after it returns or throws.
- Treat streamed plugin content as tool progress/result material, not top-level
  assistant `content` or `reasoning_content`.
- Continue yielding the final `CotStep` so existing node Trace construction is
  unchanged.
- Keep legacy `tool_calls` for compatible API consumers, but attach stable
  `callId` and lifecycle status where the schema permits.

### Workflow service

- Carry optional `agent_event` through `AgentFrameProcessor`,
  `OutputNodeFrameData`, output caches, and `on_node_process` without converting
  it to text.
- Process event-only frames in a separate branch so an empty content/reasoning
  payload cannot accidentally mark either text stream as complete.
- Forward an event only along the existing Agent-to-Message/End streaming
  dependency. An unused or unrelated branch does not appear in user output.
- Do not call `extract_tool_calls_content` for Pi tool calls. Tool arguments and
  responses therefore stop being appended to the Agent node's
  `REASONING_CONTENT` string.
- Continue accumulating classified legacy text into Agent outputs, End-node
  fields, audit, and persistence exactly as before.

### Console backend

The workflow chat bridge already passes unknown fields in workflow SSE objects
through to the browser. It must retain `choices[0].delta.agent_event` unchanged;
no second event model is introduced in Java. Completion and interruption paths
must not replace the last browser-visible partial message with an empty fallback.

## Frontend state model

Create one shared, pure reducer used by workflow debug chat and published chat.
It stores:

- ordered segment records keyed by `segmentId`;
- ordered tool records keyed by `callId`;
- seen event sequences keyed by `runId`;
- committed reasoning text, committed content text, and current pending text;
- partial/interrupted flags.

Reducer operations are idempotent. A repeated `tool_finish` replaces the same
card; it never creates a duplicate. A `turn_commit` changes selectors, not the
segment text, so reclassification is atomic in React.

For mixed or legacy workflows:

- before the first structured event, existing `content` and
  `reasoning_content` rendering is unchanged;
- once structured events are present for a Pi run, the structured reducer owns
  its live text and cards, preventing double rendering;
- the End-node legacy answer remains the authoritative persisted/formatted
  answer. While it is empty, the structured committed or pending content is used
  as the live draft. When End-node content arrives, it replaces that draft. This
  preserves templates that add prefixes, suffixes, or other formatting.

The workflow debugger stores the event list in its existing JSON answer record so
completed local debug entries keep their cards. Published chat keeps the timeline
on the bot message after streaming completes. Server-side historical persistence
may store the same optional list when the current chat-record path supports
arbitrary detail, but is not required to change the public workflow output
schema.

## Timeline and tool-card UI

Reasoning text remains normal streamed Markdown. Tool calls are inserted between
reasoning segments according to event sequence.

Each tool card shows an always-visible header:

- tool name;
- running, succeeded, failed, or cancelled status;
- elapsed duration when known.

The card body is collapsed by default. When opened it contains separate
`Arguments` and `Response` sections. Each section:

- preserves the original structured value;
- pretty-renders valid JSON only after expansion;
- offers `复制完整内容` using the full serialized value;
- for values at or above 8 KiB, initially shows only a type-aware summary such
  as `Object · 18 fields · 42.6 KiB` or `Array · 240 items · 96.1 KiB`;
- offers `查看全部` and `收起` without truncating the stored value.

The latest tool progress is a short status line in the header/body. Repeated
progress payloads replace one another instead of building an unbounded history.
The component uses the repository's existing JSON viewer and introduces no new
frontend package.

Both target surfaces use the same component:

1. workflow editor **调试与预览** answer panel;
2. published user chat answer bubble.

The existing Trace log button and Trace detail UI are unaffected.

## Error, size, and security behavior

- Malformed or unknown versioned events are ignored with a development warning;
  legacy text continues to render.
- Unknown event fields are tolerated for forward compatibility.
- Tool values are never interpolated as HTML. JSON and plain-text renderers
  escape values before display.
- Copy uses the original serialized value, not a rendered/truncated DOM string.
- Large values are held once per completed tool record and are not repeatedly
  pretty-serialized on each token update.
- No tool response is added to model-facing prompts beyond the existing Pi tool
  result path, and no API key or model credential is added to events.

## Testing strategy

Implementation follows test-driven development.

### Pi runtime unit tests

- text deltas are emitted before `message_end`;
- text plus tool call commits to reasoning exactly once;
- final text commits to content exactly once;
- native thinking streams without reclassification;
- abort/error commits buffered partial text;
- SDK content indices create stable, non-colliding segment IDs;
- local wait and remote tools emit matched start/finish events.

### Agent service tests

- structured events round-trip through the WebSocket bridge;
- tool start is yielded before plugin execution completes;
- success, plugin error, and cancellation produce the right finish status;
- streamed plugin payloads no longer become top-level answer/reasoning text;
- CotStep Trace data remains present and includes the same arguments/response.

### Workflow service tests

- `agent_event` survives Agent frame processing and Message/End output streaming;
- tool JSON is not appended to `REASONING_CONTENT`;
- classified content/reasoning strings still populate node outputs;
- events only reach output nodes that depend on the Agent node;
- normal non-Pi frames remain unchanged.

### Frontend tests

- reducer streams pending text, then atomically commits it to content or
  reasoning;
- duplicate sequence numbers and repeated tool events are idempotent;
- cancellation retains partial text;
- tool cards are chronological and default collapsed;
- large JSON shows a summary, expands on demand, and copies the full value;
- workflow debug and published chat use the same reducer/component;
- legacy SSE without `agent_event` still renders.

### Verification

- Run focused TypeScript, Python, workflow, and frontend test suites.
- Run frontend type checking and the relevant package build.
- Use a deterministic fake Pi stream for end-to-end protocol verification.
- Perform browser acceptance with a non-quota fake/local tool workflow. Do not
  create another Zhiwen PPT task merely to verify rendering.

## Acceptance criteria

1. The first final-answer token is visible before `message_end` in both target
   surfaces.
2. Provider thinking and pre-tool Pi text appear incrementally.
3. Cancelling after visible text leaves that text visible and marked partial.
4. Tool arguments/responses appear only in collapsible cards, never as raw JSON
   inside reasoning.
5. Large tool JSON starts collapsed, has a formatted summary, expands fully, and
   copies the complete value.
6. Agent `output`, `REASONING_CONTENT`, and Trace remain semantically correct.
7. Existing non-structured workflow/chat streams still render normally.
