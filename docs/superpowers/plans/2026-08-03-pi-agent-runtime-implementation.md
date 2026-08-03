# Pi Agent Runtime Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Apply superpowers:test-driven-development to every production behavior and superpowers:verification-before-completion before each completion claim.

**Goal:** Replace every tool-enabled Workflow ReAct execution path with the native `earendil-works/pi` agent loop, preserve the existing public API/SSE contract without frontend changes, add a real `wait(seconds)` tool, and ship MCP Streamable HTTP compatibility.

**Architecture:** `core/agent` remains the public Python compatibility facade and existing plugin executor. It opens one authenticated WebSocket per run to a new internal `core/pi-agent` Node.js service. Pi owns model turns and tool-call continuation; Python executes discovered Link/MCP/Sub-workflow/Skill plugins and maps Pi events back to existing chunks. No legacy Cot loop or fallback remains.

**Tech Stack:** Python 3.11, FastAPI/Pydantic/aiohttp/pytest; Node.js 22+, TypeScript, `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, TypeBox, `ws`, Vitest; Docker Compose and Helm.

---

### Task 1: Scaffold the internal Pi Runtime protocol

**Files:**

- Create: `core/pi-agent/package.json`
- Create: `core/pi-agent/package-lock.json`
- Create: `core/pi-agent/tsconfig.json`
- Create: `core/pi-agent/src/protocol.ts`
- Create: `core/pi-agent/src/config.ts`
- Create: `core/pi-agent/test/protocol.test.ts`

**Step 1: Write failing protocol tests**

Cover these consumer-visible breaks:

- a `start` message with model, messages and JSON Schema tools is accepted;
- `maxLoopCount` is neither accepted nor represented in the internal run request;
- malformed messages and missing auth configuration fail with stable error codes;
- runtime tool names are normalized and duplicate names get deterministic suffixes.

Use literal fixtures rather than protocol builders in assertions.

**Step 2: Run the test and observe RED**

Run: `cd core/pi-agent && npm test -- --run test/protocol.test.ts`

Expected: failure because protocol/config modules do not exist.

**Step 3: Implement the minimum protocol and configuration**

Define discriminated message types for `start`, `tool_result`, `content_delta`, `reasoning_delta`, `tool_call`, `tool_progress`, `tool_completed`, `usage`, `error`, and `done`. Parse environment defaults:

- `PI_AGENT_PORT=8090`
- `PI_AGENT_MAX_RUN_MS=1500000`
- `PI_AGENT_MAX_WAIT_SECONDS=120`
- `PI_AGENT_REPEAT_TOOL_CALL_LIMIT=8`
- required `PI_AGENT_INTERNAL_SECRET` outside tests.

Do not add `maxLoopCount` to the protocol.

**Step 4: Run GREEN and typecheck**

Run: `cd core/pi-agent && npm test -- --run test/protocol.test.ts && npm run typecheck`

**Step 5: Commit**

```bash
git add core/pi-agent
git commit -m "feat(pi-runtime): define internal run protocol"
```

### Task 2: Build Pi model providers and native event projection

**Files:**

- Create: `core/pi-agent/src/model.ts`
- Create: `core/pi-agent/src/run-agent.ts`
- Create: `core/pi-agent/test/model.test.ts`
- Create: `core/pi-agent/test/run-agent.test.ts`

**Step 1: Write failing model and loop tests**

Prove:

- OpenAI-compatible providers use `openAICompletionsApi()` and normalize a trailing `/chat/completions`;
- Anthropic and Google select their Pi provider APIs;
- history roles and current user question reach the Pi context unchanged;
- a fake Pi stream's `text_delta`, `thinking_delta`, tool lifecycle and usage become protocol events;
- the implementation consumes Pi `agentLoop()` rather than implementing a turn-count loop.

Use a fake `StreamFn` at Pi's documented boundary so the real Pi agent loop and tool scheduling execute in tests without calling an external model.

**Step 2: Run RED**

Run: `cd core/pi-agent && npm test -- --run test/model.test.ts test/run-agent.test.ts`

**Step 3: Implement with Pi official APIs**

Create one `createModels()` registry per run, register one request-scoped `createProvider()` and call `agentLoop()` with `models.streamSimple.bind(models)`. Keep the system prompt limited to business instruction, knowledge context and a short note that `wait` is available; never insert Thought/Action/Observation formatting.

**Step 4: Run GREEN and build**

Run: `cd core/pi-agent && npm test -- --run test/model.test.ts test/run-agent.test.ts && npm run build`

**Step 5: Commit**

```bash
git add core/pi-agent
git commit -m "feat(pi-runtime): run native Pi agent loop"
```

### Task 3: Add Python tool bridge, wait, cancellation and repetition safety

**Files:**

- Create: `core/pi-agent/src/tool-bridge.ts`
- Create: `core/pi-agent/src/safety.ts`
- Create: `core/pi-agent/test/tool-bridge.test.ts`
- Create: `core/pi-agent/test/safety.test.ts`

**Step 1: Write failing behavior tests**

Prove:

- an `AgentTool.execute()` sends one `tool_call` and resolves only the matching `tool_result`;
- bridge error results throw into Pi's normal tool error path;
- closing/aborting a run rejects pending tools;
- `wait({seconds: 0.03})` does not resolve immediately and can be aborted;
- values below zero or above the configured bound fail validation;
- the ninth consecutive identical tool call is blocked at the default limit, while `tool -> wait -> same tool` resets the consecutive-call fuse.

**Step 2: Run RED**

Run: `cd core/pi-agent && npm test -- --run test/tool-bridge.test.ts test/safety.test.ts`

**Step 3: Implement with Pi hooks and AbortSignal**

Create remote `AgentTool` instances from Python schemas, plus the local TypeBox-defined `wait` tool. Use Pi's `beforeToolCall` hook for the repetition fuse and a run-scoped `AbortController` for timeout/client disconnect. Do not add an outer reasoning loop.

**Step 4: Run GREEN**

Run: `cd core/pi-agent && npm test -- --run test/tool-bridge.test.ts test/safety.test.ts && npm run typecheck`

**Step 5: Commit**

```bash
git add core/pi-agent
git commit -m "feat(pi-runtime): bridge tools and add wait safety"
```

### Task 4: Expose the authenticated internal WebSocket service

**Files:**

- Create: `core/pi-agent/src/server.ts`
- Create: `core/pi-agent/src/main.ts`
- Create: `core/pi-agent/test/server.test.ts`

**Step 1: Write failing service tests**

Verify a real ephemeral server:

- `GET /healthz` returns 200 without exposing run data;
- missing/wrong Bearer secret rejects WebSocket upgrade;
- an authenticated connection must send `start` first;
- disconnect aborts the run;
- a fake model stream completes a full content response and sends `done`.

**Step 2: Run RED**

Run: `cd core/pi-agent && npm test -- --run test/server.test.ts`

**Step 3: Implement the service**

Use Node's HTTP server and `ws` only. Keep port 8090 internal, apply a single run deadline, redact API keys from errors/logs, and close each session after `done` or `error`.

**Step 4: Run GREEN and all Node tests**

Run: `cd core/pi-agent && npm test && npm run typecheck && npm run build`

**Step 5: Commit**

```bash
git add core/pi-agent
git commit -m "feat(pi-runtime): serve authenticated agent sessions"
```

### Task 5: Give Python plugins explicit JSON Schema

**Files:**

- Modify: `core/agent/service/plugin/base.py`
- Modify: `core/agent/service/plugin/link.py`
- Modify: `core/agent/service/plugin/mcp.py`
- Modify: `core/agent/service/plugin/workflow.py`
- Modify: `core/agent/service/plugin/skill.py`
- Modify: `core/agent/tests/test_plugin_base_link_mcp_workflow.py`
- Modify: `core/agent/tests/test_skill_plugin.py`

**Step 1: Write failing schema tests**

For each plugin family, assert a literal JSON Schema with `type`, `properties` and `required`. Include the default sub-workflow branch and both skill tools. Assert that the schema sent to Pi does not require parsing `schema_template`.

**Step 2: Run RED**

Run: `cd core/agent && uv run pytest tests/test_plugin_base_link_mcp_workflow.py tests/test_skill_plugin.py -q`

**Step 3: Implement explicit `parameters`**

Add a default object schema to `BasePlugin`, fill it directly in all factories, and retain `schema_template` only for compatibility/logging. Do not refactor plugin execution.

**Step 4: Run GREEN and static checks for touched files**

Run: `cd core/agent && uv run pytest tests/test_plugin_base_link_mcp_workflow.py tests/test_skill_plugin.py -q`

Run: `cd core/agent && uv run mypy agent/service/plugin/base.py agent/service/plugin/link.py agent/service/plugin/mcp.py agent/service/plugin/workflow.py agent/service/plugin/skill.py`

**Step 5: Commit**

```bash
git add core/agent/service/plugin core/agent/tests/test_plugin_base_link_mcp_workflow.py core/agent/tests/test_skill_plugin.py
git commit -m "refactor(agent): expose native tool schemas"
```

### Task 6: Implement the Python Pi session client and plugin executor

**Files:**

- Create: `core/agent/engine/nodes/pi/__init__.py`
- Create: `core/agent/engine/nodes/pi/pi_runner.py`
- Create: `core/agent/engine/nodes/pi/protocol.py`
- Create: `core/agent/tests/test_pi_runner.py`

**Step 1: Write failing client tests**

Use a real local aiohttp WebSocket test server and real plugin objects to prove:

- the first message contains model config, history, instruction, knowledge and explicit tool schemas but not `max_loop_count`;
- content/reasoning events become existing `AgentResponse` types;
- a tool call invokes the matching Python plugin and sends the correlated result;
- sub-workflow async-generator chunks remain visible and are accumulated into the Pi tool result;
- duplicate display names map deterministically without invoking the wrong plugin;
- Pi connection failure and protocol error terminate explicitly and never instantiate Cot.

**Step 2: Run RED**

Run: `cd core/agent && uv run pytest tests/test_pi_runner.py -q`

**Step 3: Implement the minimum client**

`PiRunner.run()` opens one WebSocket, sends `start`, maps incoming events, executes plugins inside the current trace span, sends `tool_result`, and closes on cancellation. Reuse the current `CotStep` compatibility payload only at the final public chunk conversion boundary; do not use Cot prompt/parsing/loop code.

**Step 4: Run GREEN**

Run: `cd core/agent && uv run pytest tests/test_pi_runner.py -q`

**Step 5: Commit**

```bash
git add core/agent/engine/nodes/pi core/agent/tests/test_pi_runner.py
git commit -m "feat(agent): bridge workflow tools to Pi runtime"
```

### Task 7: Replace the production Cot path and preserve the public SSE contract

**Files:**

- Modify: `core/agent/service/builder/base_builder.py`
- Modify: `core/agent/service/builder/workflow_agent_builder.py`
- Modify: `core/agent/service/runner/workflow_agent_runner.py`
- Modify: `core/agent/api/schemas/agent_response.py`
- Modify: `core/agent/tests/test_base_builder.py`
- Modify: `core/agent/tests/test_workflow_agent_builder.py`
- Modify: `core/agent/tests/test_workflow_agent_runner.py`
- Modify: `core/agent/tests/test_runner_base_and_chat_cot.py`
- Delete: `core/agent/engine/nodes/cot/`
- Delete: `core/agent/engine/nodes/cot_process/`
- Delete if unused: `core/agent/exceptions/cot_exc.py`

**Step 1: Replace legacy expectations with failing Pi routing tests**

Prove:

- no plugins still selects `ChatRunner`;
- any Link/MCP/Sub-workflow/Skill plugin selects `PiRunner`;
- `max_loop_count=1` and `max_loop_count=100` build identical Pi runtime policy;
- Pi text, reasoning and tool results serialize to the existing `ReasonChatCompletionChunk` fields;
- Pi unavailable returns an explicit error and never falls back;
- production imports contain no `CotRunner` or `CotProcessRunner`.

**Step 2: Run RED**

Run: `cd core/agent && uv run pytest tests/test_base_builder.py tests/test_workflow_agent_builder.py tests/test_workflow_agent_runner.py tests/test_runner_base_and_chat_cot.py -q`

**Step 3: Rewire builder and runner, then remove legacy runtime**

Resolve the API key without constructing a Python model for tool-enabled runs. Build `PiRunner` from the existing input object and plugin list. Keep `max_loop_count` validation in the request schema only. Remove Cot builder helpers/imports and delete the obsolete runtime files once `rg` confirms no production callers.

**Step 4: Run GREEN and route/API regressions**

Run: `cd core/agent && uv run pytest tests/test_base_builder.py tests/test_workflow_agent_builder.py tests/test_workflow_agent_runner.py tests/test_runner_base_and_chat_cot.py tests/test_workflow_agent.py tests/test_base_api.py -q`

Run: `rg -n "CotRunner|CotProcessRunner|COT_SYSTEM|Thought:|Action Input:|max_loop" core/agent/service core/agent/engine || true`

Expected: only intentional public compatibility naming, if any; no production loop implementation.

**Step 5: Commit**

```bash
git add -A core/agent
git commit -m "refactor(agent): replace Cot runtime with Pi"
```

### Task 8: Verify MCP Streamable HTTP through the Pi bridge

**Files:**

- Modify: `core/agent/tests/test_pi_runner.py`
- Existing verification: `core/plugin/link/tests/unit/test_mcp_transport.py`
- Existing verification: `core/plugin/link/tests/unit/test_mcp_server.py`

**Step 1: Add a failing Pi/MCP bridge contract test**

Create an `McpPlugin` whose runner records the validated arguments and returns a literal response. Drive it from a Pi `tool_call` protocol event and assert both the returned `tool_result` and existing public tool-call chunk.

**Step 2: Run RED, then make only bridge corrections needed**

Run: `cd core/agent && uv run pytest tests/test_pi_runner.py -q -k mcp`

**Step 3: Run MCP transport regressions**

Run: `cd core/plugin/link && uv run pytest tests/unit/test_mcp_transport.py tests/unit/test_mcp_server.py -q`

Expected: explicit Streamable HTTP works; AUTO falls back to SSE only for eligible failures; explicit SSE remains supported.

**Step 4: Commit**

```bash
git add core/agent/tests/test_pi_runner.py
git commit -m "test(agent): cover MCP tools through Pi bridge"
```

### Task 9: Add container, Compose, Helm and build-pipeline wiring

**Files:**

- Create: `core/pi-agent/Dockerfile`
- Create: `core/pi-agent/.dockerignore`
- Modify: `docker/astronAgent/docker-compose.yaml`
- Modify: `helm/astron-agent/values.yaml`
- Modify: `helm/astron-agent/templates/core/core-services.yaml`
- Modify: `.github/workflows/build-push.yml`
- Modify: `docker/astronAgent/config/agent/config.env`
- Modify: `helm/astron-agent/files/config/agent/config.env`
- Create: `core/pi-agent/test/deployment.test.ts`

**Step 1: Write failing deployment contract tests**

Render/read the actual deployment artifacts and assert behavior:

- Pi uses Node 22+ and starts the compiled server;
- Pi is on the internal network with healthcheck and no host/public port;
- core-agent receives runtime URL and secret and depends on Pi health;
- Helm creates the Pi Deployment/Service and points core-agent at its service DNS;
- image build workflow includes `core-pi-agent`.

**Step 2: Run RED**

Run: `cd core/pi-agent && npm test -- --run test/deployment.test.ts`

**Step 3: Implement deployment wiring**

Use an internal default secret placeholder consistent with existing open-source Compose conventions while documenting that production must override it. Do not add Nginx/Ingress routes or touch frontend files.

**Step 4: Verify rendered configuration**

Run: `docker compose -f docker/astronAgent/docker-compose.yaml config --quiet`

Run: `helm template astron-agent helm/astron-agent >/tmp/astron-agent-pi-rendered.yaml`

Run: `cd core/pi-agent && npm test -- --run test/deployment.test.ts && docker build -f Dockerfile -t astron-pi-agent:test ../..`

**Step 5: Commit**

```bash
git add core/pi-agent docker/astronAgent helm/astron-agent .github/workflows/build-push.yml
git commit -m "build: deploy internal Pi agent runtime"
```

### Task 10: Full verification and requirements audit

**Files:**

- Modify if necessary: `README.md` or `docs/zh/PROJECT_MODULES.md` for operator-only configuration
- Verify untouched: `console/frontend/**`

**Step 1: Run full focused suites from a clean state**

Run:

```bash
(cd core/pi-agent && npm ci && npm test && npm run typecheck && npm run build)
(cd core/agent && uv sync && uv run pytest -q)
(cd core/plugin/link && uv sync && uv run pytest tests/unit/test_mcp_transport.py tests/unit/test_mcp_server.py -q)
docker compose -f docker/astronAgent/docker-compose.yaml config --quiet
helm lint helm/astron-agent
helm template astron-agent helm/astron-agent >/tmp/astron-agent-pi-rendered.yaml
```

**Step 2: Audit every accepted requirement**

Run:

```bash
git diff main...HEAD -- console/frontend
rg -n "CotRunner|CotProcessRunner|COT_SYSTEM_TEMPLATE|Action Input:|while self.max_loop" core/agent
rg -n "max_loop_count|maxLoopCount" core/agent core/pi-agent
git diff --check main...HEAD
git status --short
```

Expected:

- frontend diff is empty;
- no legacy Cot production loop remains;
- `max_loop_count` appears only in public input compatibility/tests and never in Pi protocol/policy;
- all verification commands exit 0.

**Step 3: Perform the regression-test mutation check**

Temporarily verify that removing real wait delay, restoring Cot routing, or adding `maxLoopCount` to the Pi request makes the corresponding test fail; restore production code and rerun GREEN.

**Step 4: Commit final operator documentation if changed**

```bash
git add README.md docs core/agent core/pi-agent docker helm .github
git commit -m "docs: document Pi agent runtime operations"
```

Do not publish, merge or deploy unless the user explicitly authorizes those external actions.
