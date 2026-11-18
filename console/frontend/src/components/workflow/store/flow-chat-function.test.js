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
    flowResult: { status: 'running', timeCost: '', totalTokens: '' },
    setCanPublish() {},
    setShowNodeList() {},
    setCanvasesDisabled(value) {
      ui.disabled = value;
    },
    setFlowResult(value) {
      manager.flowResult = value;
      ui.timeCost = value.timeCost;
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
    conversationScope: JSON.stringify(['workflow', 'draft', '']),
    historyStatus: 'ready',
    controllerRef: new AbortController(),
    runId: 'old-run',
    runStatus: 'running',
    debuggering: true,
  };
  const updates = [];
  const set = change => {
    updates.push(change);
    Object.assign(state, change);
  };
  const get = () => state;
  state.setChatList = change => {
    state.chatList =
      typeof change === 'function' ? change(state.chatList) : change;
  };
  state.setDeleteAllModal = value => {
    state.deleteAllModal = value;
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
  state.handleStopConversation = () => actions.handleStopConversation(get, set);
  return {
    actions,
    state,
    get,
    set,
    ui,
    manager,
    flow,
    errors,
    updates,
    hasRequest: () => Boolean(request),
    requestUrl: () => requestUrl,
    requestBody: () => JSON.parse(request.body),
    close: value => {
      ui.open = value;
    },
    frame: (frame, event = '') =>
      request.onmessage({ event, data: JSON.stringify(frame) }),
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('uninitialized conversation cannot send before history loads or new conversation is selected', () => {
  const h = harness();
  h.state.historyStatus = 'idle';
  h.state.conversationScope = '';
  h.state.debuggering = false;
  h.state.startNodeParams = [{ name: 'query', type: 'string' }];
  h.state.userInput = 'hello';
  assert.equal(h.actions.canRunDebugger(h.get), false);
  h.actions.deleteAllChat(h.get);
  h.state.userInput = 'hello';
  assert.equal(h.actions.canRunDebugger(h.get), true);
});

test('draft to version history blocks send and clears stale session and pause before loading', async () => {
  const pending = deferred();
  const h = harness({ history: () => pending.promise });
  h.state.debuggering = false;
  h.state.chatIdRef = 'draft-session';
  h.state.conversationScope = JSON.stringify(['workflow', 'draft', '']);
  h.state.interruptChat = {
    ...h.state.interruptChat,
    interrupt: true,
    eventId: 'draft-event',
  };
  h.state.runStatus = 'paused';
  h.state.startNodeParams = [{ name: 'query', type: 'string' }];
  h.state.userInput = 'send';
  h.manager.historyVersion = true;
  h.manager.historyVersionData = { versionNum: 'v1' };
  assert.equal(
    h.actions.canRunDebugger(h.get),
    false,
    'scope change is blocked even before history effect'
  );
  const previousController = h.state.controllerRef;
  h.actions.getDialogues('workflow', h.set, false, h.get);
  assert.equal(previousController.signal.aborted, true);
  assert.equal(h.state.chatIdRef, '');
  assert.equal(h.state.runId, '');
  assert.equal(h.state.interruptChat.interrupt, false);
  assert.equal(h.state.historyStatus, 'loading');
  assert.equal(h.actions.canRunDebugger(h.get), false);
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  h.actions.handleResumeChat('stale reply', h.get, h.set);
  await tick();
  assert.equal(
    h.hasRequest(),
    false,
    'direct action calls cannot bypass loading guard'
  );

  pending.resolve([
    {
      id: 'version-run',
      runId: 'version-run',
      chatId: 'version-session',
      question: 'version question',
      answer: 'version answer',
    },
  ]);
  await tick();
  assert.equal(h.state.historyStatus, 'ready');
  assert.equal(h.state.chatIdRef, 'version-session');
  h.state.userInput = 'continue';
  assert.equal(h.actions.canRunDebugger(h.get), true);
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  await tick();
  assert.equal(h.requestBody().chatId, 'version-session');
  assert.equal(h.requestBody().version, 'v1');
});

test('history failure can retry or escape to a new conversation without accepting late history', async () => {
  const attempts = [deferred(), deferred(), deferred()];
  let index = 0;
  const h = harness({ history: () => attempts[index++].promise });
  h.state.debuggering = false;
  h.actions.getDialogues('workflow', h.set);
  attempts[0].reject(new Error('offline'));
  await tick();
  assert.equal(h.state.historyStatus, 'error');
  assert.equal(h.actions.canRunDebugger(h.get), false);
  h.actions.deleteAllChat(h.get);
  assert.equal(
    h.state.historyStatus,
    'ready',
    'new conversation escapes failed history'
  );
  assert.equal(h.state.chatIdRef, '');
  h.actions.getDialogues('workflow', h.set);
  assert.equal(h.state.historyStatus, 'loading');
  attempts[1].resolve([]);
  await tick();
  assert.equal(h.state.historyStatus, 'ready');

  h.actions.getDialogues('workflow', h.set);
  h.actions.deleteAllChat(h.get);
  assert.equal(h.state.historyStatus, 'ready');
  assert.equal(h.state.chatIdRef, '');
  attempts[2].resolve([
    {
      id: 'old-run',
      runId: 'old-run',
      chatId: 'old-session',
      question: 'old',
      answer: 'old',
    },
  ]);
  await tick();
  assert.equal(h.state.chatIdRef, '');
  assert.deepEqual(h.state.chatList, []);
});

test('old workflow history failure cannot overwrite the selected workflow', async () => {
  const old = deferred();
  const selected = deferred();
  const h = harness({
    history: id => (id === 'workflow' ? old.promise : selected.promise),
  });
  h.actions.getDialogues('workflow', h.set);
  h.manager.currentFlow = { id: 'other-workflow', flowId: 'other-flow' };
  h.actions.getDialogues('other-workflow', h.set);
  selected.resolve([
    {
      id: 'selected-run',
      runId: 'selected-run',
      chatId: 'selected-session',
      question: 'selected',
      answer: 'answer',
    },
  ]);
  await tick();
  old.reject(new Error('late old failure'));
  await tick();
  assert.equal(h.state.historyStatus, 'ready');
  assert.equal(h.state.chatIdRef, 'selected-session');
  assert.equal(h.errors.length, 0);
});

test('a draft build finishing after version history loads cannot start a cross-scope run', async () => {
  const building = deferred();
  const h = harness({ build: () => building.promise });
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  h.manager.historyVersion = true;
  h.manager.historyVersionData = { versionNum: 'v1' };
  h.actions.getDialogues('workflow', h.set, false, h.get);
  await tick();
  building.resolve();
  await tick();
  assert.equal(h.hasRequest(), false);
  assert.equal(h.state.historyStatus, 'ready');
  assert.equal(h.state.debuggering, false);
});

test('history reopens only the latest conversation in chronological order', async () => {
  const h = harness({
    history: async () => [
      {
        id: 'old',
        runId: 'old',
        chatId: 'old-session',
        question: 'old question',
        answer: 'old answer',
      },
      {
        id: 'first',
        runId: 'first',
        chatId: 'latest-session',
        question: 'one',
        answer: 'first answer',
      },
      {
        id: 'second',
        runId: 'second',
        chatId: 'latest-session',
        question: 'two',
        answer: 'second answer',
      },
    ],
  });
  h.actions.getDialogues('workflow', h.set);
  await tick();
  assert.equal(h.state.chatIdRef, 'latest-session');
  assert.deepEqual(
    h.state.chatList.map(item => item.type),
    ['ask', 'answer', 'ask', 'answer']
  );
  assert.equal(h.state.chatList[0].inputs[0].default, 'one');
  assert.equal(h.state.chatList[1].content, 'first answer');
  assert.equal(h.state.chatList[2].inputs[0].default, 'two');
});

test('finishing a turn retains live message identities without reloading history', async () => {
  let historyRequests = 0;
  const h = harness({
    history: async () => {
      historyRequests++;
      return [
        {
          id: 'saved',
          runId: 'old-run',
          chatId: 'session',
          question: 'question',
          answer: 'saved answer',
        },
      ];
    },
  });
  h.state.debuggering = false;
  h.state.runStatus = 'completed';
  h.state.chatList = [
    {
      id: 'ask-live',
      type: 'ask',
      inputs: [{ name: 'query', default: 'question' }],
    },
    {
      id: 'answer-live',
      type: 'answer',
      runId: 'old-run',
      content: 'streamed answer',
    },
  ];
  const ask = h.state.chatList[0];
  h.actions.handleSaveDialogue(h.get, h.set);
  await tick();
  assert.equal(historyRequests, 0);
  assert.equal(h.state.historyStatus, 'ready');
  assert.equal(h.state.chatList[0], ask);
  assert.equal(h.state.chatList[1].id, 'answer-live');
  assert.equal(h.state.chatList[1].content, 'streamed answer');
  assert.equal(h.state.chatList[1].status, 'completed');

  // Explicitly reopening still reads the persisted server transcript.
  h.actions.getDialogues('workflow', h.set, false, h.get);
  await tick();
  assert.equal(historyRequests, 1);
  assert.equal(h.state.chatList[1].id, 'saved');
  assert.equal(h.state.chatList[1].content, 'saved answer');
});

test('terminal run frame after streaming preserves content without a history round trip', async () => {
  let historyRequests = 0;
  const h = harness({
    history: async () => {
      historyRequests++;
      return [];
    },
  });
  h.actions.handleResumeChat('question', h.get, h.set);
  h.state.debuggering = false;
  h.state.wsMessageStatus = 'end';
  h.state.chatList = [
    {
      id: 'answer-live',
      type: 'answer',
      runId: 'old-run',
      content: 'final output',
    },
  ];
  h.frame({ runId: 'old-run', status: 'completed' }, 'run-end');
  await tick();
  assert.equal(historyRequests, 0);
  assert.equal(h.state.chatList[0].id, 'answer-live');
  assert.equal(h.state.chatList[0].content, 'final output');
  assert.equal(h.state.chatList[0].status, 'completed');
});

test('failed and stopped turns retain partial replies and terminal feedback', () => {
  for (const status of ['failed', 'cancelled', 'interrupted']) {
    const h = harness({
      history: () => {
        throw new Error('must not reload');
      },
    });
    h.state.debuggering = false;
    h.state.runStatus = status;
    h.state.chatList = [
      {
        id: 'partial',
        type: 'answer',
        runId: 'old-run',
        content: 'partial reply',
      },
    ];
    h.actions.handleSaveDialogue(h.get, h.set);
    assert.equal(h.state.chatList[0].id, 'partial');
    assert.equal(h.state.chatList[0].content, 'partial reply');
    assert.equal(h.state.chatList[0].status, status);
    assert.equal(h.state.historyStatus, 'ready');
  }
});

test('confirmed stop drains all pending channels to the original reply and isolates the next turn', async () => {
  let historyRequests = 0;
  const h = harness({
    history: async () => {
      historyRequests++;
      return [];
    },
  });
  h.state.chatList = [
    {
      id: 'older',
      type: 'answer',
      runId: 'older-run',
      content: 'older output',
    },
    {
      id: 'current',
      type: 'answer',
      runId: 'old-run',
      messageContent: 'message prefix',
      reasoningContent: 'reason prefix',
      content: 'answer prefix',
    },
  ];
  h.state.messageNodeTextQueue = ' message suffix';
  h.state.endNodeReasoningTextQueue = ' reason suffix';
  h.state.endNodeTextQueue = ' answer suffix';
  h.actions.handleStopConversation(h.get, h.set);
  await tick();
  assert.equal(h.state.debuggering, false);
  assert.equal(h.state.chatList[0].content, 'older output');
  assert.deepEqual(h.state.chatList[1], {
    id: 'current',
    type: 'answer',
    runId: 'old-run',
    status: 'cancelled',
    messageContent: 'message prefix message suffix',
    reasoningContent: 'reason prefix reason suffix',
    content: 'answer prefix answer suffix',
  });
  assert.equal(h.state.messageNodeTextQueue, '');
  assert.equal(h.state.endNodeReasoningTextQueue, '');
  assert.equal(h.state.endNodeTextQueue, '');
  assert.equal(historyRequests, 0);

  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  await tick();
  const next = h.state.chatList.at(-1);
  assert.equal(next.type, 'answer');
  assert.equal(next.messageContent, '');
  assert.equal(next.reasoningContent, '');
  assert.equal(next.content, '');
  assert.equal(h.state.chatList[1].content, 'answer prefix answer suffix');
});

test('rejected stop leaves queue playback active without duplicating buffered text', async () => {
  const pending = deferred();
  const h = harness({ stop: () => pending.promise });
  h.state.chatList = [
    { id: 'current', type: 'answer', runId: 'old-run', content: 'prefix' },
  ];
  h.state.endNodeTextQueue = ' suffix';
  h.actions.handleStopConversation(h.get, h.set);
  pending.reject(new Error('stop rejected'));
  await tick();
  assert.equal(h.state.debuggering, true);
  assert.equal(h.state.chatList[0].content, 'prefix');
  assert.equal(h.state.endNodeTextQueue, ' suffix');
});

test('completion winning a stop race preserves buffered final text once', async () => {
  const h = harness({ stop: async () => ({ status: 'completed' }) });
  h.state.chatList = [
    { id: 'current', type: 'answer', runId: 'old-run', content: 'prefix' },
  ];
  h.state.endNodeTextQueue = ' suffix';
  h.actions.handleStopConversation(h.get, h.set);
  await tick();
  h.actions.setDebuggering(false, h.get, h.set);
  assert.equal(h.state.chatList[0].content, 'prefix suffix');
  assert.equal(h.state.chatList[0].status, 'completed');
  assert.equal(h.state.endNodeTextQueue, '');
});

test('ending playback preserves buffered text and cannot append it to another run', () => {
  for (const status of ['failed', 'interrupted']) {
    const h = harness();
    h.state.runStatus = status;
    h.state.chatList = [
      { id: 'current', type: 'answer', runId: 'old-run', content: 'prefix' },
    ];
    h.state.endNodeTextQueue = ' received suffix';
    h.actions.setDebuggering(false, h.get, h.set);
    h.actions.handleSaveDialogue(h.get, h.set);
    assert.equal(h.state.chatList[0].content, 'prefix received suffix');
    assert.equal(h.state.chatList[0].status, status);
    assert.equal(h.state.endNodeTextQueue, '');
  }
  const h = harness();
  h.state.chatList = [
    {
      id: 'other',
      type: 'answer',
      runId: 'other-run',
      content: 'other output',
    },
  ];
  h.state.endNodeTextQueue = ' stale suffix';
  h.actions.setDebuggering(false, h.get, h.set);
  assert.equal(h.state.chatList[0].content, 'other output');
  assert.equal(h.state.endNodeTextQueue, '');
});

test('new conversation clears local context and cannot race an active execution', () => {
  const h = harness();
  h.state.chatIdRef = 'server-session';
  h.state.chatList = [{ type: 'answer', content: 'retained on server' }];
  h.actions.deleteAllChat(h.get);
  assert.equal(h.state.chatIdRef, 'server-session');
  h.state.debuggering = false;
  h.state.runStatus = 'completed';
  h.actions.deleteAllChat(h.get);
  assert.equal(h.state.chatIdRef, '');
  assert.deepEqual(h.state.chatList, []);
  assert.equal(h.state.runId, '');
  assert.equal(h.hasRequest(), false);
});

test('server run frame establishes the conversation for following turns', () => {
  const h = harness();
  h.actions.handleResumeChat('continue', h.get, h.set);
  h.frame(
    { runId: 'first-run', chatId: 'server-session', status: 'running' },
    'run'
  );
  assert.equal(h.state.chatIdRef, 'server-session');
});
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
  assert.equal(h.state.runStatus, 'stopping');
  assert.ok(h.updates.some(update => update.runStatus === 'stopping'));
  assert.equal(h.ui.open, true);
  assert.equal(h.ui.status, 'running');
  assert.equal(h.ui.disabled, true);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  pending.reject(new Error('permission rejected'));
  await tick();
  assert.equal(h.state.runStatus, 'running');
  assert.ok(h.updates.some(update => update.runStatus === 'running'));
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
  h.state.startNodeParams = [{ name: 'query', type: 'string' }];
  h.state.userInput = 'continue';
  h.flow.nodes = [
    {
      id: 'question',
      data: { status: 'running', debuggerResult: { input: 'keep' } },
    },
    { id: 'start', data: { status: 'success' } },
  ];
  assert.equal(h.actions.canRunDebugger(h.get), true);
  h.actions.clearData(h.close, h.get);
  assert.equal(calls, 1);
  assert.equal(h.state.interruptChat.interrupt, true);
  assert.equal(h.flow.nodes[0].data.status, 'running');
  assert.equal(h.state.controllerRef.signal.aborted, false);
  const controller = h.state.controllerRef;
  assert.equal(h.actions.canRunDebugger(h.get), false);
  h.actions.handleResumeChat('continue', h.get, h.set);
  assert.equal(h.state.controllerRef, controller);
  assert.equal(h.hasRequest(), false);
  pending.resolve({ status: 'cancelled' });
  await tick();
  assert.equal(controller.signal.aborted, true);
  assert.equal(h.state.interruptChat.interrupt, false);
  assert.equal(h.ui.status, 'cancelled');
  assert.equal(h.flow.nodes[0].data.status, 'cancel');
  assert.equal(h.flow.nodes[0].data.debuggerResult.input, 'keep');
  assert.equal(h.flow.nodes[1].data.status, 'success');
  assert.equal(h.state.stopRequested, false);
  assert.equal(h.actions.canRunDebugger(h.get), true);
});

test('stop racing with completion keeps the successful result', async () => {
  const h = harness({ stop: async () => ({ status: 'completed' }) });
  h.flow.nodes = [
    { id: 'pending-frame', data: { status: 'running' } },
    { id: 'finished', data: { status: 'success' } },
  ];
  h.actions.clearData(h.close, h.get);
  await tick();
  assert.ok(h.updates.some(update => update.runStatus === 'completed'));
  assert.equal(h.state.stopRequested, false);
  assert.equal(h.ui.status, 'success');
  assert.equal(h.flow.nodes[0].data.status, '');
  assert.equal(h.flow.nodes[0].data.debuggerResult?.cancelReason, undefined);
  assert.equal(h.flow.nodes[1].data.status, 'success');
});

test('successful SSE terminal frames arriving before stop completion retain node results', async () => {
  for (const terminal of ['run-end', 'flow-stop']) {
    const pending = deferred();
    const h = harness({ stop: () => pending.promise });
    h.actions.handleResumeChat('continue', h.get, h.set);
    h.flow.nodes = [
      {
        id: 'pending-frame',
        data: { status: 'running', debuggerResult: { input: 'keep' } },
      },
      {
        id: 'finished',
        data: { status: 'success', debuggerResult: { output: 'answer' } },
      },
      {
        id: 'failed',
        data: {
          status: 'failed',
          debuggerResult: { failedReason: 'keep reason' },
        },
      },
    ];
    h.actions.handleStopConversation(h.get, h.set);
    assert.equal(h.state.runStatus, 'stopping');
    const expected = structuredClone(h.flow.nodes);
    expected[0].data.status = '';
    if (terminal === 'run-end') {
      h.frame({ runId: 'old-run', status: 'completed' }, 'run-end');
    } else {
      h.frame({
        code: 0,
        choices: [{ finish_reason: 'stop', delta: { content: '' } }],
        workflow_step: { node: { id: 'flow_obj', finish_reason: 'stop' } },
      });
    }
    assert.deepEqual(h.flow.nodes, expected);
    pending.resolve({ status: 'completed' });
    await tick();
    assert.deepEqual(h.flow.nodes, expected);
    assert.equal(h.ui.status, 'success');
  }
});

test('late same-version history cannot clear a newly resumed execution', async () => {
  const pending = deferred();
  const h = harness({ history: () => pending.promise });
  h.actions.getDialogues('workflow', h.set);
  h.actions.deleteAllChat(h.get);
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
  const controller = h.state.controllerRef;
  h.actions.clearData(h.close, h.get);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  assert.deepEqual(stopped, []);
  h.frame({ runId: 'assigned-run', status: 'running' }, 'run');
  assert.deepEqual(stopped, ['assigned-run']);
  assert.equal(h.state.controllerRef.signal.aborted, false);
  pending.resolve({ status: 'cancelled' });
  await tick();
  assert.equal(controller.signal.aborted, true);
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

test('a failed build after stopping restores retry eligibility', async () => {
  const building = deferred();
  const h = harness({ build: () => building.promise });
  h.state.startNodeParams = [{ name: 'query', type: 'string' }];
  h.state.userInput = 'retry';
  h.actions.handleRunDebugger({
    nodes: [],
    edges: [],
    get: h.get,
    set: h.set,
    inputs: [],
  });
  h.actions.clearData(h.close, h.get);
  assert.equal(h.state.stopRequested, true);
  building.reject(new Error('build unavailable'));
  await tick();
  assert.equal(h.state.stopRequested, false);
  assert.equal(h.state.runStatus, 'failed');
  assert.equal(h.state.debuggering, false);
  assert.equal(h.ui.status, 'failed');
  assert.equal(h.actions.canRunDebugger(h.get), true);
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

test('run-end retains authoritative elapsed seconds after terminal handling', () => {
  for (const status of [
    'completed',
    'cancelled',
    'interrupted',
    'failed',
    'paused',
  ]) {
    const h = harness();
    h.actions.handleResumeChat('continue', h.get, h.set);
    h.frame({ runId: 'old-run', status, durationMs: 4180 }, 'run-end');
    assert.equal(h.ui.timeCost, '4.18');
    assert.equal(h.state.runStatus, status);
    assert.equal(
      h.ui.status,
      status === 'paused'
        ? 'running'
        : status === 'completed'
          ? 'success'
          : status
    );
  }
});
