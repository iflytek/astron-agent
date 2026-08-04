# AgentExecutionPanel Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the shared frontend agent stream to the complete Agent Event Protocol v1 and render one accessible, chronological `AgentExecutionPanel` in workflow debug chat and published chat while preserving legacy messages.

**Architecture:** The existing pure reducer remains the single stream authority and evolves persisted state from schema version 2 to 3. Pure presentation selectors and a disclosure state machine keep execution semantics testable without a browser DOM; focused React components render the panel while `AgentTimeline` remains the stable integration wrapper used by both chat surfaces.

**Tech Stack:** React 18, TypeScript 5.9, Vite, Node test runner with ts-node, React DOM server rendering, Ant Design icons/tags, existing Markdown and tool-value utilities.

## Global Constraints

- Consume Agent Event Protocol v1; do not branch on Pi, runtime name, or workflow version.
- Keep `AgentTimeline` as the shared public integration point for both chat surfaces.
- Keep the final answer outside the execution panel.
- Preserve first-token pending content, chronological reasoning/tools, partial text, and existing tool arguments/responses.
- A live execution starts expanded; a completed historical execution starts collapsed.
- Collapse exactly once on the live-to-terminal transition; later manual disclosure is authoritative.
- Every panel/tool disclosure is a native button with `aria-expanded` and keyboard operation.
- Public chat renders only `visibility=user` segments; missing visibility from older v1 senders is normalized to `user`.
- Streams without valid structured events continue through the existing legacy reasoning/tool renderer.
- Do not fabricate reasoning, summarize with a model call, redesign the final answer, or migrate Trace storage.
- Add no frontend package.

## File structure

- `console/frontend/src/components/agent-stream/types.ts` — complete v1 protocol types plus persisted state version 3.
- `console/frontend/src/components/agent-stream/reducer.ts` — parser, v2-to-v3 migration, lifecycle reduction, and chronological selectors.
- `console/frontend/src/components/agent-stream/presentation.ts` — pure status/summary derivation and disclosure state machine.
- `console/frontend/src/components/agent-stream/agent-execution-panel.tsx` — overall panel and disclosure orchestration.
- `console/frontend/src/components/agent-stream/execution-panel-header.tsx` — accessible status/count header.
- `console/frontend/src/components/agent-stream/execution-timeline.tsx` — ordered reasoning/tool projection.
- `console/frontend/src/components/agent-stream/reasoning-step.tsx` — streamed analysis with local long-text disclosure.
- `console/frontend/src/components/agent-stream/tool-step.tsx` — compact tool row and independent detail disclosure.
- `console/frontend/src/components/agent-stream/tool-value-section.tsx` — lazy full-value rendering and copy behavior.
- `console/frontend/src/components/agent-stream/tool-card.tsx` — compatibility export for the renamed tool presentation.
- `console/frontend/src/components/agent-stream/agent-timeline.tsx` — stable wrapper around `AgentExecutionPanel`.
- `console/frontend/src/components/agent-stream/index.ts` — public exports.
- `console/frontend/_tests_/agent-stream-reducer.test.js` — protocol/state/migration regressions.
- `console/frontend/_tests_/agent-execution-presentation.test.js` — pure status and disclosure tests.
- `console/frontend/_tests_/agent-execution-components.test.js` — component source contracts for accessibility, real-content wiring, and shared integration.
- `console/frontend/_tests_/agent-tool-value.test.js` — unchanged complete-value/size regressions.
- `console/frontend/src/components/workflow/drawer/chat-debugger/components/chat-content.tsx` — unchanged shared wrapper consumer.
- `console/frontend/src/pages/chat-page/components/message-list.tsx` — unchanged shared wrapper consumer.

---

### Task 1: Extend protocol parsing and migrate persisted stream state

**Files:**
- Modify: `console/frontend/src/components/agent-stream/types.ts`
- Modify: `console/frontend/src/components/agent-stream/reducer.ts`
- Modify: `console/frontend/_tests_/agent-stream-reducer.test.js`
- Modify: `console/frontend/src/components/agent-stream/index.ts`

**Interfaces:**
- Consumes: Protocol v1 lifecycle, segment, tool, usage, and error payloads.
- Produces: `AgentEventV1`, `AgentExecutionRecord`, `AgentExecutionStatus`, `AgentUsage`, and `AgentStreamState` schema version 3.
- Produces: `parseAgentStreamState` accepting both persisted v2 and v3 data and returning normalized v3.

- [ ] **Step 1: Add failing parser, lifecycle, and migration tests**

Update the `segmentStart` fixture so it contains `visibility: 'user'`. Add helpers:

```javascript
const executionStarted = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'execution_start',
  startedAt: 100,
});

const usageUpdated = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'usage_update',
  inputTokens: 4,
  outputTokens: 6,
  totalTokens: 10,
});

const executionFinished = (seq, status = 'success') => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'execution_end',
  status,
  finishedAt: 150,
  durationMs: 50,
});
```

Add these tests:

```javascript
test('parser accepts lifecycle events without turnId', () => {
  assert.deepEqual(parseAgentEvent(executionStarted(1)), executionStarted(1));
  assert.deepEqual(parseAgentEvent(usageUpdated(2)), usageUpdated(2));
  assert.deepEqual(
    parseAgentEvent(executionFinished(3)),
    executionFinished(3)
  );
});

test('public parser rejects non-user segment visibility', () => {
  assert.equal(
    parseAgentEvent({ ...segmentStart(1), visibility: 'runtime' }),
    null
  );
  assert.equal(
    parseAgentEvent({ ...segmentStart(1), visibility: 'debug' }),
    null
  );
});

test('missing v1 visibility is normalized to user during rolling deploy', () => {
  const legacy = { ...segmentStart(1) };
  delete legacy.visibility;
  assert.deepEqual(parseAgentEvent(legacy), segmentStart(1));
});

test('execution lifecycle and usage reduce into one execution record', () => {
  let state = createAgentStreamState();
  state = reduceAgentEvent(state, executionStarted(1));
  state = reduceAgentEvent(state, usageUpdated(2));
  state = reduceAgentEvent(state, {
    version: 1,
    runId: 'run-1',
    seq: 3,
    type: 'execution_error',
    code: 'PI_RUNTIME_ERROR',
    message: 'Pi agent runtime failed',
    occurredAt: 140,
  });
  state = reduceAgentEvent(state, executionFinished(4, 'error'));

  assert.deepEqual(state.executions['run-1'], {
    runId: 'run-1',
    status: 'error',
    startedAt: 100,
    finishedAt: 150,
    durationMs: 50,
    usage: { inputTokens: 4, outputTokens: 6, totalTokens: 10 },
    error: {
      code: 'PI_RUNTIME_ERROR',
      message: 'Pi agent runtime failed',
      occurredAt: 140,
    },
  });
});

test('persisted schema version 2 migrates to version 3', () => {
  let current = createAgentStreamState();
  current = reduceAgentEvent(current, segmentStart(1));
  const version2 = {
    ...current,
    schemaVersion: 2,
  };
  delete version2.executions;
  for (const segment of Object.values(version2.segments)) {
    delete segment.visibility;
  }

  const migrated = parseAgentStreamState(version2);
  assert.equal(migrated?.schemaVersion, 3);
  assert.deepEqual(migrated?.executions, {});
  assert.equal(Object.values(migrated?.segments ?? {})[0]?.visibility, 'user');
});
```

- [ ] **Step 2: Run the reducer tests and verify lifecycle parsing fails**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.js
```

Expected: failures because lifecycle events require `turnId`, the state has no `executions`, and schema version 2 is the only accepted version.

- [ ] **Step 3: Define the complete frontend protocol and state version 3**

Refactor `types.ts` so the common base has no `turnId`:

```typescript
export type AgentExecutionStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled';
export type AgentVisibility = 'user' | 'debug' | 'runtime';

interface AgentEventBase {
  version: 1;
  runId: string;
  seq: number;
}

interface AgentTurnEventBase extends AgentEventBase {
  turnId: string;
}
```

Make segment/tool events extend `AgentTurnEventBase`, add `visibility` to `AgentSegmentStartEvent`, and add:

```typescript
export interface AgentExecutionStartEvent extends AgentEventBase {
  type: 'execution_start';
  startedAt: number;
}

export interface AgentUsageUpdateEvent extends AgentEventBase {
  type: 'usage_update';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AgentExecutionErrorEvent extends AgentEventBase {
  type: 'execution_error';
  code: string;
  message: string;
  occurredAt: number;
}

export interface AgentExecutionEndEvent extends AgentEventBase {
  type: 'execution_end';
  status: Exclude<AgentExecutionStatus, 'running'>;
  finishedAt: number;
  durationMs: number;
}
```

Include all four in `AgentEventV1`. Add persisted records:

```typescript
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AgentExecutionError {
  code: string;
  message: string;
  occurredAt: number;
}

export interface AgentExecutionRecord {
  runId: string;
  status: AgentExecutionStatus;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  usage?: AgentUsage;
  error?: AgentExecutionError;
}
```

Add `visibility: AgentVisibility` to `AgentSegment`, then change state to:

```typescript
export interface AgentStreamState {
  schemaVersion: 3;
  hasStructuredEvents: boolean;
  executions: Record<string, AgentExecutionRecord>;
  segments: Record<string, AgentSegment>;
  tools: Record<string, AgentToolRecord>;
  lastSeqByRun: Record<string, number>;
  nextOrder: number;
  hasObservedToolByTurn: Record<string, true>;
  interrupted: boolean;
  interruptionReason: AgentFinalizeReason | null;
}
```

- [ ] **Step 4: Parse lifecycle types, normalize visibility, and reduce execution records**

In `parseAgentEvent`, validate only the common envelope before the switch. Require `turnId` inside each segment/tool case. For `segment_start`, normalize missing visibility and reject non-user values:

```typescript
const visibility = value.visibility ?? 'user';
if (visibility !== 'user') return null;
return { ...value, visibility } as unknown as AgentEventV1;
```

Validate lifecycle fields with finite, non-negative integers and non-empty strings. Require `seq` to be a safe integer greater than zero.

Initialize `executions: {}` and `schemaVersion: 3`. Add reducer cases:

```typescript
case 'execution_start':
  return {
    ...next,
    executions: {
      ...state.executions,
      [event.runId]: {
        ...state.executions[event.runId],
        runId: event.runId,
        status: 'running',
        startedAt: event.startedAt,
      },
    },
  };
case 'usage_update':
  return {
    ...next,
    executions: {
      ...state.executions,
      [event.runId]: {
        ...state.executions[event.runId],
        runId: event.runId,
        status: state.executions[event.runId]?.status ?? 'running',
        usage: {
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          totalTokens: event.totalTokens,
        },
      },
    },
  };
case 'execution_error':
  return {
    ...next,
    executions: {
      ...state.executions,
      [event.runId]: {
        ...state.executions[event.runId],
        runId: event.runId,
        status: 'error',
        error: {
          code: event.code,
          message: event.message,
          occurredAt: event.occurredAt,
        },
      },
    },
  };
case 'execution_end':
  return {
    ...next,
    executions: {
      ...state.executions,
      [event.runId]: {
        ...state.executions[event.runId],
        runId: event.runId,
        status: event.status,
        finishedAt: event.finishedAt,
        durationMs: event.durationMs,
      },
    },
  };
```

Store `event.visibility` on new segment records.

In `parseAgentStreamState`, normalize schema version 2 before v3 validation:

```typescript
const migrateVersion2 = (
  value: Record<string, unknown>
): Record<string, unknown> => ({
  ...value,
  schemaVersion: 3,
  executions: {},
  segments: isRecord(value.segments)
    ? Object.fromEntries(
        Object.entries(value.segments).map(([key, segment]) => [
          key,
          isRecord(segment) ? { ...segment, visibility: 'user' } : segment,
        ])
      )
    : value.segments,
});
```

Validate every execution record, segment, tool, sequence, and interruption field before returning normalized v3 state.

- [ ] **Step 5: Run reducer, store, type, and formatting checks**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.js _tests_/chat-store-streaming.test.js
npm run type-check
npx prettier --check src/components/agent-stream/types.ts src/components/agent-stream/reducer.ts _tests_/agent-stream-reducer.test.js
```

Expected: tests, TypeScript, and formatting pass.

- [ ] **Step 6: Commit protocol/state migration**

```bash
git add console/frontend/src/components/agent-stream/types.ts console/frontend/src/components/agent-stream/reducer.ts console/frontend/src/components/agent-stream/index.ts console/frontend/_tests_/agent-stream-reducer.test.js
git commit -m "feat(frontend): consume agent event protocol v1"
```

---

### Task 2: Add pure execution presentation and disclosure state

**Files:**
- Create: `console/frontend/src/components/agent-stream/presentation.ts`
- Create: `console/frontend/_tests_/agent-execution-presentation.test.js`
- Modify: `console/frontend/src/components/agent-stream/index.ts`

**Interfaces:**
- Consumes: `AgentStreamState` schema version 3 and parent `isStreaming`.
- Produces: `deriveExecutionPresentation(state, isStreaming)`.
- Produces: `createPanelDisclosure(active)` and `reducePanelDisclosure(state, action)`.

- [ ] **Step 1: Write failing pure presentation tests**

Create `_tests_/agent-execution-presentation.test.js`:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPanelDisclosure,
  deriveExecutionPresentation,
  reducePanelDisclosure,
} from '../src/components/agent-stream/presentation.ts';
import {
  createAgentStreamState,
  reduceAgentEvent,
} from '../src/components/agent-stream/reducer.ts';


const event = (seq, type, data = {}) => ({
  version: 1,
  runId: 'run-1',
  seq,
  type,
  ...data,
});


test('presentation prefers live parent streaming state', () => {
  let state = createAgentStreamState();
  state = reduceAgentEvent(
    state,
    event(1, 'execution_start', { startedAt: 100 })
  );
  assert.deepEqual(deriveExecutionPresentation(state, true), {
    status: 'running',
    statusLabel: '正在执行',
    toolCount: 0,
    durationMs: undefined,
  });
});

test('presentation derives completed, error, cancellation and transport states', () => {
  let completed = createAgentStreamState();
  completed = reduceAgentEvent(
    completed,
    event(1, 'execution_end', {
      status: 'success',
      finishedAt: 150,
      durationMs: 50,
    })
  );
  assert.equal(deriveExecutionPresentation(completed, false).status, 'success');

  assert.equal(
    deriveExecutionPresentation(
      { ...completed, interrupted: true, interruptionReason: 'transport_closed' },
      false
    ).status,
    'transport_closed'
  );
});

test('disclosure starts open live, starts closed historical and collapses once', () => {
  let live = createPanelDisclosure(true);
  assert.equal(live.expanded, true);
  live = reducePanelDisclosure(live, {
    type: 'activity_changed',
    active: false,
  });
  assert.equal(live.expanded, false);
  assert.equal(live.autoCollapsed, true);

  live = reducePanelDisclosure(live, { type: 'toggle' });
  assert.equal(live.expanded, true);
  assert.equal(
    reducePanelDisclosure(live, {
      type: 'activity_changed',
      active: false,
    }).expanded,
    true
  );

  assert.equal(createPanelDisclosure(false).expanded, false);

  let delayed = createPanelDisclosure(false);
  delayed = reducePanelDisclosure(delayed, {
    type: 'activity_changed',
    active: true,
  });
  assert.equal(delayed.expanded, true);
  assert.equal(delayed.autoCollapsed, false);
});
```

- [ ] **Step 2: Run the test and verify the presentation module is missing**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-presentation.test.js
```

Expected: module-not-found failure for `presentation.ts`.

- [ ] **Step 3: Implement status/summary derivation**

Create `presentation.ts` with:

```typescript
import type { AgentStreamState } from './types';

export type ExecutionPanelStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'transport_closed';

export interface ExecutionPresentation {
  status: ExecutionPanelStatus;
  statusLabel: string;
  toolCount: number;
  durationMs?: number;
}

const statusLabels: Record<ExecutionPanelStatus, string> = {
  running: '正在执行',
  success: '执行完成',
  error: '执行失败',
  cancelled: '已取消',
  transport_closed: '连接中断',
};

export const deriveExecutionPresentation = (
  state: AgentStreamState,
  isStreaming: boolean
): ExecutionPresentation => {
  const executions = Object.values(state.executions);
  let status: ExecutionPanelStatus = 'success';
  if (isStreaming) status = 'running';
  else if (state.interruptionReason === 'transport_closed') {
    status = 'transport_closed';
  } else if (
    state.interruptionReason === 'error' ||
    executions.some(execution => execution.status === 'error')
  ) {
    status = 'error';
  } else if (
    state.interruptionReason === 'cancelled' ||
    executions.some(execution => execution.status === 'cancelled')
  ) {
    status = 'cancelled';
  } else if (executions.some(execution => execution.status === 'running')) {
    status = 'transport_closed';
  }

  const durationMs =
    executions.length === 1 ? executions[0]?.durationMs : undefined;

  return {
    status,
    statusLabel: statusLabels[status],
    toolCount: Object.keys(state.tools).length,
    durationMs,
  };
};
```

- [ ] **Step 4: Implement the one-time disclosure reducer**

Add to `presentation.ts`:

```typescript
export interface PanelDisclosureState {
  expanded: boolean;
  wasActive: boolean;
  autoCollapsed: boolean;
}

export type PanelDisclosureAction =
  | { type: 'toggle' }
  | { type: 'activity_changed'; active: boolean };

export const createPanelDisclosure = (
  active: boolean
): PanelDisclosureState => ({
  expanded: active,
  wasActive: active,
  autoCollapsed: !active,
});

export const reducePanelDisclosure = (
  state: PanelDisclosureState,
  action: PanelDisclosureAction
): PanelDisclosureState => {
  if (action.type === 'toggle') {
    return { ...state, expanded: !state.expanded };
  }
  if (!state.wasActive && action.active) {
    return {
      expanded: true,
      wasActive: true,
      autoCollapsed: false,
    };
  }
  if (state.wasActive && !action.active && !state.autoCollapsed) {
    return {
      expanded: false,
      wasActive: false,
      autoCollapsed: true,
    };
  }
  return { ...state, wasActive: action.active };
};
```

- [ ] **Step 5: Run presentation, reducer, and type checks**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-presentation.test.js _tests_/agent-stream-reducer.test.js
npm run type-check
npx prettier --check src/components/agent-stream/presentation.ts _tests_/agent-execution-presentation.test.js
```

Expected: all checks pass.

- [ ] **Step 6: Commit pure execution presentation**

```bash
git add console/frontend/src/components/agent-stream/presentation.ts console/frontend/src/components/agent-stream/index.ts console/frontend/_tests_/agent-execution-presentation.test.js
git commit -m "feat(frontend): derive agent execution presentation"
```

---

### Task 3: Build the accessible execution panel and reasoning timeline

**Files:**
- Create: `console/frontend/src/components/agent-stream/agent-execution-panel.tsx`
- Create: `console/frontend/src/components/agent-stream/execution-panel-header.tsx`
- Create: `console/frontend/src/components/agent-stream/execution-timeline.tsx`
- Create: `console/frontend/src/components/agent-stream/reasoning-step.tsx`
- Create: `console/frontend/_tests_/agent-execution-components.test.js`
- Modify: `console/frontend/src/components/agent-stream/index.ts`

**Interfaces:**
- Consumes: `AgentStreamState`, `deriveExecutionPresentation`, `selectReasoningTimeline`, and current `ToolCard`.
- Produces: `AgentExecutionPanel({ state, isStreaming })`.
- Produces: panel header disclosure and local reasoning long-text disclosure.

- [ ] **Step 1: Write failing component source-contract tests**

The Node unit harness cannot import the existing Markdown renderer because it loads browser-only CSS. Keep interaction semantics in the pure Task 2 tests and create `_tests_/agent-execution-components.test.js` for component wiring/accessibility contracts:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';


const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readComponent = name =>
  readFileSync(
    resolve(frontendRoot, 'src/components/agent-stream', name),
    'utf8'
  );


test('execution panel is capability-gated and uses disclosure state', () => {
  const source = readComponent('agent-execution-panel.tsx');
  assert.match(source, /if \(!state\.hasStructuredEvents\) return null/);
  assert.match(source, /reducePanelDisclosure/);
  assert.match(source, /activity_changed/);
  assert.match(source, /<ExecutionPanelHeader/);
  assert.match(source, /<ExecutionTimeline/);
});

test('execution header is a labelled native disclosure button', () => {
  const source = readComponent('execution-panel-header.tsx');
  assert.match(source, /<button/);
  assert.match(source, /type="button"/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /任务分析与执行过程/);
  assert.match(source, /presentation\.statusLabel/);
});

test('reasoning step renders exact segment text with a local disclosure', () => {
  const source = readComponent('reasoning-step.tsx');
  assert.match(source, /content=\{segment\.text\}/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /展开更多/);
  assert.match(source, /此段内容因任务中断而提前结束/);
  assert.doesNotMatch(source, /summari[sz]e/i);
});
```

- [ ] **Step 2: Run the component test and verify modules are missing**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-components.test.js
```

Expected: `ENOENT` failure because the component files do not exist.

- [ ] **Step 3: Implement the header and panel disclosure orchestration**

Create `execution-panel-header.tsx` with a native button:

```tsx
import { DownOutlined } from '@ant-design/icons';
import React from 'react';

import type { ExecutionPresentation } from './presentation';

interface ExecutionPanelHeaderProps {
  expanded: boolean;
  presentation: ExecutionPresentation;
  onToggle: () => void;
}

export const ExecutionPanelHeader = ({
  expanded,
  presentation,
  onToggle,
}: ExecutionPanelHeaderProps): React.ReactElement => (
  <button
    type="button"
    aria-expanded={expanded}
    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f4f6fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b5bf7]"
    onClick={onToggle}
  >
    <DownOutlined
      className={`text-xs text-[#7b8494] transition-transform ${
        expanded ? 'rotate-180' : ''
      }`}
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-[#242933]">
        任务分析与执行过程
      </span>
      <span className="mt-0.5 block text-xs text-[#7b8494]">
        {presentation.statusLabel} · 已调用 {presentation.toolCount} 个工具
      </span>
    </span>
  </button>
);
```

Create `agent-execution-panel.tsx` using the pure disclosure reducer:

```tsx
import React, { useEffect, useReducer } from 'react';

import { ExecutionPanelHeader } from './execution-panel-header';
import { ExecutionTimeline } from './execution-timeline';
import {
  createPanelDisclosure,
  deriveExecutionPresentation,
  reducePanelDisclosure,
} from './presentation';
import type { AgentStreamState } from './types';

interface AgentExecutionPanelProps {
  state: AgentStreamState;
  isStreaming: boolean;
}

export const AgentExecutionPanel = ({
  state,
  isStreaming,
}: AgentExecutionPanelProps): React.ReactElement | null => {
  const presentation = deriveExecutionPresentation(state, isStreaming);
  const active = presentation.status === 'running';
  const [disclosure, dispatch] = useReducer(
    reducePanelDisclosure,
    active,
    createPanelDisclosure
  );

  useEffect(() => {
    dispatch({ type: 'activity_changed', active });
  }, [active]);

  if (!state.hasStructuredEvents) return null;

  return (
    <section className="my-2.5 overflow-hidden rounded-xl border border-[#dfe3eb] bg-[#fafbfc]">
      <ExecutionPanelHeader
        expanded={disclosure.expanded}
        presentation={presentation}
        onToggle={() => dispatch({ type: 'toggle' })}
      />
      {disclosure.expanded ? (
        <ExecutionTimeline state={state} isStreaming={isStreaming} />
      ) : null}
    </section>
  );
};
```

- [ ] **Step 4: Implement ordered reasoning steps and the timeline**

Create `reasoning-step.tsx`. Use the original text, a 600-character disclosure threshold, and no generated summary:

```tsx
import MarkdownRender from '@/components/markdown-render';
import React, { useState } from 'react';

import type { AgentSegment } from './types';

const LONG_REASONING_CHARS = 600;

interface ReasoningStepProps {
  segment: AgentSegment;
  label: string;
  streaming: boolean;
}

export const ReasoningStep = ({
  segment,
  label,
  streaming,
}: ReasoningStepProps): React.ReactElement => {
  const [expanded, setExpanded] = useState(false);
  const long = segment.text.length > LONG_REASONING_CHARS;
  return (
    <article className="border-l-2 border-[#dfe3eb] pl-3">
      <div className="mb-1 text-xs font-medium text-[#5b6472]">{label}</div>
      <div
        className="reasoning-markdown overflow-hidden"
        style={long && !expanded ? { maxHeight: '9rem' } : undefined}
      >
        <MarkdownRender
          content={segment.text}
          isSending={streaming && !segment.ended}
        />
      </div>
      {long ? (
        <button
          type="button"
          aria-expanded={expanded}
          className="mt-1 text-xs text-[#5b5bf7] hover:underline"
          onClick={() => setExpanded(current => !current)}
        >
          {expanded ? '收起' : '展开更多'}
        </button>
      ) : null}
      {segment.partial ? (
        <span className="mt-1 block text-xs text-[#9a6b16]">
          此段内容因任务中断而提前结束
        </span>
      ) : null}
    </article>
  );
};
```

Create `execution-timeline.tsx`. For this task, keep using current `ToolCard`; Task 4 replaces its internals:

```tsx
import React from 'react';

import { selectReasoningTimeline } from './reducer';
import { ReasoningStep } from './reasoning-step';
import { ToolCard } from './tool-card';
import type { AgentStreamState } from './types';

interface ExecutionTimelineProps {
  state: AgentStreamState;
  isStreaming: boolean;
}

export const ExecutionTimeline = ({
  state,
  isStreaming,
}: ExecutionTimelineProps): React.ReactElement => {
  const timeline = selectReasoningTimeline(state);
  let reasoningIndex = 0;
  return (
    <div className="flex flex-col gap-3 border-t border-[#e5e7eb] px-4 py-3 text-sm text-[#5b6472]">
      {timeline.map(item => {
        if (item.kind === 'tool') {
          return (
            <ToolCard key={`${item.runId}:${item.callId}`} tool={item.tool} />
          );
        }
        const label = reasoningIndex++ === 0 ? '任务分析' : '继续分析';
        return (
          <ReasoningStep
            key={`${item.runId}:${item.segmentId}`}
            segment={item}
            label={label}
            streaming={isStreaming}
          />
        );
      })}
    </div>
  );
};
```

- [ ] **Step 5: Run component, presentation, reducer, type, and formatting checks**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-components.test.js _tests_/agent-execution-presentation.test.js _tests_/agent-stream-reducer.test.js
npm run type-check
npx prettier --check src/components/agent-stream/agent-execution-panel.tsx src/components/agent-stream/execution-panel-header.tsx src/components/agent-stream/execution-timeline.tsx src/components/agent-stream/reasoning-step.tsx _tests_/agent-execution-components.test.js
```

Expected: all checks pass.

- [ ] **Step 6: Commit the execution panel shell and reasoning timeline**

```bash
git add console/frontend/src/components/agent-stream/agent-execution-panel.tsx console/frontend/src/components/agent-stream/execution-panel-header.tsx console/frontend/src/components/agent-stream/execution-timeline.tsx console/frontend/src/components/agent-stream/reasoning-step.tsx console/frontend/src/components/agent-stream/index.ts console/frontend/_tests_/agent-execution-components.test.js
git commit -m "feat(frontend): add agent execution panel"
```

---

### Task 4: Replace debug-style tool cards with execution tool steps

**Files:**
- Create: `console/frontend/src/components/agent-stream/tool-step.tsx`
- Create: `console/frontend/src/components/agent-stream/tool-value-section.tsx`
- Modify: `console/frontend/src/components/agent-stream/tool-card.tsx`
- Modify: `console/frontend/src/components/agent-stream/execution-timeline.tsx`
- Modify: `console/frontend/src/components/agent-stream/index.ts`
- Modify: `console/frontend/_tests_/agent-execution-components.test.js`
- Modify: `console/frontend/_tests_/agent-tool-value.test.js`

**Interfaces:**
- Consumes: `AgentToolRecord` and `describeToolValue`.
- Produces: `ToolStep({ tool })` with independent `aria-expanded` state.
- Preserves: complete serialized values, 8 KiB summary threshold, full copy, and lazy detail rendering.

- [ ] **Step 1: Add failing collapsed-tool and detail-label assertions**

Extend `_tests_/agent-execution-components.test.js` with a compact tool-step source contract:

```javascript
test('tool step is an independent accessible disclosure with lazy values', () => {
  const source = readComponent('tool-step.tsx');
  assert.match(source, /<button/);
  assert.match(source, /type="button"/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /调用工具 \{tool\.name\}/);
  assert.match(source, /responseSummary/);
  assert.match(source, /参数 Arguments/);
  assert.match(source, /响应 Response/);
  assert.match(source, /等待工具返回/);
});
```

Keep `_tests_/agent-tool-value.test.js` assertions that large values preserve the complete serialized string, byte count, and summary.

- [ ] **Step 2: Run tool and panel tests and verify the compact row assertions fail**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-components.test.js _tests_/agent-tool-value.test.js
```

Expected: `ENOENT` failure because `tool-step.tsx` does not exist.

- [ ] **Step 3: Extract lazy full-value rendering**

Move the existing `ToolValueSection` behavior from `tool-card.tsx` into `tool-value-section.tsx` with this complete implementation:

```tsx
import { CopyOutlined } from '@ant-design/icons';
import copy from 'copy-to-clipboard';
import React, { useMemo, useState } from 'react';

import { describeToolValue } from './tool-value';

export interface ToolValueSectionProps {
  title: string;
  value: unknown;
}

export const ToolValueSection = ({
  title,
  value,
}: ToolValueSectionProps): React.ReactElement => {
  const description = useMemo(() => describeToolValue(value), [value]);
  const [showFull, setShowFull] = useState(!description.large);
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    copy(description.serialized);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#4b5563]">{title}</div>
          <div className="mt-0.5 truncate text-xs text-[#8b93a1]">
            {description.summary}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {description.large ? (
            <button
              type="button"
              aria-expanded={showFull}
              className="rounded px-2 py-1 text-xs text-[#5b5bf7] hover:bg-[#f1f1ff]"
              onClick={() => setShowFull(current => !current)}
            >
              {showFull ? '收起' : '查看全部'}
            </button>
          ) : null}
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#5b6472] hover:bg-[#f3f4f6]"
            onClick={handleCopy}
          >
            <CopyOutlined />
            {copied ? '已复制' : '复制完整内容'}
          </button>
        </div>
      </div>
      {showFull ? (
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#f7f8fa] p-3 text-xs leading-5 text-[#303846]">
          {description.serialized}
        </pre>
      ) : null}
    </section>
  );
};
```

The implementation must keep the original escaped `<pre>` rendering and must not use raw HTML.

- [ ] **Step 4: Implement the compact ToolStep**

Create `tool-step.tsx` with the complete compact row and lazy detail body:

```tsx
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import React, { useMemo, useState } from 'react';

import type { AgentToolRecord, AgentToolStatus } from './types';
import { ToolValueSection } from './tool-value-section';
import { describeToolValue } from './tool-value';

interface ToolStepProps {
  tool: AgentToolRecord;
}

const statusPresentation: Record<
  AgentToolStatus,
  { color: string; label: string; icon: React.ReactNode }
> = {
  running: {
    color: 'processing',
    label: '运行中',
    icon: <ClockCircleOutlined spin />,
  },
  success: {
    color: 'success',
    label: '成功',
    icon: <CheckCircleOutlined />,
  },
  error: {
    color: 'error',
    label: '失败',
    icon: <CloseCircleOutlined />,
  },
  cancelled: {
    color: 'default',
    label: '已取消',
    icon: <StopOutlined />,
  },
};

const formatDuration = (durationMs?: number): string => {
  if (durationMs === undefined) return '';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
};

export const ToolStep = ({ tool }: ToolStepProps): React.ReactElement => {
  const [expanded, setExpanded] = useState(false);
  const presentation = statusPresentation[tool.status];
  const hasResponse = Object.prototype.hasOwnProperty.call(tool, 'response');
  const responseSummary = useMemo(
    () => (hasResponse ? describeToolValue(tool.response).summary : undefined),
    [hasResponse, tool.response]
  );
  const compactSummary =
    tool.status === 'running'
      ? (tool.progress ?? '等待工具返回…')
      : (responseSummary ?? tool.progress ?? '工具执行结束');
  const duration = formatDuration(tool.durationMs);

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3eb] bg-[#f8f9fb] text-[#242933]">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f1f3f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b5bf7]"
        onClick={() => setExpanded(current => !current)}
      >
        <DownOutlined
          className={`text-xs text-[#7b8494] transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            调用工具 {tool.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#7b8494]">
            {compactSummary}
          </span>
        </span>
        {duration ? (
          <span className="text-xs text-[#8b93a1]">{duration}</span>
        ) : null}
        <Tag
          color={presentation.color}
          icon={presentation.icon}
          className="m-0"
        >
          {presentation.label}
        </Tag>
      </button>
      {expanded ? (
        <div className="flex flex-col gap-2 border-t border-[#e5e7eb] p-3">
          <ToolValueSection title="参数 Arguments" value={tool.arguments} />
          {hasResponse ? (
            <ToolValueSection title="响应 Response" value={tool.response} />
          ) : (
            <div className="rounded-lg border border-dashed border-[#dfe3eb] bg-white px-3 py-2 text-xs text-[#8b93a1]">
              等待工具返回…
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
```

The tool detail starts collapsed for every status. The latest progress or response summary remains visible in the compact row.

Replace `tool-card.tsx` with a compatibility export:

```typescript
export { ToolStep as ToolCard } from './tool-step';
```

Use `ToolStep` directly in `execution-timeline.tsx` and export both names from `index.ts`.

- [ ] **Step 5: Run tool, panel, reducer, type, and formatting checks**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-components.test.js _tests_/agent-tool-value.test.js _tests_/agent-stream-reducer.test.js
npm run type-check
npx prettier --check src/components/agent-stream/tool-step.tsx src/components/agent-stream/tool-value-section.tsx src/components/agent-stream/tool-card.tsx src/components/agent-stream/execution-timeline.tsx _tests_/agent-execution-components.test.js
```

Expected: all checks pass.

- [ ] **Step 6: Commit tool execution steps**

```bash
git add console/frontend/src/components/agent-stream/tool-step.tsx console/frontend/src/components/agent-stream/tool-value-section.tsx console/frontend/src/components/agent-stream/tool-card.tsx console/frontend/src/components/agent-stream/execution-timeline.tsx console/frontend/src/components/agent-stream/index.ts console/frontend/_tests_/agent-execution-components.test.js console/frontend/_tests_/agent-tool-value.test.js
git commit -m "feat(frontend): present agent tool execution steps"
```

---

### Task 5: Wire the stable shared wrapper and prove legacy compatibility

**Files:**
- Modify: `console/frontend/src/components/agent-stream/agent-timeline.tsx`
- Modify: `console/frontend/src/components/agent-stream/index.ts`
- Modify: `console/frontend/_tests_/agent-execution-components.test.js`
- Verify unchanged: `console/frontend/src/components/workflow/drawer/chat-debugger/components/chat-content.tsx`
- Verify unchanged: `console/frontend/src/pages/chat-page/components/message-list.tsx`
- Verify unchanged: `console/frontend/src/store/chat-store.ts`
- Verify unchanged: `console/frontend/src/components/workflow/store/flow-chat-function.ts`

**Interfaces:**
- Consumes: existing `{ state, isStreaming }` props at both chat surfaces.
- Produces: the same `AgentTimeline` export backed by `AgentExecutionPanel`.
- Preserves: current capability switch and all legacy render paths before `hasStructuredEvents` becomes true.

- [ ] **Step 1: Add a failing shared-wrapper source contract**

Extend `_tests_/agent-execution-components.test.js`:

```javascript
test('AgentTimeline is the only shared chat integration wrapper', () => {
  const timeline = readComponent('agent-timeline.tsx');
  const workflowChat = readFileSync(
    resolve(
      frontendRoot,
      'src/components/workflow/drawer/chat-debugger/components/chat-content.tsx'
    ),
    'utf8'
  );
  const publishedChat = readFileSync(
    resolve(frontendRoot, 'src/pages/chat-page/components/message-list.tsx'),
    'utf8'
  );

  assert.match(timeline, /<AgentExecutionPanel \{\.\.\.props\} \/>/);
  assert.match(workflowChat, /<AgentTimeline/);
  assert.match(publishedChat, /<AgentTimeline/);
  assert.doesNotMatch(workflowChat, /<AgentExecutionPanel/);
  assert.doesNotMatch(publishedChat, /<AgentExecutionPanel/);
});
```

- [ ] **Step 2: Run the wrapper test and verify the old timeline differs**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-execution-components.test.js
```

Expected: the wrapper assertion fails because `AgentTimeline` still renders its old flat timeline.

- [ ] **Step 3: Make AgentTimeline the stable one-line wrapper**

Replace `agent-timeline.tsx` internals with:

```tsx
import React from 'react';

import { AgentExecutionPanel } from './agent-execution-panel';
import type { AgentStreamState } from './types';

interface AgentTimelineProps {
  state: AgentStreamState;
  isStreaming: boolean;
}

export const AgentTimeline = (
  props: AgentTimelineProps
): React.ReactElement | null => <AgentExecutionPanel {...props} />;
```

Keep both target surfaces unchanged. Their existing conditions already select structured versus legacy rendering by `agentStream.hasStructuredEvents`; do not add runtime or workflow version checks.

- [ ] **Step 4: Run all focused frontend tests and production checks**

Run:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.js _tests_/agent-execution-presentation.test.js _tests_/agent-execution-components.test.js _tests_/agent-tool-value.test.js _tests_/chat-store-streaming.test.js _tests_/sse-request.test.js
npm run type-check
npm run lint -- --quiet
npm run build:dev
```

Expected: tests, TypeScript, lint, and build pass.

- [ ] **Step 5: Commit shared integration**

```bash
git add console/frontend/src/components/agent-stream/agent-timeline.tsx console/frontend/src/components/agent-stream/index.ts console/frontend/_tests_/agent-execution-components.test.js
git commit -m "feat(frontend): integrate shared agent execution panel"
```

---

## Final verification

- [ ] Run the complete focused frontend suite:

```bash
cd console/frontend
npm run test:unit -- _tests_/agent-stream-reducer.test.js _tests_/agent-execution-presentation.test.js _tests_/agent-execution-components.test.js _tests_/agent-tool-value.test.js _tests_/chat-store-streaming.test.js _tests_/sse-request.test.js
npm run type-check
npm run lint -- --quiet
npm run build:dev
```

- [ ] Run backend contract regressions so frontend types remain aligned:

```bash
cd core/agent
uv run pytest tests/test_agent_event_protocol.py tests/test_pi_event_adapter.py tests/test_pi_runner.py tests/test_workflow_agent_runner.py -q
```

- [ ] Perform deterministic browser acceptance with a non-quota local tool:

1. Start a published chat execution and a workflow-debug execution using the same harmless tool.
2. Confirm the panel starts expanded and real text streams under `任务分析`.
3. Confirm tools remain in real order, details start collapsed, and Arguments/Response show complete values on demand.
4. Confirm successful completion collapses the panel once.
5. Expand it manually and confirm later renders do not close it again.
6. Cancel a second run after visible text and confirm partial text/tools remain visible with `已取消`.
7. Send one legacy workflow response without `agent_event` and confirm the existing message renderer remains unchanged.
8. Open Trace for the same execution and confirm retrieval still works.

- [ ] Inspect the final branch:

```bash
git status --short --branch
git log --oneline origin/feat/pi-agent-runtime..HEAD
```

Expected: clean worktree, focused commits, and no direct Pi/runtime checks in the shared frontend component tree.
