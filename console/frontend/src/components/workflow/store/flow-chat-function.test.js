import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Run production store actions and SSE/history helpers against deferred I/O.
function harness({ stop, history, build } = {}) {
  let sequence = 0;
  let request;
  let requestUrl;
  const errors = [];
  const ui = { open: true, status: 'running', disabled: true };
  const flow = { nodes: [], edges: [] };
  const manager = {
    currentFlow: { id: 'workflow', flowId: 'flow' },
    autonomousMode: true,
    setCanPublish() {},
    setShowNodeList() {},
    setCanvasesDisabled(value) {
      ui.disabled = value;
    },
    setFlowResult(value) {
      ui.status = value.status;
      // The drawer effect disconnects when its flow status is cleared.
      if (!value.status) state.controllerRef?.abort();
    },
  };
  flow.setEdges = change => {
    flow.edges = change(flow.edges);
  };
  flow.setNodes = change => {
    flow.nodes = change(flow.nodes);
  };
  flow.setNode = (id, node) => {
    flow.nodes = flow.nodes.map(old => (old.id === id ? node : old));
  };
  const modules = {};
  const mocks = {
    '@/services/flow': {
      getDialogueAPI: history || (() => Promise.resolve([])),
      stopWorkflowRun: stop || (() => Promise.resolve({ status: 'cancelled' })),
      buildFlowAPI: build || (() => Promise.resolve()),
    },
    antd: { message: { error: value => errors.push(value) } },
    uuid: { v4: () => `test-${++sequence}` },
    './flow-function': { moveToPosition() {} },
    '../utils/reactflowUtils': {
      generateInputsAndOutputsOrder: (_node, value) => value,
    },
    './use-flows-manager': { default: { getState: () => manager } },
    './use-flow-store': { default: { getState: () => flow } },
    '@/utils': {
      isJSON: value => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      },
    },
    i18next: { default: { t: value => value } },
    lodash: { cloneDeep: value => structuredClone(value) },
    '@/components/workflow/utils': { getFixedUrl: value => value },
    '@/utils/sse-request': {
      fetchSseWithContext: (url, options) => {
        requestUrl = url;
        request = options;
        return Promise.resolve();
      },
    },
    '@/utils/http': { getLanguageCode: () => 'zh' },
    '@/store/space-store': { default: { getState: () => ({}) } },
  };
  function load(name) {
    if (mocks[name]) return mocks[name];
    if (modules[name]) return modules[name];
    assert.ok(
      ['./workflow-history', './workflow-sse', './flow-chat-function'].includes(
        name
      ),
      name
    );
    const compiled = ts.transpileModule(
      readFileSync(new URL(`${name}.ts`, import.meta.url), 'utf8'),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      }
    ).outputText;
    const exports = {};
    modules[name] = exports;
    new Function('require', 'exports', compiled)(load, exports);
    return exports;
  }
  const actions = load('./flow-chat-function');
  const state = {
    ...actions.initialStatus,
    controllerRef: new AbortController(),
    runId: 'old-run',
    runStatus: 'running',
    debuggering: true,
  };
  const set = change => Object.assign(state, change);
  const get = () => state;
  state.setChatList = change => {
    state.chatList = change(state.chatList);
  };
  state.setInterruptChat = change => {
    state.interruptChat = change;
  };
  state.setDebuggering = value => {
    state.debuggering = value;
  };
  state.setStartNodeParams = value => {
    state.startNodeParams =
      typeof value === 'function' ? value(state.startNodeParams) : value;
  };
  state.setUserInput = value => {
    state.userInput = value;
  };
  state.setSuggestProblem = () => {};
  state.handleSaveDialogue = () => actions.handleSaveDialogue(get, set);
  return {
    actions,
    state,
    get,
    set,
    ui,
    flow,
    errors,
    hasRequest: () => Boolean(request),
    requestUrl: () => requestUrl,
    close: value => {
      ui.open = value;
    },
    frame: (frame, event = '') =>
      request.onmessage({ event, data: JSON.stringify(frame) }),
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('drawer stop retains connection and panel while pending and after rejection', async () => {
  const pending = deferred();
  const h = harness({ stop: () => pending.promise });
  h.actions.clearData(h.close, h.get);
  assert.equal(h.ui.open, true);
  assert.equal(h.ui.status, 'running');
  assert.equal(h.ui.disabled, true);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  pending.reject(new Error('permission rejected'));
  await tick();
  assert.equal(h.state.runStatus, 'running');
  assert.equal(h.state.controllerRef.signal.aborted, false);
  assert.equal(h.errors.length, 1);
});

test('paused drawer stop sends cancellation before clearing paused state', async () => {
  const pending = deferred();
  let calls = 0;
  const h = harness({
    stop: () => {
      calls++;
      return pending.promise;
    },
  });
  h.state.debuggering = false;
  h.state.runStatus = 'paused';
  h.state.interruptChat = { ...h.state.interruptChat, interrupt: true };
  h.actions.clearData(h.close, h.get);
  assert.equal(calls, 1);
  assert.equal(h.state.interruptChat.interrupt, true);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  pending.resolve({ status: 'cancelled' });
  await tick();
  assert.equal(h.state.controllerRef.signal.aborted, true);
  assert.equal(h.state.interruptChat.interrupt, false);
});

test('late same-version history cannot clear a newly resumed execution', async () => {
  const pending = deferred();
  const h = harness({ history: () => pending.promise });
  h.actions.getDialogues('workflow', h.set);
  h.actions.handleResumeChat('continue', h.get, h.set);
  h.frame({ runId: 'new-run', status: 'resuming' }, 'run');
  const chats = h.state.chatList;
  pending.resolve([]);
  await tick();
  assert.equal(h.state.runId, 'new-run');
  assert.equal(h.state.runStatus, 'resuming');
  assert.equal(h.state.chatList, chats);
});

test('stop before the first run frame waits for its ID without aborting', async () => {
  const pending = deferred();
  const stopped = [];
  const h = harness({
    stop: id => {
      stopped.push(id);
      return pending.promise;
    },
  });
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  await tick();
  assert.equal(h.state.runId, '');
  h.actions.clearData(h.close, h.get);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  assert.deepEqual(stopped, []);
  h.frame({ runId: 'assigned-run', status: 'running' }, 'run');
  assert.deepEqual(stopped, ['assigned-run']);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  pending.resolve({ status: 'cancelled' });
  await tick();
  assert.equal(h.state.controllerRef.signal.aborted, true);
});

test('stop during deferred build never starts a run or cancels an old run', async () => {
  const building = deferred();
  const stopped = [];
  const h = harness({
    build: () => building.promise,
    stop: id => {
      stopped.push(id);
      return Promise.resolve({ status: 'cancelled' });
    },
  });
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  assert.equal(h.state.runId, '');
  h.actions.clearData(h.close, h.get);
  assert.equal(h.state.stopRequested, true);
  assert.deepEqual(stopped, []);
  building.resolve();
  await tick();
  assert.equal(h.hasRequest(), false);
  assert.equal(h.state.debuggering, false);
  assert.deepEqual(stopped, []);
});

test('retry retains its original run ID while resetting the active execution', async () => {
  const h = harness();
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
    regen: true,
  });
  assert.equal(h.state.runId, '');
  await tick();
  assert.equal(h.requestUrl(), '/workflow/runs/old-run/retry');
});

test('real variable-mode node frames append JSON once and mark node success', () => {
  const h = harness();
  h.flow.nodes = [
    {
      id: 'node-end::one',
      data: { inputs: [], outputs: [] },
      position: { x: 0, y: 0 },
    },
  ];
  h.actions.handleResumeChat('continue', h.get, h.set);
  h.frame({
    code: 0,
    choices: [{ delta: { content: '' } }],
    workflow_step: { node: { id: 'node-end::one' } },
  });
  assert.equal(h.flow.nodes[0].data.status, 'running');
  h.frame({
    code: 0,
    choices: [{ delta: { content: '{"output":"answer"}' } }],
    workflow_step: {
      node: {
        id: 'node-end::one',
        finish_reason: 'stop',
        outputs: { output: 'answer' },
        ext: { answer_mode: 0 },
      },
    },
  });
  assert.equal(h.state.endNodeTextQueue, '{"output":"answer"}');
  assert.equal(h.flow.nodes[0].data.status, 'success');
});
