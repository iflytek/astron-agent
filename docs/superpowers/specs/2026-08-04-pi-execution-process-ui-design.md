# Pi Agent Execution Process UI Design

**Date:** 2026-08-04
**Status:** Approved for implementation planning

## Context

Pi ReACT runs already emit versioned structured events for streamed reasoning,
tool starts, tool progress, tool completion, final content, cancellation, and
errors. The shared frontend reducer preserves their real execution order and is
used by both workflow debugging and published chat.

The current UI does not communicate that structure clearly. It renders
reasoning as an unlabelled Markdown block and renders tools as debugging-oriented
cards whose main affordance is viewing raw `Arguments` and `Response` values.
Users cannot quickly understand what the agent analysed, which tool it used,
what happened next, or whether the execution is still active. The required
experience is a readable, collapsible execution process similar to a task
timeline, while continuing to expose exact tool inputs and outputs on demand.

## Goals

- Show Pi's actual reasoning content as a labelled **任务分析** process.
- Keep reasoning token-streamed; do not wait for a turn or message to finish.
- Interleave reasoning and tool operations in their real event order.
- Show the exact tool name, state, progress, duration, and a compact result
  summary without exposing large raw payloads by default.
- Allow the entire execution process and every individual tool operation to be
  expanded and collapsed.
- Default the process to expanded while running and collapse it once when the
  run finishes.
- Preserve completed, failed, cancelled, and transport-interrupted partial
  output.
- Use the same behavior in workflow debug chat and published user chat.
- Preserve existing workflow `output`, `REASONING_CONTENT`, Trace, and persisted
  structured stream data.

## Non-goals

- Do not add or emulate a separate task-management state machine.
- Do not ask another model call to summarize, rewrite, or classify reasoning.
- Do not change the Pi event protocol, workflow node schema, or editor
  configuration.
- Do not infer human-friendly tool names from a manually maintained per-tool
  mapping. The UI shows the real tool name supplied by Pi.
- Do not redesign the final answer bubble or the Trace detail page.

## Chosen interaction model

Use one chronological, collapsible **任务分析与执行过程** panel.

```text
▾ 任务分析与执行过程
  正在执行 · 已调用 2 个工具

  ◷ 任务分析
    Pi 实际 reasoning 内容，逐字流式显示……
    展开更多

  ├─ ✓ 调用工具 get_theme_list        1.2s
  │    摘要：Object · 12 fields
  │    [展开后：调用参数 / 工具输出 / 复制]
  │
  ├─ ◷ 继续分析
  │    根据工具结果继续生成的 reasoning……
  │
  └─ ✓ 调用工具 get_template_detail   0.8s

  ✓ 执行完成
```

The final answer remains outside this panel. The panel is supporting evidence
for the answer, not part of the answer itself.

### Overall collapse behavior

- A live run starts expanded.
- When the run transitions from active to terminal, the panel auto-collapses
  exactly once.
- A completed historical message starts collapsed.
- After the automatic transition, the user's manual expanded/collapsed choice
  is authoritative and is not overwritten by later renders.
- The header remains visible in both states and reports terminal status plus the
  number of observed tools. It reports total duration only when the available
  tool timestamps make that value reliable.

### Reasoning steps

- Render actual structured reasoning segments; do not synthesize a summary.
- Stream each active segment with the existing Markdown renderer.
- Use the first visible segment label **任务分析** and later visible segments
  **继续分析** so repeated turns remain understandable.
- Long completed reasoning is visually clamped in its step and exposes
  **展开更多** / **收起**. Clamping never changes or truncates stored text.
- Active reasoning stays visible while it streams. The long-content control is
  applied once enough content exists to overflow the compact view.
- A partial segment retains its text and displays an interruption marker.

### Tool steps

- Insert each tool at its existing `order` among reasoning segments.
- The collapsed row shows a status icon, **调用工具**, the exact tool name,
  latest short progress text when present, duration when present, and a
  type-aware result summary when a response is present.
- Tool detail is collapsed by default, including while the overall panel is
  expanded.
- Expanded detail contains separate **调用参数 Arguments** and
  **工具输出 Response** sections.
- Existing large-value behavior remains: type/size summary, **查看全部**,
  **收起**, and **复制完整内容** operate on the original serialized value.
- A running tool without a response shows **等待工具返回…**.

## Component design

The existing `AgentTimeline` public integration point remains shared by both
chat surfaces, but its internals become a focused component tree:

```text
AgentExecutionPanel
  ├── ExecutionPanelHeader
  └── ExecutionTimeline
        ├── ReasoningStep
        └── ToolStep
              └── ToolValueSection
```

- `AgentExecutionPanel` owns only presentation state for the overall collapse
  transition. It does not copy reducer data.
- `ExecutionPanelHeader` derives status and tool count from the current
  `AgentStreamState`.
- `ExecutionTimeline` consumes `selectReasoningTimeline(state)`, preserving the
  existing ordered reasoning/tool projection.
- `ReasoningStep` owns only its local long-text expanded state.
- `ToolStep` replaces the visual structure of the existing `ToolCard` while
  retaining its exact-value detail behavior.
- `ToolValueSection` continues to serialize and render a large value only after
  its parent tool detail has been expanded.

No target surface implements its own version. Workflow debug chat and
published chat continue to render the same exported timeline component.

## State and data flow

```text
Pi Agent structured events
  -> workflow/console SSE
  -> shared AgentStream reducer
  -> ordered reasoning/tool selector
  -> AgentExecutionPanel
  -> final answer rendered separately
```

No protocol or persistence migration is required. The existing
`AgentStreamState.schemaVersion = 2` contains every value needed by the new
presentation:

- reasoning text, order, completion, and partial state;
- tool name, arguments, response, progress, status, timestamps, and duration;
- run interruption state and reason.

The panel's execution status is derived as follows:

| Condition | Header status |
| --- | --- |
| parent message is streaming and no interruption is final | 正在执行 |
| `interruptionReason === cancelled` | 已取消 |
| `interruptionReason === error` | 执行失败 |
| `interruptionReason === transport_closed` | 连接中断 |
| no running tool and parent message is no longer streaming | 执行完成 |

The component must tolerate a terminal tool record arriving before the parent
message's streaming flag changes. The panel stays in the running state until
the parent stream actually ends.

## Legacy compatibility

- Before any structured event is observed, both chat surfaces retain their
  current legacy reasoning/tool components.
- Once `hasStructuredEvents` is true, only the structured execution panel owns
  reasoning and tool display, preventing duplicate output.
- Final answer selection remains unchanged: formatted workflow content wins;
  structured live content is only the draft before final workflow content
  arrives.
- `REASONING_CONTENT` and Trace data remain backend outputs and are not altered
  by this UI change.
- Previously persisted schema-version-2 streams render with the new panel
  without data migration.

## Error, size, and security behavior

- Failed tools use an error icon and retain the complete error response in the
  expandable details.
- Cancelled tools and partial reasoning remain visible after cancellation.
- A transport interruption never clears already received text.
- Large tool values stay collapsed and compact by default. The UI does not
  repeatedly pretty-print them during reasoning token updates.
- Tool arguments, responses, and reasoning are rendered as text/Markdown
  through existing escaping components; they are never interpolated as raw
  HTML.
- Copy actions copy the complete original serialized value, not the visible
  summary or clamped content.

## Accessibility

- The overall panel header and each tool row are native `button` elements.
- Every disclosure button exposes its current `aria-expanded` value.
- Buttons remain reachable and operable by keyboard.
- Status is communicated by text in addition to colour and icon.
- Focus styles use the repository's existing visible focus treatment.

## Testing strategy

Implementation follows test-driven development.

### Pure state and selector tests

- preserve reasoning/tool chronological order;
- derive running, completed, failed, cancelled, and transport-interrupted
  presentation states;
- count tools without counting repeated lifecycle events twice;
- apply the one-time live-to-terminal auto-collapse transition without
  overwriting later manual interaction;
- retain compatibility with parsed persisted schema-version-2 state.

### Component behavior tests

- live process starts expanded;
- completed history starts collapsed;
- a live process collapses once when streaming ends;
- reasoning uses the actual streamed segment text;
- long reasoning exposes expand/collapse without altering its content;
- tool detail starts collapsed and exposes Arguments and Response on demand;
- running, success, error, cancelled, and interrupted labels are visible;
- every disclosure exposes the correct `aria-expanded` value.

### Regression and build verification

- run the existing agent-stream reducer and tool-value suites;
- run new focused execution-panel tests;
- run targeted lint and TypeScript checks for touched files;
- build the frontend production bundle;
- verify both workflow debugger and published chat with the same harmless MCP
  query, observing live reasoning, ordered tools, automatic completion collapse,
  manual expansion, and preserved final answer;
- open Trace for that execution and confirm the UI change did not affect trace
  retrieval.

## Acceptance criteria

The feature is complete only when all of the following are observed:

1. Pi reasoning grows token by token inside a labelled task-analysis step.
2. Reasoning and tools appear in real chronological order.
3. The overall process is expanded while running and auto-collapses exactly
   once on completion.
4. A tool row is collapsed by default and shows its exact name, status, progress,
   duration, and compact response summary when available.
5. Expanded tool detail exposes complete arguments and response, including
   large-value expand and copy controls.
6. Failed, cancelled, and transport-interrupted runs preserve all received
   reasoning and tool records with an explicit terminal label.
7. Workflow debug chat and published chat render the same component behavior.
8. Historical schema-version-2 records restore the process after refresh.
9. Legacy non-structured messages keep their existing display path.
10. Final workflow answer, `REASONING_CONTENT`, and Trace remain unchanged.
