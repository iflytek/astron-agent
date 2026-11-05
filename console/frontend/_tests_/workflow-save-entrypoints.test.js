import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as coordinators from '../src/components/workflow/store/workflow-save-coordinator.ts';
import { workflowExecutionView } from '../src/components/workflow/store/workflow-execution-view.ts';
import {
  trackWorkflowSave,
  waitForWorkflowSaves,
} from '../src/services/workflow-save-tracker.ts';
const require = createRequire(import.meta.url);
const noop = () => {};
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', 'window', compiled)(
    name => (name in dependencies ? dependencies[name] : require(name)),
    exports,
    { localStorage: { getItem: () => null } }
  );
  return exports;
}
function callback(path, name, scope) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let expression;
  function visit(node) {
    if (typeof name === 'function') expression ??= name(node);
    else if (ts.isVariableDeclaration(node) && node.name.getText() === name)
      expression = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const exports = {};
  const compiled = ts.transpileModule(
    `export const actual = ${expression.getText(tree)}`,
    {
      fileName: 'callback.tsx',
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
      },
    }
  ).outputText;
  new Function(...Object.keys(scope), 'exports', compiled)(
    ...Object.values(scope),
    exports
  );
  return exports.actual;
}
function harness(
  persist = async () => {},
  waitForSaves = async () => {},
  services = {}
) {
  const canvas = {
    nodes: [],
    edges: [],
    setNodes(nodes) {
      this.nodes = nodes;
    },
    setEdges(edges) {
      this.edges = edges;
    },
  };
  const state = {
    currentFlow: {
      id: '42',
      flowId: 'flow-42',
      name: 'draft',
      data: '{"nodes":[],"edges":[]}',
    },
    historyVersion: false,
    canvasesDisabled: false,
    draftSaveGeneration: 1,
    draftLoaded: true,
    setCurrentFlow(value) {
      state.currentFlow = value;
    },
    setIsLoading: noop,
  };
  const writes = [];
  const advanced = load(
    '../src/components/workflow/store/advanced-config-persistence.ts',
    { './workflow-save-coordinator': coordinators }
  );
  const manager = load(
    '../src/components/workflow/store/flow-manager-function.ts',
    {
      antd: { message: { error: noop } },
      '@/utils/http-error': { shouldShowRequestError: () => false },
      './advanced-config-persistence': advanced,
      './workflow-save-coordinator': coordinators,
      '@/services/flow': {
        waitForWorkflowSaves: waitForSaves,
        hasPendingWorkflowSaves: () => false,
        getFlowDetailAPI: async () => state.currentFlow,
        flowsNodeTemplate: async () => [],
        textNodeConfigList: async () => [],
        getAgentStrategyAPI: async () => [],
        getKnowledgeProStrategyAPI: async () => [],
        ...services,
        saveFlowAPI: async patch => {
          writes.push(structuredClone(patch));
          await persist(patch);
          return { data: JSON.stringify(patch.data), updateTime: 'saved' };
        },
      },
      '../utils/variable-aggregation': {
        appendVariableAggregationNodeTemplate: value => value,
      },
      './use-flow-store': { getState: () => canvas },
      './use-iterator-flow-store': {},
      '@/assets/imgs/workflow/loop-node-icon.svg': '',
      '@/components/workflow/utils/workflow-import-dependencies': {},
    }
  );
  const set = patch =>
    Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  manager.adoptWorkflowDraft(state.currentFlow, set);
  state.hasUnsavedCurrentFlow = () =>
    manager.hasUnsavedCurrentFlow(() => state);
  state.flushCurrentFlow = () => manager.flushCurrentFlow(() => state);
  const saveConfig = (
    patch,
    delayed = true,
    generation = state.draftSaveGeneration
  ) => manager.saveAdvancedConfig(() => state, patch, delayed, generation);
  return { state, canvas, manager, writes, saveConfig, set };
}
function saveVersion(h, snapshot, errors = []) {
  return callback(
    '../src/pages/workflow/components/btn-groups/index.tsx',
    'save',
    {
      currentFlow: h.state.currentFlow,
      name: 'version A',
      setSaving: noop,
      flushCurrentFlow: h.state.flushCurrentFlow,
      http: { post: snapshot },
      setOpen: noop,
      setName: noop,
      setVersionManagement: noop,
      message: { success: noop, error: value => errors.push(value) },
    }
  );
}
function restoreVersion(h, restore, errors = []) {
  return callback(
    '../src/components/workflow/drawer/version-management/index.tsx',
    'restore',
    {
      target: { id: 'version-A' },
      currentFlow: h.state.currentFlow,
      setRestoring: noop,
      setAdvancedConfiguration: noop,
      useFlowsManager: { getState: () => h.state, setState: h.set },
      setCanvasesDisabled: value => {
        h.state.canvasesDisabled = value;
      },
      flushCurrentFlow: h.state.flushCurrentFlow,
      restoreVersion: async params =>
        (await restore(params)) ?? h.state.currentFlow,
      adoptWorkflowDraft: flow => h.manager.adoptWorkflowDraft(flow, h.set),
      setHistoryVersionData: noop,
      setHistoryVersion: value => {
        h.state.historyVersion = value;
      },
      setTarget: noop,
      message: { error: value => errors.push(value) },
    }
  );
}

test('actual version callback waits for config and graph changes made during the barrier', async () => {
  const gate = deferred();
  const database = { config: 'old', graph: [] };
  let first = true;
  const h = harness(async patch => {
    if (patch.advancedConfig) {
      if (first) {
        first = false;
        await gate.promise;
      }
      database.config = patch.advancedConfig.prologue.prologueText;
    } else database.graph = patch.data.nodes.map(node => node.id);
  });
  h.saveConfig({ prologue: { prologueText: 'new' } });
  let snapshot;
  const saving = saveVersion(h, async () => {
    snapshot = structuredClone(database);
  })();
  await tick();
  assert.equal(snapshot, undefined);
  h.canvas.nodes = [{ id: 'late-node', data: {} }];
  h.saveConfig({ prologue: { prologueText: 'newest' } });
  gate.resolve();
  await saving;
  assert.deepEqual(snapshot, { config: 'newest', graph: ['late-node'] });
  assert.equal(h.manager.hasPendingFlowSave(), false);
});

test('restore drains a delayed config write before restoring and rejects stale generation edits', async () => {
  const gate = deferred();
  let database = 'old';
  let restored = false;
  const h = harness(async patch => {
    if (patch.advancedConfig) {
      await gate.promise;
      database = 'late edit';
    }
  });
  h.saveConfig({ prologue: { prologueText: 'late edit' } });
  const oldGeneration = h.state.draftSaveGeneration;
  const restoring = restoreVersion(h, async () => {
    restored = true;
    database = 'restored A';
  })();
  await tick();
  assert.equal(restored, false);
  gate.resolve();
  await restoring;
  h.saveConfig(
    { prologue: { prologueText: 'stale upload' } },
    false,
    oldGeneration
  );
  await h.state.flushCurrentFlow();
  assert.equal(database, 'restored A');
  assert.equal(h.writes.filter(p => p.advancedConfig).length, 1);
});

test('configuration failures block both snapshot and restore and remain retryable', async () => {
  for (const operation of ['version', 'restore']) {
    let fail = true;
    const h = harness(async patch => {
      if (patch.advancedConfig && fail) throw new Error('write failed');
    });
    h.saveConfig({ prologue: { prologueText: 'unsaved' } });
    const errors = [];
    let called = 0;
    const execute =
      operation === 'version'
        ? saveVersion(
            h,
            async () => {
              called += 1;
            },
            errors
          )
        : restoreVersion(
            h,
            async () => {
              called += 1;
            },
            errors
          );
    await execute();
    assert.equal(called, 0);
    assert.equal(errors.length, 1);
    fail = false;
    await execute();
    assert.equal(called, 1);
  }
});

test('historical graph and config cannot be written by debug/navigation flush', async () => {
  const h = harness();
  h.state.historyVersion = true;
  h.canvas.nodes = [{ id: 'historical-A', data: {} }];
  h.saveConfig({ prologue: { prologueText: 'snapshot A' } });
  await h.state.flushCurrentFlow();
  assert.deepEqual(h.writes, []);
});

function navigation(h, loggedIn = true) {
  const effects = [],
    errors = [];
  const flags = { proceeded: false, reset: false, loggedIn };
  let shouldBlock, hardLeave;
  const blocker = {
    state: 'blocked',
    location: { key: 'release' },
    proceed: () => {
      flags.proceeded = true;
    },
    reset: () => {
      flags.reset = true;
    },
  };
  const store = select => select(h.state);
  store.getState = () => h.state;
  const hook = load(
    '../src/components/workflow/hooks/use-workflow-save-navigation.ts',
    {
      react: {
        useEffect: effect => effects.push(effect),
        useRef: () => ({ current: undefined }),
      },
      'react-router-dom': {
        useBlocker: check => {
          shouldBlock = check;
          return blocker;
        },
        useBeforeUnload: check => {
          hardLeave = check;
        },
      },
      antd: { message: { error: value => errors.push(value) } },
      '@/store/user-store': {
        getState: () => ({ getIsLogin: () => flags.loggedIn }),
      },
      '../store/use-flows-manager': store,
      '../store/flow-manager-function': h.manager,
    }
  );
  hook.useWorkflowSaveNavigation();
  return { flags, effects, errors, shouldBlock, hardLeave };
}

test('publish navigation waits on the same actual queue; failures keep the current page', async () => {
  for (const fail of [false, true]) {
    const gate = deferred();
    const h = harness(async patch => {
      if (patch.advancedConfig) await gate.promise;
    });
    h.saveConfig({ prologue: { prologueText: 'new' } });
    const nav = navigation(h);
    nav.effects[0]();
    await tick();
    assert.equal(nav.flags.proceeded, false);
    if (fail) gate.reject(new Error('offline'));
    else gate.resolve();
    await tick();
    await tick();
    assert.equal(nav.flags.proceeded, !fail);
    assert.equal(nav.flags.reset, fail);
    assert.equal(nav.errors.length, Number(fail));
    h.manager.resetCurrentFlowSave();
  }
});

test('logout and authentication redirects bypass unsaved-page guards', () => {
  const h = harness();
  h.saveConfig({ prologue: { prologueText: 'pending' } });
  const nav = navigation(h, false);
  assert.equal(
    nav.shouldBlock({
      currentLocation: { pathname: '/work_flow/42' },
      nextLocation: { pathname: '/login' },
    }),
    false
  );
  nav.hardLeave({ preventDefault: assert.fail });
  h.manager.resetCurrentFlowSave();
});

test('version execution views keep media and advanced configuration paired without mutating the draft', () => {
  const a = {
    flowConfig: { vcn: 'voice-A', sceneId: 'same-scene' },
    advancedConfig: {
      textToSpeech: { vcn_cn: 'voice-A' },
      prologue: { enabled: true, prologueText: 'welcome-A' },
    },
  };
  const draft = {
    id: '42',
    flowConfig: '{"vcn":"voice-B"}',
    advancedConfig: '{"prologue":{"prologueText":"welcome-B"}}',
  };
  const before = structuredClone(draft);
  for (const version of [
    a,
    {
      flowConfig: '{"vcn":"voice-C"}',
      advancedConfig: '{"prologue":{"prologueText":"welcome-C"}}',
    },
    a,
  ]) {
    const view = workflowExecutionView(draft, true, version);
    const config =
      typeof version.advancedConfig === 'string'
        ? JSON.parse(version.advancedConfig)
        : version.advancedConfig;
    assert.deepEqual(JSON.parse(view.advancedConfig), config);
    assert.equal(
      JSON.parse(view.flowConfig).vcn,
      typeof version.flowConfig === 'string'
        ? JSON.parse(version.flowConfig).vcn
        : version.flowConfig.vcn
    );
  }
  assert.deepEqual(draft, before);
  assert.equal(workflowExecutionView(draft, false, a), draft);
  assert.equal(workflowExecutionView(draft, true, {}).advancedConfig, '{}');
});

test('actual history selection flushes the draft before showing read-only nodes', async () => {
  const gate = deferred();
  const h = harness(async patch => {
    if (patch.advancedConfig) await gate.promise;
  });
  h.saveConfig({ prologue: { prologueText: 'draft-B' } });
  const select = callback(
    '../src/components/workflow/drawer/version-management/index.tsx',
    'select',
    {
      flushCurrentFlow: h.state.flushCurrentFlow,
      useFlowsManager: { getState: () => h.state, setState: h.set },
      useFlowStore: {
        getState: () => ({
          setNodes: nodes => {
            h.canvas.nodes = nodes;
            h.manager.autoSaveCurrentFlow(() => h.state);
          },
          setEdges: edges => {
            h.canvas.edges = edges;
          },
        }),
      },
      setHistoryVersionData: value => {
        h.state.historyVersionData = value;
      },
      setHistoryVersion: value => {
        h.state.historyVersion = value;
      },
      setCanvasesDisabled: value => {
        h.state.canvasesDisabled = value;
      },
      setAdvancedConfiguration: noop,
      message: { error: assert.fail },
    }
  );
  const selected = select({
    id: 'A',
    data: '{"nodes":[{"id":"node-start::A","data":{}}],"edges":[]}',
  });
  await tick();
  assert.equal(h.state.historyVersion, false);
  gate.resolve();
  assert.equal(await selected, true);
  await h.state.flushCurrentFlow();
  assert.equal(h.state.historyVersion, true);
  assert.equal(
    h.writes.some(p => p.data?.nodes.some(n => n.id === 'node-start::A')),
    false
  );
  h.manager.resetCurrentFlowSave();
});

test('actual chat rendering and virtual prologue use version A and then B without draft leakage', () => {
  const make = name => ({
    flowConfig: JSON.stringify({
      interactType: 2,
      sceneEnable: 1,
      sceneId: 'same-avatar',
      vcn: `voice-${name}`,
    }),
    advancedConfig: {
      prologue: { enabled: true, prologueText: `welcome-${name}` },
      textToSpeech: { vcn_cn: `voice-${name}` },
    },
  });
  const a = make('A'),
    b = make('B');
  const draft = {
    id: '42',
    ...b,
    advancedConfig: JSON.stringify(b.advancedConfig),
  };
  const state = {
    currentFlow: draft,
    historyVersion: true,
    historyVersionData: a,
  };
  const useView = load(
    '../src/components/workflow/hooks/use-workflow-execution-view.ts',
    {
      react: { useMemo: fn => fn() },
      '../store/use-flows-manager': select => select(state),
      '../store/workflow-execution-view': { workflowExecutionView },
    }
  ).useWorkflowExecutionView;
  const sdkAvatarInfo = { avatar_id: 'same-avatar' },
    sdkTTSInfo = {};
  const spoken = [],
    timers = new Map();
  let timerId = 0;
  let previousCleanup;
  for (const version of [a, b, a]) {
    state.historyVersionData = version;
    const view = useView();
    const content = callback(
      '../src/components/workflow/drawer/chat-debugger/components/chat-content.tsx',
      'useChatContent',
      {
        useWorkflowExecutionView: useView,
        // A regression to the draft selector must fail the assertions below.
        useFlowsManager: select => select(state),
        useState: value => [value, noop],
        useMemo: fn => fn(),
        useMemoizedFn: fn => fn,
        isJSON: () => true,
      }
    )({ chatList: [], setChatList: noop });
    const expected = version.advancedConfig.prologue.prologueText;
    assert.equal(content.advancedConfig.prologue.prologueText, expected);
    assert.equal(
      content.advancedConfig.textToSpeech.vcn_cn,
      version.advancedConfig.textToSpeech.vcn_cn
    );
    previousCleanup?.();
    const effect = callback(
      '../src/components/workflow/drawer/chat-debugger/index.tsx',
      node =>
        ts.isCallExpression(node) &&
        node.expression.getText() === 'useEffect' &&
        node.arguments[0]?.getText().includes('sdkTTSInfo.vcn =')
          ? node.arguments[0]
          : undefined,
      {
        currentFlow: view,
        talkAgentConfig: JSON.parse(view.flowConfig),
        interactType: 2,
        handleChatTypeChange: noop,
        setCallStatus: noop,
        hasVirtualScene: true,
        open: true,
        sdkAvatarInfo,
        sdkTTSInfo,
        setVmsInteractiveRefStatus: noop,
        chatAnswer: '',
        vmsInteractionCmpRef: {
          current: {
            instance: {
              writeText: (text, options) =>
                spoken.push({ text, vcn: options.tts.vcn }),
            },
            dispose: noop,
            initAvatar: noop,
          },
        },
        setTimeout: fn => {
          timers.set(++timerId, fn);
          return timerId;
        },
        clearTimeout: id => timers.delete(id),
      }
    );
    previousCleanup = effect();
    const pending = timers.get(timerId);
    pending();
    assert.deepEqual(spoken.at(-1), {
      text: expected,
      vcn: JSON.parse(view.flowConfig).vcn,
    });
  }
  previousCleanup();
  assert.equal(timers.size, 0);
  assert.equal(draft.advancedConfig, JSON.stringify(b.advancedConfig));
});

test('direct metadata/media writes join version barriers and failures block the action', async () => {
  for (const fail of [false, true]) {
    const gate = deferred();
    const h = harness(async () => {}, waitForWorkflowSaves);
    const request = trackWorkflowSave('42', gate.promise);
    void request.catch(noop);
    let captured = false;
    const errors = [];
    const saving = saveVersion(
      h,
      async () => {
        captured = true;
      },
      errors
    )();
    await tick();
    assert.equal(captured, false);
    if (fail) gate.reject(new Error('media PUT failed'));
    else gate.resolve();
    await saving;
    assert.equal(captured, !fail);
    assert.equal(errors.length, Number(fail));
  }
});

test('an early direct-PUT failure is observed even while graph persistence is still waiting', async () => {
  const graph = deferred(),
    media = deferred();
  const h = harness(async patch => {
    if (patch.data) await graph.promise;
  }, waitForWorkflowSaves);
  void trackWorkflowSave('42', media.promise).catch(noop);
  let captured = false;
  const errors = [];
  const save = saveVersion(
    h,
    async () => {
      captured = true;
    },
    errors
  );
  const first = save();
  await tick();
  media.reject(new Error('media failed first'));
  await first;
  assert.equal(captured, false);
  assert.equal(errors.length, 1);
  graph.resolve();
  const retryRequest = deferred();
  void trackWorkflowSave('42', retryRequest.promise).catch(noop);
  const retry = save();
  await tick();
  assert.equal(captured, false);
  retryRequest.resolve();
  await retry;
  assert.equal(captured, true);
});

test('other-workflow writes and cancelled forms with no PUT do not block navigation', async () => {
  const other = deferred();
  void trackWorkflowSave('different-workflow', other.promise).catch(noop);
  const h = harness(async () => {}, waitForWorkflowSaves);
  const nav = navigation(h);
  nav.effects[0]();
  await tick();
  await tick();
  assert.equal(nav.flags.proceeded, true);
  assert.equal(nav.flags.reset, false);
  assert.deepEqual(nav.errors, []);
  other.resolve();
  await waitForWorkflowSaves('different-workflow');
});

test('successful restore uses its authoritative POST response even when every refresh GET would fail', async () => {
  const restored = {
    id: '42',
    flowId: 'flow-42',
    name: 'restored-A',
    data: '{"nodes":[{"id":"node-start::A","position":{"x":0,"y":0},"data":{"label":"A"}}],"edges":[]}',
    advancedConfig: { prologue: { prologueText: 'A' } },
    flowConfig: '{}',
  };
  let getCalls = 0,
    puts = 0,
    failGet = true;
  const get = async () => {
    getCalls += 1;
    if (failGet) throw new Error('catalog offline');
    return restored;
  };
  const h = harness(
    async () => {
      puts += 1;
    },
    async () => {},
    {
      getFlowDetailAPI: get,
      flowsNodeTemplate: async () => {
        if (failGet) throw new Error('catalog offline');
        return [];
      },
    }
  );
  h.manager.adoptWorkflowDraft(
    {
      ...restored,
      name: 'old-draft',
      data: '{"nodes":[{"id":"node-start::old","data":{}}],"edges":[]}',
    },
    h.set
  );
  const common = load('../src/services/common.ts', {
    '@/utils/http': { post: async () => restored },
    './workflow-response': {
      normalizeWorkflowResponse: flow => ({
        ...flow,
        advancedConfig: JSON.stringify(flow.advancedConfig),
      }),
    },
  });
  const errors = [];
  await restoreVersion(h, common.restoreVersion, errors)();
  assert.deepEqual(errors, []);
  assert.equal(getCalls, 0);
  assert.equal(h.state.currentFlow.name, 'restored-A');
  assert.equal(h.canvas.nodes[0].id, 'node-start::A');
  await h.state.flushCurrentFlow();
  assert.equal(puts, 0);
  // A later explicit reload may fail too; it must not resurrect the old graph.
  await assert.rejects(h.manager.initFlowData('42', h.set), /offline/);
  assert.equal(h.state.isLoading, false);
  assert.equal(h.state.canvasesDisabled, true);
  assert.equal(h.state.draftLoaded, false);
  assert.equal(h.state.currentFlow, undefined);
  assert.deepEqual(h.canvas.nodes, []);
  await h.state.flushCurrentFlow();
  assert.equal(puts, 0);
  const nav = navigation(h);
  assert.equal(
    nav.shouldBlock({
      currentLocation: { pathname: '/work_flow/42' },
      nextLocation: { pathname: '/space/workflows' },
    }),
    false
  );
  failGet = false;
  await h.manager.initFlowData('42', h.set);
  assert.equal(h.state.draftLoaded, true);
  assert.equal(h.state.canvasesDisabled, false);
  assert.equal(h.state.initializationError, '');
  assert.equal(h.canvas.nodes[0].id, 'node-start::A');
});

test('untouched readonly and UI-only canvas changes cause no PUT; real edits retain failed-save retry', async () => {
  let canWrite = false;
  const h = harness(async () => {
    if (!canWrite) throw new Error('403 read-only');
  });
  h.manager.adoptWorkflowDraft(
    {
      ...h.state.currentFlow,
      data: '{"nodes":[{"id":"node-start::A","position":{"x":10,"y":20},"data":{"label":"start","nodeParam":{"agentId":158}}}],"edges":[]}',
    },
    h.set
  );
  const node = h.canvas.nodes[0];
  Object.assign(node, {
    selected: true,
    width: 362,
    height: 82,
    dragging: false,
  });
  Object.assign(node.data, { status: 'running', updatable: false });
  node.data.nodeParam.instruction = { queryErrMsg: '' };
  h.manager.autoSaveCurrentFlow(() => h.state);
  await h.state.flushCurrentFlow();
  assert.deepEqual(h.writes, []);
  assert.equal(h.state.hasUnsavedCurrentFlow(), false);
  const nav = navigation(h);
  const transition = {
    currentLocation: { pathname: '/work_flow/42' },
    nextLocation: { pathname: '/space/workflows' },
  };
  assert.equal(nav.shouldBlock(transition), false);
  node.position.x = 40;
  assert.equal(h.state.hasUnsavedCurrentFlow(), true);
  assert.equal(nav.shouldBlock(transition), true);
  await assert.rejects(h.state.flushCurrentFlow(), /403/);
  assert.equal(h.state.hasUnsavedCurrentFlow(), true);
  canWrite = true;
  await h.state.flushCurrentFlow();
  assert.equal(h.writes.length, 2);
  assert.equal(h.state.hasUnsavedCurrentFlow(), false);
});

test('an incomplete initialization cannot save residual canvas nodes and can be left safely', async () => {
  const gate = deferred();
  const h = harness(
    async () => assert.fail('no PUT while loading'),
    async () => {},
    { getFlowDetailAPI: () => gate.promise }
  );
  const loading = h.manager.initFlowData('new-flow', h.set);
  h.canvas.nodes = [{ id: 'old::residual', data: {} }];
  h.manager.autoSaveCurrentFlow(() => h.state);
  await h.state.flushCurrentFlow();
  assert.equal(h.state.hasUnsavedCurrentFlow(), false);
  assert.deepEqual(h.writes, []);
  const nav = navigation(h);
  assert.equal(
    nav.shouldBlock({
      currentLocation: { pathname: '/work_flow/new-flow' },
      nextLocation: { pathname: '/space/workflows' },
    }),
    false
  );
  gate.reject(new Error('load failed'));
  await assert.rejects(loading, /load failed/);
  assert.equal(h.state.isLoading, false);
  assert.equal(h.state.canvasesDisabled, true);
  assert.equal(h.state.draftLoaded, false);
});

test('a load completing after editor reset cannot reinstall its old canvas', async () => {
  const gate = deferred();
  const h = harness(
    async () => assert.fail('stale load must never save'),
    async () => {},
    { getFlowDetailAPI: () => gate.promise }
  );
  const loading = h.manager.initFlowData('42', h.set);
  h.manager.resetCurrentFlowSave();
  h.set({ currentFlow: undefined, draftLoaded: false, isLoading: false });
  gate.resolve({
    id: '42',
    flowId: 'flow-42',
    data: '{"nodes":[{"id":"old::late","data":{}}],"edges":[]}',
  });
  await loading;
  assert.equal(h.state.currentFlow, undefined);
  assert.deepEqual(h.canvas.nodes, []);
  assert.equal(h.state.draftLoaded, false);
});

test('actual default-value callback persists arbitrary business JSON before creating a version', async () => {
  const defaults = [
    { data: { status: 'new' } },
    { nodes: [{ selected: true, type: 'new', data: { updatable: true } }] },
    { edges: [{ style: 'new', markerEnd: 'new' }] },
    { customerErrMsg: 'new', nameErrMsg: 'new', queryErrMsg: 'new' },
    { nodeParam: { instruction: {} } },
  ];
  for (const nextDefault of defaults) {
    let database;
    const h = harness(async patch => {
      database = structuredClone(patch.data);
    });
    // Keep the object shape identical so only a formerly excluded value changes.
    const oldDefault = JSON.parse(
      JSON.stringify(nextDefault)
        .replaceAll('"new"', '"old"')
        .replaceAll('true', 'false')
        .replace('"instruction":{}', '"instruction":{"queryErrMsg":"old"}')
    );
    database = {
      nodes: [
        {
          id: 'node-start::A',
          data: {
            nodeParam: {},
            outputs: [
              {
                id: 'result',
                name: 'result',
                schema: { type: 'object', default: oldDefault },
              },
            ],
          },
        },
      ],
      edges: [],
    };
    h.manager.adoptWorkflowDraft(
      { ...h.state.currentFlow, data: JSON.stringify(database) },
      h.set
    );
    const handleOk = callback(
      '../src/components/workflow/modal/set-default-value/index.tsx',
      'handleOk',
      {
        useMemoizedFn: fn => fn,
        defaultValueModalInfo: { nodeId: 'node-start::A', paramsId: 'result' },
        value: JSON.stringify(nextDefault),
        setNode: (id, update) => {
          h.canvas.nodes = h.canvas.nodes.map(node =>
            node.id === id ? update(node) : node
          );
        },
        cloneDeep: structuredClone,
        setDefaultValueModalInfo: noop,
      }
    );
    handleOk();
    assert.equal(
      h.state.hasUnsavedCurrentFlow(),
      true,
      JSON.stringify(nextDefault)
    );
    let versionDefault;
    await saveVersion(h, async () => {
      versionDefault = structuredClone(
        database.nodes[0].data.outputs[0].schema.default
      );
    })();
    assert.equal(h.writes.length, 1);
    assert.deepEqual(versionDefault, nextDefault);
    assert.deepEqual(
      h.writes[0].data.nodes[0].data.outputs[0].schema.default,
      nextDefault
    );
    assert.equal(h.state.hasUnsavedCurrentFlow(), false);
  }
});

test('literal values and schema property maps retain UI-like and ErrMsg business keys', async () => {
  const h = harness();
  h.manager.adoptWorkflowDraft(
    {
      ...h.state.currentFlow,
      data: JSON.stringify({
        nodes: [
          {
            id: 'node-start::A',
            data: {
              nodeParam: { customErrMsg: 'old' },
              inputs: [
                {
                  id: 'input',
                  name: 'input',
                  schema: {
                    type: 'object',
                    value: {
                      type: 'literal',
                      content: {
                        data: { status: 'old' },
                        nodes: [{ selected: false }],
                        contentErrMsg: 'old',
                      },
                    },
                  },
                },
              ],
              outputs: [
                {
                  id: 'output',
                  name: 'output',
                  schema: {
                    type: 'object',
                    properties: {
                      nameErrMsg: { type: 'string', default: 'old' },
                      data: { status: { type: 'string', default: 'old' } },
                      nodes: { selected: { type: 'boolean', default: false } },
                    },
                  },
                },
              ],
            },
          },
        ],
        edges: [],
      }),
    },
    h.set
  );
  const node = h.canvas.nodes[0];
  const content = node.data.inputs[0].schema.value.content;
  const properties = node.data.outputs[0].schema.properties;
  const edits = [
    () => {
      content.data.status = 'new';
    },
    () => {
      content.nodes[0].selected = true;
    },
    () => {
      content.contentErrMsg = 'new';
    },
    () => {
      properties.nameErrMsg.default = 'new';
    },
    () => {
      properties.data.status.default = 'new';
    },
    () => {
      properties.nodes.selected.default = true;
    },
    () => {
      node.data.nodeParam.customErrMsg = 'new';
    },
  ];
  for (const edit of edits) {
    edit();
    assert.equal(h.state.hasUnsavedCurrentFlow(), true);
    await h.state.flushCurrentFlow();
    assert.equal(h.state.hasUnsavedCurrentFlow(), false);
    assert.deepEqual(
      h.writes.at(-1).data.nodes[0].data.inputs,
      node.data.inputs
    );
    assert.deepEqual(
      h.writes.at(-1).data.nodes[0].data.outputs,
      node.data.outputs
    );
  }
  assert.equal(h.writes.length, edits.length);
});

test('actual input, nested output and node validation decorations do not dirty the draft', async () => {
  const utilities = load('../src/components/workflow/utils/reactflowUtils.ts', {
    '@/utils': { isJSON: () => true },
    i18next: { t: key => key },
    './variable-aggregation': { validateVariableAggregationNode: () => true },
  });
  const h = harness();
  h.manager.adoptWorkflowDraft(
    {
      ...h.state.currentFlow,
      data: JSON.stringify({
        nodes: [
          {
            id: 'agent::A',
            data: {
              nodeParam: { agentId: 158 },
              inputs: [
                {
                  id: 'input',
                  name: 'query',
                  schema: {
                    type: 'string',
                    value: { type: 'literal', content: 'hello' },
                  },
                },
              ],
              outputs: [
                {
                  id: 'output',
                  name: 'result',
                  schema: {
                    type: 'object',
                    properties: [
                      {
                        id: 'child',
                        name: 'data',
                        type: 'object',
                        properties: [
                          { id: 'leaf', name: 'status', type: 'string' },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        edges: [{ id: 'edge', source: 'agent::A', target: 'end::A' }],
      }),
    },
    h.set
  );
  const node = h.canvas.nodes[0];
  assert.equal(utilities.checkedNodeInputData(node.data.inputs, node), true);
  assert.equal(utilities.checkedNodeOutputData(node.data.outputs, node), true);
  assert.equal(utilities.checkedNodeParams(node), true);
  assert.equal(node.data.inputs[0].schema.value.contentErrMsg, '');
  assert.equal(
    node.data.outputs[0].schema.properties[0].properties[0].nameErrMsg,
    ''
  );
  assert.equal(node.data.nodeParam.instruction.queryErrMsg, '');
  node.selected = true;
  node.data.status = 'running';
  h.canvas.edges[0].selected = true;
  h.canvas.edges[0].style = { stroke: 'red' };
  assert.equal(h.state.hasUnsavedCurrentFlow(), false);
  await h.state.flushCurrentFlow();
  assert.deepEqual(h.writes, []);
});
