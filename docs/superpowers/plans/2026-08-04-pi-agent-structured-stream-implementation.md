# Pi Agent Structured Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream Pi answer/thinking tokens immediately and render tool arguments/responses as structured collapsible cards in workflow debug and published chat without changing workflow string-output or Trace semantics.

**Architecture:** Pi emits versioned segment lifecycle events while retaining classified legacy text deltas. The Python agent bridge is the single public event-sequence authority and adds tool lifecycle events. Workflow transports the optional event alongside, never inside, text; a shared React reducer powers both requested UI surfaces.

**Tech Stack:** TypeScript 5.9, `@earendil-works/pi-agent-core` 0.83, Python 3.11/Pydantic/aiohttp, React 18/Zustand/Ant Design/`react-json-view`, Node test runner, pytest.

## Global Constraints

- No workflow-editor configuration or node schema change is exposed to users.
- `output` contains final-answer text; `REASONING_CONTENT` contains textual reasoning only.
- Tool `arguments` and `response` never become raw Markdown/JSON inside reasoning.
- Tool cards are collapsed by default; values at or above 8 KiB show a summary before full expansion.
- Both workflow **调试与预览** and published chat use the same reducer and card components.
- Existing Trace persistence and final `CotStep` generation remain intact.
- Existing SSE without `agent_event` keeps rendering through the legacy path.
- Do not add a frontend dependency.
- Do not run a quota-bearing Zhiwen PPT generation during verification.

---

## File structure

### Pi runtime

- `core/pi-agent/src/protocol.ts` — internal WebSocket and structured event types.
- `core/pi-agent/src/turn-stream.ts` — one-turn segment state machine; no socket or SDK dependencies.
- `core/pi-agent/src/run-agent.ts` — translates SDK events and projects classified legacy text.
- `core/pi-agent/src/tool-bridge.ts` — preserves the turn ID when a remote tool executes later.
- `core/pi-agent/test/turn-stream.test.ts` — deterministic classification/partial tests.
- `core/pi-agent/test/run-agent.test.ts` — SDK-to-WebSocket integration tests.

### Agent service

- `core/agent/api/schemas/agent_response.py` — typed internal `AgentStreamEvent` payload.
- `core/agent/api/schemas/completion_chunk.py` — optional public `agent_event` delta.
- `core/agent/engine/nodes/pi/pi_runner.py` — public sequencing and tool start/progress/finish events.
- `core/agent/service/runner/workflow_agent_runner.py` — `AgentResponse` to completion-chunk projection.
- `core/agent/tests/test_pi_runner.py` — WebSocket and tool lifecycle tests.
- `core/agent/tests/test_workflow_agent_runner.py` — public chunk/Trace compatibility tests.

### Workflow service

- `core/workflow/engine/nodes/util/frame_processor.py` — extracts structured events without Markdown conversion.
- `core/workflow/engine/nodes/base_node.py` — transports event-only frames without changing text completion state.
- `core/workflow/engine/nodes/agent/agent_node.py` — stops appending tool JSON to reasoning output.
- `core/workflow/engine/callbacks/openai_types_sse.py` — optional event in workflow SSE delta.
- `core/workflow/engine/callbacks/callback_handler.py` — passes event through `on_node_process`.
- `core/workflow/tests/engine/nodes/util/test_frame_processor.py` — frame extraction and legacy tests.
- `core/workflow/tests/engine/nodes/test_agent_event_stream.py` — event-only output transport test.
- `core/workflow/tests/engine/callbacks/test_callback_handler.py` — SSE serialization test.

### Shared frontend and integrations

- `console/frontend/src/components/agent-stream/types.ts` — event/state/timeline types.
- `console/frontend/src/components/agent-stream/reducer.ts` — pure idempotent reducer and selectors.
- `console/frontend/src/components/agent-stream/tool-value.ts` — lazy summary/full serialization helpers.
- `console/frontend/src/components/agent-stream/tool-card.tsx` — collapsible tool UI.
- `console/frontend/src/components/agent-stream/agent-timeline.tsx` — chronological reasoning/tool renderer.
- `console/frontend/src/components/agent-stream/index.ts` — public shared exports.
- `console/frontend/_tests_/agent-stream-reducer.test.ts` — state-machine tests.
- `console/frontend/_tests_/agent-tool-value.test.ts` — 8 KiB summary/copy-source tests.
- `console/frontend/src/components/workflow/types/drawer/chat-debugger.ts` — optional structured state on debug messages.
- `console/frontend/src/components/workflow/store/flow-chat-function.ts` — consumes debug SSE events.
- `console/frontend/src/components/workflow/drawer/chat-debugger/components/chat-content.tsx` — shared timeline/live answer.
- `console/frontend/src/types/chat.ts` — optional structured state on published messages.
- `console/frontend/src/store/chat-store.ts` — streaming message event action.
- `console/frontend/src/hooks/use-chat.ts` — consumes published SSE events and finalizes partial state.
- `console/frontend/src/pages/chat-page/components/message-list.tsx` — shared timeline/live answer.

---

### Task 1: Pi turn-segment protocol and state machine

**Files:**
- Create: `core/pi-agent/src/turn-stream.ts`
- Create: `core/pi-agent/test/turn-stream.test.ts`
- Modify: `core/pi-agent/src/protocol.ts`
- Modify: `core/pi-agent/src/tool-bridge.ts`
- Modify: `core/pi-agent/src/run-agent.ts`
- Test: `core/pi-agent/test/run-agent.test.ts`

**Interfaces:**
- Produces `PiStreamEvent`, a version-1 union with `segment_start`, `segment_delta`, `segment_end`, and `turn_commit` payloads.
- Produces `TurnStreamProjector.startTurn(turnId)`, `handle(update)`, `markToolCall()`, `finishMessage(stopReason)`, and `flushPartial(reason)`.
- Extends internal `tool_call` with required `turnId`.
- Keeps existing `reasoning_delta`, `content_delta`, `tool_call`, `tool_completed`, `usage`, `error`, and `done` messages.

- [ ] **Step 1: Write failing state-machine tests**

```ts
const usage = () => ({
  input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});
const baseMessage = {
  role: "assistant", content: [], api: "openai-completions",
  provider: "openai", model: "fake-model", usage: usage(),
  stopReason: "stop", timestamp: 1,
} satisfies AssistantMessage;

it("streams text before committing a final turn", () => {
  const projector = new TurnStreamProjector("run-1");
  projector.startTurn("turn-1");
  const events = projector.handle({
    type: "text_delta", contentIndex: 0, delta: "Hi",
    partial: { ...baseMessage, content: [{ type: "text", text: "Hi" }] },
  });
  expect(events).toMatchObject([
      { type: "segment_start", segmentId: "turn-1-text-0", channel: "pending" },
      { type: "segment_delta", segmentId: "turn-1-text-0", delta: "Hi" },
  ]);
  expect(projector.finishMessage("stop").legacyContent).toBe("Hi");
});

it("reclassifies pre-tool text and keeps aborted partial text", () => {
  const projector = new TurnStreamProjector("run-1");
  projector.startTurn("turn-1");
  projector.handle({
    type: "text_delta", contentIndex: 0, delta: "Checking",
    partial: { ...baseMessage, content: [{ type: "text", text: "Checking" }] },
  });
  expect(projector.markToolCall().legacyReasoning).toBe("Checking");
  const partial = new TurnStreamProjector("run-1");
  partial.startTurn("turn-2");
  partial.handle({
    type: "text_delta", contentIndex: 0, delta: "Partial",
    partial: { ...baseMessage, content: [{ type: "text", text: "Partial" }] },
  });
  const aborted = partial.flushPartial("cancelled");
  expect(aborted.events.at(-1)).toMatchObject({
    type: "turn_commit", channel: "content", partial: true,
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `cd core/pi-agent && npm test -- --run test/turn-stream.test.ts`

Expected: FAIL because `TurnStreamProjector` and `PiStreamEvent` do not exist.

- [ ] **Step 3: Implement the event types and pure projector**

```ts
export type PiStreamEvent =
  | { version: 1; runId: string; type: "segment_start"; turnId: string; segmentId: string; source: "text" | "thinking"; channel: "pending" | "reasoning" }
  | { version: 1; runId: string; type: "segment_delta"; turnId: string; segmentId: string; delta: string }
  | { version: 1; runId: string; type: "segment_end"; turnId: string; segmentId: string }
  | { version: 1; runId: string; type: "turn_commit"; turnId: string; channel: "reasoning" | "content"; partial: boolean; reason: "tool_call" | "message_end" | "cancelled" | "error" };

export class TurnStreamProjector {
  startTurn(turnId: string): void;
  handle(update: AssistantMessageEvent): PiStreamEvent[];
  markToolCall(): CommitProjection;
  finishMessage(stopReason: string): CommitProjection;
  flushPartial(reason: "cancelled" | "error"): CommitProjection;
}
```

The projector lazily creates missing starts when a provider emits a delta without
the corresponding start, buffers normal text by `contentIndex`, streams every
delta, and makes `commit` idempotent.

- [ ] **Step 4: Connect SDK events and remote-tool turn IDs**

```ts
if (event.type === "turn_start") projector.startTurn(`turn-${++turnNumber}`);
if (event.type === "message_update") {
  for (const agentEvent of projector.handle(event.assistantMessageEvent)) {
    await send({ type: "agent_event", event: agentEvent });
  }
  if (event.assistantMessageEvent.type === "toolcall_end") {
    toolBridge.bindTurn(event.assistantMessageEvent.toolCall.id, projector.turnId);
  }
}
```

At the first `toolcall_start`, send the reasoning commit and its one-time legacy
reasoning projection. At normal `message_end`, send the content commit and its
one-time legacy content projection. In `finally`, call `flushPartial` before the
bridge is aborted. `ToolBridge.execute` reads and deletes the bound turn ID and
sends it in `tool_call`.

- [ ] **Step 5: Expand run-agent integration tests**

Add a mock stream that emits `text_start`, two `text_delta` events, and only
later `toolcall_start`. Assert both deltas precede `turn_commit`, the commit is
reasoning, and exactly one legacy reasoning string is sent. Add the corresponding
no-tool and aborted cases.

- [ ] **Step 6: Run Pi tests, typecheck, and commit**

Run:

```bash
cd core/pi-agent
npm test -- --run test/turn-stream.test.ts test/run-agent.test.ts test/tool-bridge.test.ts
npm run typecheck
```

Expected: all tests pass and TypeScript reports no errors.

Commit:

```bash
git add core/pi-agent/src/protocol.ts core/pi-agent/src/turn-stream.ts core/pi-agent/src/tool-bridge.ts core/pi-agent/src/run-agent.ts core/pi-agent/test/turn-stream.test.ts core/pi-agent/test/run-agent.test.ts core/pi-agent/test/tool-bridge.test.ts
git commit -m "feat(pi-agent): stream structured turn segments"
```

---

### Task 2: Agent bridge sequencing and tool lifecycle

**Files:**
- Modify: `core/agent/api/schemas/agent_response.py`
- Modify: `core/agent/api/schemas/completion_chunk.py`
- Modify: `core/agent/engine/nodes/pi/pi_runner.py`
- Modify: `core/agent/service/runner/workflow_agent_runner.py`
- Test: `core/agent/tests/test_pi_runner.py`
- Test: `core/agent/tests/test_workflow_agent_runner.py`

**Interfaces:**
- Consumes internal WebSocket `{type:"agent_event", event: PiStreamEvent}` and tool messages with `turnId`.
- Produces `AgentStreamEvent` with Python-assigned `seq` and millisecond timing.
- Produces `ReasonChoiceDelta.agent_event: dict[str, Any] | None`.
- Tool lifecycle is `tool_start -> zero or more tool_progress -> tool_finish`; final `CotStep` remains separate.

- [ ] **Step 1: Write failing schema and event projection tests**

```py
event = AgentStreamEvent(
    version=1, runId="run-1", seq=1, type="segment_delta",
    turnId="turn-1", segmentId="turn-1-text-0", delta="Hi",
)
message = AgentResponse(typ="agent_event", content=event, model="model")
chunk = await runner.convert_message(message, span, node_trace)
assert chunk.choices[0].delta.agent_event == event.model_dump(exclude_none=True)
```

Add a WebSocket test whose plugin waits on an `asyncio.Event`; assert the first
yield is `tool_start` before releasing the plugin and the later order is
`tool_finish`, then `cot_step`.

- [ ] **Step 2: Run focused Agent tests and confirm RED**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_runner.py tests/test_workflow_agent_runner.py -q
```

Expected: FAIL because the schema rejects `agent_event` and no tool start is
yielded.

- [ ] **Step 3: Add typed event schema and public delta field**

```py
class AgentStreamEvent(BaseModel):
    model_config = ConfigDict(extra="allow")
    version: Literal[1] = 1
    runId: str
    seq: int
    type: Literal[
        "segment_start", "segment_delta", "segment_end", "turn_commit",
        "tool_start", "tool_progress", "tool_finish",
    ]
    turnId: str | None = None
    segmentId: str | None = None
    callId: str | None = None

class ReasonChoiceDelta(ChoiceDelta):
    reasoning_content: str | None = None
    agent_event: dict[str, Any] | None = None
```

Extend `AgentResponse.typ` with `agent_event` and its content union with
`AgentStreamEvent`.

- [ ] **Step 4: Make PiRunner the sequence authority**

```py
def _agent_event(self, payload: dict[str, Any]) -> AgentResponse:
    self._event_seq += 1
    event_data = {
        **payload["event"],
        "runId": self.run_id,
        "seq": self._event_seq,
    }
    event = AgentStreamEvent.model_validate(event_data)
    return AgentResponse(typ="agent_event", content=event, model=self.model_config.id)
```

Initialize `_event_seq` per `run()` invocation. Do not accept a public `seq`
from the runtime.

- [ ] **Step 5: Emit start/progress/finish around Python plugin execution**

```py
started_at = cur_timestamp()
yield self._tool_event("tool_start", call_id, turn_id, name=plugin.name,
                       arguments=arguments, startedAt=started_at)
async for execution in self._execute_plugin(plugin, arguments, tool_span):
    if execution.progress is not None:
        yield self._tool_event("tool_progress", call_id, turn_id,
                               summary=execution.progress)
    result = execution.result or result
finished_at = cur_timestamp()
yield self._tool_event("tool_finish", call_id, turn_id,
                       response=action_output,
                       status="error" if result.code else "success",
                       finishedAt=finished_at,
                       durationMs=max(0, finished_at - started_at))
```

Change `_ExecutionEvent` to carry `progress: str | None` rather than a top-level
`AgentResponse`. Summarize streaming plugin values to at most 200 Unicode
characters for progress, while retaining the complete final `PluginResponse`.
Apply the same event lifecycle to local `wait`; suppress duplicate finish events
using the existing `handled_calls` set.

```py
def _progress_summary(value: Any) -> str:
    text = value if isinstance(value, str) else json.dumps(
        value, ensure_ascii=False, separators=(",", ":")
    )
    return text if len(text) <= 200 else f"{text[:199]}…"
```

- [ ] **Step 6: Project events without changing CotStep Trace**

In `WorkflowAgentRunner.convert_message`, assign
`chunk.choices[0].delta.agent_event` for `agent_event`. Leave
`_handle_cot_step` and `_handle_plugin_trace` intact. Tests must assert both the
structured finish event and the existing Trace `NodeLog` contain the same tool
arguments/response.

- [ ] **Step 7: Run tests and commit**

Run:

```bash
cd core/agent
uv run pytest tests/test_pi_runner.py tests/test_workflow_agent_runner.py tests/test_router_and_schemas.py -q
```

Commit:

```bash
git add core/agent/api/schemas/agent_response.py core/agent/api/schemas/completion_chunk.py core/agent/engine/nodes/pi/pi_runner.py core/agent/service/runner/workflow_agent_runner.py core/agent/tests/test_pi_runner.py core/agent/tests/test_workflow_agent_runner.py core/agent/tests/test_router_and_schemas.py
git commit -m "feat(agent): expose structured Pi tool events"
```

---

### Task 3: Workflow event transport and removal of raw tool JSON

**Files:**
- Modify: `core/workflow/engine/nodes/util/frame_processor.py`
- Modify: `core/workflow/engine/nodes/base_node.py`
- Modify: `core/workflow/engine/nodes/agent/agent_node.py`
- Modify: `core/workflow/engine/callbacks/openai_types_sse.py`
- Modify: `core/workflow/engine/callbacks/callback_handler.py`
- Test: `core/workflow/tests/engine/nodes/util/test_frame_processor.py`
- Create: `core/workflow/tests/engine/nodes/test_agent_event_stream.py`
- Test: `core/workflow/tests/engine/callbacks/test_callback_handler.py`

**Interfaces:**
- Consumes `choices[0].delta.agent_event`.
- Produces `OutputNodeFrameData.agent_event: dict[str, Any] | None` and workflow SSE with the same value.
- `agent_event` frames do not modify reasoning/content completion flags or variable strings.

- [ ] **Step 1: Write failing frame and callback tests**

```py
def test_agent_frame_keeps_structured_event_out_of_reasoning() -> None:
    event = {"version": 1, "runId": "run-1", "seq": 1,
             "type": "tool_start", "callId": "call-1"}
    frame = AgentFrameProcessor().process_frame({
        "choices": [{"delta": {"agent_event": event}, "finish_reason": None}]
    })
    assert frame.text == {"content": "", "reasoning_content": "",
                          "agent_event": event}

def test_agent_tool_call_is_not_markdown_reasoning() -> None:
    frame = AgentFrameProcessor().process_frame({
        "choices": [{
            "delta": {"tool_calls": [{
                "type": "tool",
                "function": {
                    "name": "status",
                    "arguments": "{\"id\":\"7\"}",
                    "response": "{\"ready\":true}",
                },
            }]},
            "finish_reason": None,
        }]
    })
    assert frame.text["reasoning_content"] == ""
```

Add an async output-node test with an event-only `StreamOutputMsg`; assert one
callback frame contains `delta.agent_event` and the later content frame still
streams normally.

- [ ] **Step 2: Run focused Workflow tests and confirm RED**

Run:

```bash
cd core/workflow
uv run pytest tests/engine/nodes/util/test_frame_processor.py tests/engine/nodes/test_agent_event_stream.py tests/engine/callbacks/test_callback_handler.py -q
```

Expected: FAIL because events are dropped and tool calls become Markdown.

- [ ] **Step 3: Add the optional transport field**

```py
class OutputNodeFrameData(BaseModel):
    content: str = ""
    reasoning_content: str = ""
    agent_event: dict[str, Any] | None = None
    data_type: str = "text"
    is_end: bool = False
    exception_occurred: bool = False

class Delta(BaseModel):
    role: str = "assistant"
    content: str = ""
    reasoning_content: str = ""
    agent_event: dict[str, Any] | None = None
```

Thread the optional argument through `LLMGenerate._common`, `node_process`, and
`ChatCallBacks.on_node_process`.

- [ ] **Step 4: Forward event-only frames without changing text state**

In `AgentFrameProcessor`, return the original structured value and never invoke
`extract_tool_calls_content`. At the top of `_process_queue_output`, after frame
validation but before `_yield_output`, handle events separately:

```py
agent_event = text.get("agent_event")
if agent_event is not None:
    yield OutputNodeFrameData(agent_event=agent_event)
    if not content and not reasoning_content:
        continue
```

In `deal_output_stream_msg`, forward `agent_event` through
`callbacks.on_node_process(code=0, node_id=self.node_id,
alias_name=self.alias_name, message=output_node_frame_data.content,
reasoning_content=output_node_frame_data.reasoning_content,
agent_event=output_node_frame_data.agent_event)`. Do not add it to string caches. This preserves
the existing dependency routing and prevents event-only frames from closing the
reasoning stream.

- [ ] **Step 5: Stop tool-call text pollution in Agent output aggregation**

Remove the `extract_tool_calls_content(tool_calls)` append from
`AgentNode._process_stream_response`. Keep forwarding the original chunk into
`put_stream_content`, so structured events and legacy `tool_calls` remain
available to consumers that understand them. Assert the returned
`reasoning_content_list` contains only model-authored reasoning text.

- [ ] **Step 6: Run Workflow tests and commit**

Run:

```bash
cd core/workflow
uv run pytest tests/engine/nodes/util/test_frame_processor.py tests/engine/nodes/test_agent_event_stream.py tests/engine/callbacks/test_callback_handler.py tests/service/test_chat_service_response_filter.py -q
```

Commit:

```bash
git add core/workflow/engine/nodes/util/frame_processor.py core/workflow/engine/nodes/base_node.py core/workflow/engine/nodes/agent/agent_node.py core/workflow/engine/callbacks/openai_types_sse.py core/workflow/engine/callbacks/callback_handler.py core/workflow/tests/engine/nodes/util/test_frame_processor.py core/workflow/tests/engine/nodes/test_agent_event_stream.py core/workflow/tests/engine/callbacks/test_callback_handler.py
git commit -m "feat(workflow): carry structured agent events"
```

---

### Task 4: Shared frontend reducer and selectors

**Files:**
- Create: `console/frontend/src/components/agent-stream/types.ts`
- Create: `console/frontend/src/components/agent-stream/reducer.ts`
- Create: `console/frontend/_tests_/agent-stream-reducer.test.ts`

**Interfaces:**
- Produces `AgentEventV1`, `AgentStreamState`, `parseAgentEvent(value)`, `createAgentStreamState()`, `reduceAgentEvent(state,event)`, `finalizePendingSegments(state,reason)`, `selectReasoningTimeline(state)`, and `selectLiveContent(state)`.
- State is JSON-serializable; dedupe keys use a plain record, not `Set`.

- [ ] **Step 1: Write failing reducer tests**

```ts
const segmentStart = (seq: number): AgentEventV1 => ({
  version: 1, runId: 'run-1', seq, type: 'segment_start',
  turnId: 'turn-1', segmentId: 'turn-1-text-0', source: 'text',
  channel: 'pending',
});
const segmentDelta = (seq: number): AgentEventV1 => ({
  version: 1, runId: 'run-1', seq, type: 'segment_delta',
  turnId: 'turn-1', segmentId: 'turn-1-text-0', delta: 'Checking',
});
const reasoningCommit = (seq: number): AgentEventV1 => ({
  version: 1, runId: 'run-1', seq, type: 'turn_commit',
  turnId: 'turn-1', channel: 'reasoning', partial: false,
  reason: 'tool_call',
});
const toolStarted = (seq: number): AgentEventV1 => ({
  version: 1, runId: 'run-1', seq, type: 'tool_start',
  turnId: 'turn-1', callId: 'call-1', name: 'status',
  arguments: { id: '7' }, startedAt: 1,
});
const toolFinished = (seq: number): AgentEventV1 => ({
  version: 1, runId: 'run-1', seq, type: 'tool_finish',
  turnId: 'turn-1', callId: 'call-1', response: { ready: true },
  status: 'success', finishedAt: 2, durationMs: 1,
});

test('pending answer becomes reasoning without duplicate text', () => {
  let state = createAgentStreamState();
  state = reduceAgentEvent(state, segmentStart(1));
  state = reduceAgentEvent(state, segmentDelta(2));
  assert.equal(selectLiveContent(state), 'Checking');
  state = reduceAgentEvent(state, reasoningCommit(3));
  assert.equal(selectLiveContent(state), '');
  assert.equal(selectReasoningTimeline(state)[0]?.text, 'Checking');
});

test('duplicate seq and repeated tool finish are idempotent', () => {
  const once = reduceAgentEvent(createAgentStreamState(), toolStarted(1));
  const twice = reduceAgentEvent(once, toolStarted(1));
  assert.deepEqual(twice, once);
  const finished = reduceAgentEvent(twice, toolFinished(2));
  assert.equal(Object.keys(finished.tools).length, 1);
});

test('unknown versions are rejected before reduction', () => {
  assert.equal(parseAgentEvent({ version: 2, type: 'segment_delta' }), null);
});
```

- [ ] **Step 2: Run the reducer test and confirm RED**

Run: `cd console/frontend && npm run test:unit -- _tests_/agent-stream-reducer.test.ts`

Expected: FAIL because the shared module does not exist.

- [ ] **Step 3: Implement serializable normalized state**

```ts
export interface AgentStreamState {
  hasStructuredEvents: boolean;
  segments: Record<string, AgentSegment>;
  tools: Record<string, AgentToolRecord>;
  seen: Record<string, true>;
  hasObservedToolByTurn: Record<string, true>;
  interrupted: boolean;
}

export const reduceAgentEvent = (
  state: AgentStreamState,
  event: AgentEventV1
): AgentStreamState => {
  const key = `${event.runId}:${event.seq}`;
  if (state.seen[key]) return state;
  const next = structuredClone(state);
  next.seen[key] = true;
  next.hasStructuredEvents = true;
  if (event.type === 'segment_start') {
    next.segments[event.segmentId] = {
      segmentId: event.segmentId, turnId: event.turnId, source: event.source,
      channel: event.channel, text: '', order: event.seq, ended: false,
      partial: false,
    };
  } else if (event.type === 'segment_delta') {
    const segment = next.segments[event.segmentId];
    if (segment) segment.text += event.delta;
  } else if (event.type === 'segment_end') {
    const segment = next.segments[event.segmentId];
    if (segment) segment.ended = true;
  } else if (event.type === 'turn_commit') {
    Object.values(next.segments).forEach(segment => {
      if (segment.turnId === event.turnId && segment.channel === 'pending') {
        segment.channel = event.channel;
        segment.partial = event.partial;
      }
    });
  } else if (event.type === 'tool_start') {
    next.hasObservedToolByTurn[event.turnId] = true;
    next.tools[event.callId] = {
      callId: event.callId, turnId: event.turnId, name: event.name,
      arguments: event.arguments, status: 'running', order: event.seq,
      startedAt: event.startedAt,
    };
  } else if (event.type === 'tool_progress') {
    const tool = next.tools[event.callId];
    if (tool) tool.progress = event.summary;
  } else if (event.type === 'tool_finish') {
    const tool = next.tools[event.callId];
    if (tool) Object.assign(tool, event);
  }
  return next;
};
```

`turn_commit` changes all matching `pending` segment channels. Timeline selectors
sort by the first event sequence. `finalizePendingSegments` uses whether the turn
has observed a tool and sets `partial=true` without deleting text.
`parseAgentEvent` verifies `version === 1`, a non-empty `runId`, a finite integer
`seq`, and the required IDs for each discriminated event type; malformed or newer
events return `null` so callers retain the legacy rendering path.

- [ ] **Step 4: Run test and typecheck, then commit**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.ts
npm run type-check
```

Commit:

```bash
git add console/frontend/src/components/agent-stream/types.ts console/frontend/src/components/agent-stream/reducer.ts console/frontend/_tests_/agent-stream-reducer.test.ts
git commit -m "feat(frontend): add agent stream reducer"
```

---

### Task 5: Shared tool cards and chronological timeline

**Files:**
- Create: `console/frontend/src/components/agent-stream/tool-value.ts`
- Create: `console/frontend/src/components/agent-stream/tool-card.tsx`
- Create: `console/frontend/src/components/agent-stream/agent-timeline.tsx`
- Create: `console/frontend/src/components/agent-stream/index.ts`
- Create: `console/frontend/_tests_/agent-tool-value.test.ts`

**Interfaces:**
- Consumes `AgentToolRecord` and reasoning timeline items from Task 4.
- Produces `<AgentTimeline state={state} isStreaming={boolean} />` and `<ToolCard tool={tool} />`.
- `describeToolValue(value)` returns `{serialized, bytes, summary, large}` using the exact 8192-byte threshold.

- [ ] **Step 1: Write failing tool-value tests**

```ts
test('large arrays stay complete while showing a summary', () => {
  const value = Array.from({ length: 3000 }, (_, index) => ({ index }));
  const description = describeToolValue(value);
  assert.equal(description.large, true);
  assert.match(description.summary, /Array · 3000 items/);
  assert.deepEqual(JSON.parse(description.serialized), value);
});

test('objects report fields and UTF-8 size', () => {
  const description = describeToolValue({ result: '你好' });
  assert.match(description.summary, /Object · 1 field/);
  assert.ok(description.bytes >= new TextEncoder().encode(description.serialized).length);
});
```

- [ ] **Step 2: Run helper tests and confirm RED**

Run: `cd console/frontend && npm run test:unit -- _tests_/agent-tool-value.test.ts`

Expected: FAIL because `describeToolValue` is missing.

- [ ] **Step 3: Implement stable serialization and summaries**

```ts
export const TOOL_VALUE_LARGE_BYTES = 8192;

const serializeToolValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? null, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;

export const describeToolValue = (value: unknown): ToolValueDescription => {
  const serialized = serializeToolValue(value);
  const bytes = new TextEncoder().encode(serialized).byteLength;
  const kind = Array.isArray(value) ? `Array · ${value.length} items`
    : value && typeof value === 'object'
      ? `Object · ${Object.keys(value).length} fields`
      : typeof value;
  return { serialized, bytes, summary: `${kind} · ${formatBytes(bytes)}`,
           large: bytes >= TOOL_VALUE_LARGE_BYTES };
};
```

Copy always uses `serialized`.

- [ ] **Step 4: Build the collapsed card and timeline**

`ToolCard` owns only expansion state. Its header is always visible and maps
`running/success/error/cancelled` to existing Ant Design status colors. The body
has separate Arguments and Response sections. For large values, do not mount
`ReactJson` until `查看全部` is clicked; `复制完整内容` calls the existing
`copy-to-clipboard` package with `serialized`.

```tsx
export const AgentTimeline = ({ state, isStreaming }: AgentTimelineProps) => (
  <div className="flex flex-col gap-2">
    {selectReasoningTimeline(state).map(item =>
      item.kind === 'tool'
        ? <ToolCard key={item.callId} tool={item.tool} />
        : <MarkdownRender key={item.segmentId}
            content={item.text} isSending={isStreaming && !item.ended} />
    )}
  </div>
);
```

- [ ] **Step 5: Run helper tests, frontend quality checks, and commit**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-tool-value.test.ts _tests_/agent-stream-reducer.test.ts
npm run type-check
npm run lint -- src/components/agent-stream _tests_/agent-tool-value.test.ts _tests_/agent-stream-reducer.test.ts
```

Commit:

```bash
git add console/frontend/src/components/agent-stream console/frontend/_tests_/agent-tool-value.test.ts
git commit -m "feat(frontend): render structured agent tool cards"
```

---

### Task 6: Workflow debug chat integration

**Files:**
- Modify: `console/frontend/src/components/workflow/types/drawer/chat-debugger.ts`
- Modify: `console/frontend/src/components/workflow/store/flow-chat-function.ts`
- Modify: `console/frontend/src/components/workflow/drawer/chat-debugger/components/chat-content.tsx`

**Interfaces:**
- Consumes shared `reduceAgentEvent`, `selectLiveContent`, and `AgentTimeline`.
- Persists `agentStream?: AgentStreamState` inside the existing debug answer JSON.
- Leaves node Trace and node-debugger output panels unchanged.

- [ ] **Step 1: Extend debug types and initialize serializable state**

Add `agentStream?: AgentStreamState` to `ChatInfoType.answer`, `ChatListItem`, and
`ResponseResult`. New answer rows start with `createAgentStreamState()`. When
loading saved dialogue, parse `answer.agentStream` only if it has
`hasStructuredEvents === true`; otherwise leave the legacy fields untouched.

- [ ] **Step 2: Consume each workflow SSE event exactly once**

In `extractNodeInfo`, read:

```ts
agentEvent: data?.choices?.[0]?.delta?.agent_event as AgentEventV1 | undefined,
```

When present, reduce it into the current answer row and
`chatInfoRef.answer.agentStream`. Do not append it to
`endNodeReasoningTextQueue` or `endNodeTextQueue`. On stop/error, call
`finalizePendingSegments` before saving the dialogue.

- [ ] **Step 3: Render structured timeline with legacy fallback**

In `MessageReplyContent`:

```tsx
const structured = chat.agentStream?.hasStructuredEvents;
const liveContent = structured && !chat.content
  ? selectLiveContent(chat.agentStream)
  : chat.content || '';
{structured
  ? <AgentTimeline state={chat.agentStream} isStreaming={debuggering} />
  : chat.reasoningContent && <LegacyReasoning content={chat.reasoningContent} />}
<MarkdownRender content={liveContent} isSending={debuggering} />
```

Keep `messageContent`, JSON final-answer rendering, options, actions, and loading
states. Change the outer visibility condition so a structured event/card renders
even before any legacy string is available.

- [ ] **Step 4: Run frontend checks and commit**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.ts _tests_/agent-tool-value.test.ts
npm run type-check
npm run lint -- src/components/workflow/types/drawer/chat-debugger.ts src/components/workflow/store/flow-chat-function.ts src/components/workflow/drawer/chat-debugger/components/chat-content.tsx
```

Commit:

```bash
git add console/frontend/src/components/workflow/types/drawer/chat-debugger.ts console/frontend/src/components/workflow/store/flow-chat-function.ts console/frontend/src/components/workflow/drawer/chat-debugger/components/chat-content.tsx
git commit -m "feat(workflow-ui): show Pi stream timeline in debugger"
```

---

### Task 7: Published chat integration and cancellation fallback

**Files:**
- Modify: `console/frontend/src/types/chat.ts`
- Modify: `console/frontend/src/store/chat-store.ts`
- Modify: `console/frontend/src/hooks/use-chat.ts`
- Modify: `console/frontend/src/pages/chat-page/components/message-list.tsx`

**Interfaces:**
- Adds `agentStream?: AgentStreamState` to `MessageListType`.
- Adds store actions `applyAgentStreamEvent(event)` and `finalizeAgentStream(reason)`.
- Uses the same `AgentTimeline` and live-content selector as workflow debug.

- [ ] **Step 1: Add immutable streaming-message actions**

```ts
applyAgentStreamEvent: event => set(state => {
  const list = [...state.messageList];
  const current = list.at(-1);
  if (!current || current.sid) return state;
  const agentStream = reduceAgentEvent(
    current.agentStream ?? createAgentStreamState(), event
  );
  list[list.length - 1] = { ...current, agentStream };
  return { messageList: list };
}),
```

`finalizeAgentStream` applies `finalizePendingSegments` to the unfinished last bot
message and retains that message in the list.

- [ ] **Step 2: Consume structured SSE before legacy fields**

Extend `SSEData.choices[].delta` with `agent_event?: AgentEventV1`. In
`onmessage`, apply the event and call `updateStreamingMessage(ans)` so React
updates even when `ans` is still empty. Continue accumulating legacy content and
reasoning for compatibility/persistence; structured rendering prevents duplicate
display.

On explicit abort, workflow interruption, `onerror`, and rejected fetch, call
`finalizeAgentStream('cancelled' | 'error')` before clearing loading state. Do not
delete the partial bot message.

- [ ] **Step 3: Render timeline and optimistic live answer**

In `renderResp`:

```tsx
const structured = item.agentStream?.hasStructuredEvents;
const liveDraft = structured ? selectLiveContent(item.agentStream) : '';
const messageContent = workflowContent || item.message || liveDraft;
{structured ? (
  <AgentTimeline state={item.agentStream} isStreaming={!item.sid} />
) : (
  <><UseToolsInfo allToolsList={item.tools || []}
      loading={!isLoading && !!streamId} />
    <DeepThinkProgress answerItem={item} /></>
)}
<MarkdownRender content={messageContent} isSending={!!streamId && !item.sid} />
```

This makes structured content visible from the first delta; as soon as the
End-node legacy/template content arrives, `item.message` becomes authoritative.

- [ ] **Step 4: Run frontend checks and commit**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.ts _tests_/agent-tool-value.test.ts _tests_/sse-request.test.js
npm run type-check
npm run lint -- src/types/chat.ts src/store/chat-store.ts src/hooks/use-chat.ts src/pages/chat-page/components/message-list.tsx
npm run build:dev
```

Commit:

```bash
git add console/frontend/src/types/chat.ts console/frontend/src/store/chat-store.ts console/frontend/src/hooks/use-chat.ts console/frontend/src/pages/chat-page/components/message-list.tsx
git commit -m "feat(chat): stream Pi timeline in published conversations"
```

---

### Task 8: Cross-layer compatibility and deterministic acceptance

**Files:**
- Verify: `core/pi-agent/test/run-agent.test.ts`
- Verify: `core/agent/tests/test_workflow_agent_runner.py`
- Verify: `core/workflow/tests/engine/nodes/test_agent_event_stream.py`
- Verify: `console/frontend/_tests_/agent-stream-reducer.test.ts`

**Interfaces:**
- Verifies the exact same IDs and semantic text across the four layers.
- Makes no product behavior beyond the approved spec.

- [ ] **Step 1: Audit the deterministic sequence asserted by every layer**

Confirm the tests created in Tasks 1–7 assert this semantic sequence in their
native representation:

```json
[
  {"type":"segment_delta","turnId":"turn-1","segmentId":"turn-1-text-0","delta":"Checking"},
  {"type":"turn_commit","turnId":"turn-1","channel":"reasoning","partial":false,"reason":"tool_call"},
  {"type":"tool_start","turnId":"turn-1","callId":"call-1","name":"status","arguments":{"id":"7"}},
  {"type":"tool_finish","turnId":"turn-1","callId":"call-1","status":"success","response":{"ready":true}},
  {"type":"segment_delta","turnId":"turn-2","segmentId":"turn-2-text-0","delta":"Done"},
  {"type":"turn_commit","turnId":"turn-2","channel":"content","partial":false,"reason":"message_end"}
]
```

The audit passes only when final legacy reasoning is `Checking`, final content is
`Done`, tool JSON is absent from reasoning, and the structured tool record retains
full arguments and response. If an assertion is missing, add it to the owning
task's test file before running Step 2, then commit those assertions with
`git commit -m "test(pi-agent): close structured stream coverage gaps"`.

- [ ] **Step 2: Run all focused suites**

Run:

```bash
cd core/pi-agent && npm test && npm run typecheck && npm run build
cd ../agent && uv run pytest tests/test_pi_runner.py tests/test_workflow_agent_runner.py tests/test_router_and_schemas.py -q
cd ../workflow && uv run pytest tests/engine/nodes/util/test_frame_processor.py tests/engine/nodes/test_agent_event_stream.py tests/engine/callbacks/test_callback_handler.py tests/service/test_chat_service_response_filter.py -q
cd ../../console/frontend && npm run test:unit -- _tests_/agent-stream-reducer.test.ts _tests_/agent-tool-value.test.ts _tests_/sse-request.test.js && npm run type-check && npm run build:dev
```

Expected: every command exits zero.

- [ ] **Step 3: Run a non-quota browser acceptance**

Start the existing local stack with the Pi runtime image and use a deterministic
local/fake tool that returns a response larger than 8 KiB. In workflow debug and
the published chat page verify:

1. `Done` appears before the final message-end frame;
2. `Checking` streams and then moves to thinking;
3. the status card changes running -> success;
4. Arguments/Response start collapsed;
5. Response shows a summary, `查看全部` renders the full JSON, and
   `复制完整内容` matches the fixture;
6. cancelling a second run retains its visible partial text;
7. Trace still opens and shows the tool input/output.

Do not invoke the real Zhiwen PPT generation endpoint.

- [ ] **Step 4: Inspect the final diff and require a clean worktree**

Run:

```bash
git diff --check
git status --short
git diff --stat c607f166..HEAD
```

Expected: `git diff --check` exits zero and `git status --short` prints nothing.
