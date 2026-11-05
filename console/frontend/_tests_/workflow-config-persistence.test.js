import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { createSaveCoordinator } from '../src/components/workflow/store/workflow-save-coordinator.ts';
import { normalizeWorkflowResponse } from '../src/services/workflow-response.ts';
import { workflowExecutionView } from '../src/components/workflow/store/workflow-execution-view.ts';
import { avatarHarness, tick } from './helpers/avatar-lifecycle-harness.js';
import { readConfigObject } from '../src/components/workflow/drawer/chat-debugger/chat-state.ts';

const source = readFileSync(
  new URL(
    '../src/components/workflow/store/advanced-config-persistence.ts',
    import.meta.url
  ),
  'utf8'
);
const module = { exports: {} };
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
)(() => ({ createSaveCoordinator }), module, module.exports);
const { createAdvancedConfigPersistence } = module.exports;

test('workflow API objects and legacy strings both reach the canvas without losing settings', () => {
  const config = {
    textToSpeech: { vcn_cn: 'saved-voice' },
    prologue: { prologueText: 'welcome' },
  };
  for (const advancedConfig of [config, JSON.stringify(config)]) {
    const original = {
      id: 42,
      advancedConfig,
      ext: { botId: '9007199254740993' },
      avatarColor: '#123456',
    };
    const result = normalizeWorkflowResponse(original);
    assert.deepEqual(JSON.parse(result.advancedConfig), config);
    assert.equal(result.color, '#123456');
    assert.deepEqual(JSON.parse(result.ext), { botId: '9007199254740993' });
    assert.equal(original.advancedConfig, advancedConfig);
  }
  assert.equal(normalizeWorkflowResponse({}).advancedConfig, '{}');
});

test('debounced independent fields and nested arrays/null survive one flush', async () => {
  const writes = [];
  const saver = createAdvancedConfigPersistence(
    async patch => writes.push(structuredClone(patch)),
    assert.fail
  );
  saver.update({ textToSpeech: { vcn_cn: 'voice', enabled: true } }, true);
  saver.update(
    { prologue: { prologueText: 'welcome', inputExample: ['one', 'two'] } },
    true
  );
  saver.update({ prologue: { inputExample: ['replacement'] } }, true);
  saver.update(
    { prologue: { prologueText: '' }, chatBackground: { info: null } },
    true
  );
  await saver.flush();
  assert.deepEqual(writes, [
    {
      textToSpeech: { vcn_cn: 'voice', enabled: true },
      prologue: { prologueText: '', inputExample: ['replacement'] },
      chatBackground: { info: null },
    },
  ]);
});

test('edits during an in-flight save are serialized and all settle before flush', async () => {
  let finish;
  const gate = new Promise(resolve => {
    finish = resolve;
  });
  const writes = [];
  const saver = createAdvancedConfigPersistence(async patch => {
    writes.push(structuredClone(patch));
    if (writes.length === 1) await gate;
  }, assert.fail);
  saver.update({ prologue: { prologueText: 'first' } });
  saver.update({ textToSpeech: { vcn_cn: 'voice' } });
  saver.update({ prologue: { prologueText: 'latest' } }, true);
  assert.equal(writes.length, 1);
  finish();
  await saver.flush();
  assert.deepEqual(writes.at(-1), {
    prologue: { prologueText: 'latest' },
    textToSpeech: { vcn_cn: 'voice' },
  });
});

test('failed immediate writes remain observable and pending for an explicit retry', async () => {
  const failure = new Error('network failure');
  const errors = [];
  let fail = true;
  const writes = [];
  const saver = createAdvancedConfigPersistence(
    async patch => {
      if (fail) throw failure;
      writes.push(patch);
    },
    error => errors.push(error)
  );
  saver.update({ prologue: { prologueText: 'unsaved' } });
  await assert.rejects(saver.flush(), /network failure/);
  await Promise.resolve();
  assert.equal(errors[0], failure);
  fail = false;
  await saver.flush();
  assert.equal(writes[0].prologue.prologueText, 'unsaved');
});

test('confirmed fields are not resent by a later unrelated edit', async () => {
  const writes = [];
  const saver = createAdvancedConfigPersistence(
    async patch => writes.push(structuredClone(patch)),
    assert.fail
  );
  saver.update({ textToSpeech: { vcn_cn: 'first-voice' } }, true);
  await saver.flush();
  // Another editor can now change the voice without this editor restoring it.
  saver.update({ prologue: { prologueText: 'welcome' } }, true);
  await saver.flush();
  assert.deepEqual(writes, [
    { textToSpeech: { vcn_cn: 'first-voice' } },
    { prologue: { prologueText: 'welcome' } },
  ]);
});

function productionFunction(path, select, scope) {
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
    expression ??= select(node, tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(expression, 'production callback exists');
  const compiled = ts.transpileModule(
    `export const actual = ${expression.getText(tree)};`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }
  ).outputText;
  const exports = {};
  new Function(...Object.keys(scope), 'exports', compiled)(
    ...Object.values(scope),
    exports
  );
  return exports.actual;
}

function mediaSaveHandler(scope) {
  return productionFunction(
    '../src/pages/workflow/components/flow-header/index.tsx',
    node =>
      ts.isVariableDeclaration(node) &&
      node.name.getText() === 'handleEditSumbit'
        ? node.initializer
        : undefined,
    scope
  );
}

test('media editor saves the selected voice with flowConfig and displays only the server result', async () => {
  let current = { id: 42, flowId: 'retained-flow', data: 'unsaved graph' };
  let modal = 'virtual';
  let payload;
  const returned = normalizeWorkflowResponse({
    id: 42,
    name: 'server-name',
    flowConfig: '{"vcn":"confirmed"}',
    advancedConfig: {
      textToSpeech: { vcn_cn: 'confirmed' },
      prologue: { prologueText: 'kept' },
    },
  });
  const save = mediaSaveHandler({
    currentFlow: current,
    saveFlowAPI: async patch => {
      payload = patch;
      return returned;
    },
    setModalType: value => {
      modal = value;
    },
    setCurrentFlow: update => {
      current = update(current);
    },
    shouldShowRequestError: () => true,
    message: { error: assert.fail },
  });
  await save({
    name: 'client-name',
    botDesc: 'description',
    avatar: null,
    talkAgentConfig: { vcn: 'selected', sceneId: 'scene' },
  });
  assert.deepEqual(payload.advancedConfig, {
    textToSpeech: { vcn_cn: 'selected' },
  });
  assert.deepEqual(payload.flowConfig, { vcn: 'selected', sceneId: 'scene' });
  assert.equal(current.name, 'server-name');
  assert.equal(
    JSON.parse(current.advancedConfig).textToSpeech.vcn_cn,
    'confirmed'
  );
  assert.equal(
    JSON.parse(current.advancedConfig).prologue.prologueText,
    'kept'
  );
  assert.equal(current.data, 'unsaved graph');
  assert.equal(modal, '');
});

test('media save errors keep the editor and prior voice intact', async () => {
  const current = {
    id: 42,
    advancedConfig: '{"textToSpeech":{"vcn_cn":"retained"}}',
  };
  const errors = [];
  const save = mediaSaveHandler({
    currentFlow: current,
    saveFlowAPI: async () => {
      throw new Error('connection lost');
    },
    setModalType: assert.fail,
    setCurrentFlow: assert.fail,
    shouldShowRequestError: () => true,
    message: { error: error => errors.push(error) },
  });
  await assert.rejects(
    save({ talkAgentConfig: { vcn: 'unsaved' } }),
    /connection lost/
  );
  assert.deepEqual(errors, []);
  assert.equal(
    JSON.parse(current.advancedConfig).textToSpeech.vcn_cn,
    'retained'
  );
});

test('late voice catalog loading preserves the saved selection instead of resetting it', async () => {
  let selected = 'retained-voice';
  const load = productionFunction(
    '../src/components/virtual-config-modal/index.tsx',
    node =>
      ts.isCallExpression(node) &&
      node.expression.getText() === 'useEffect' &&
      node.arguments[0]?.getText().includes('getVcnList()')
        ? node.arguments[0]
        : undefined,
    {
      getVcnList: async () => [{ voiceType: 'catalog-default' }],
      setOfficialVcnList: () => {},
      setSelectedVoice: update => {
        selected = typeof update === 'function' ? update(selected) : update;
      },
      getAvatarList: () => {},
      getBotTypeList: () => {},
      avatarIcon: [{}],
      getAvatarConfig: () => {},
    }
  );
  load();
  await Promise.resolve();
  assert.equal(selected, 'retained-voice');
  selected = '';
  load();
  await Promise.resolve();
  assert.equal(selected, 'catalog-default');
});

test('basic metadata editing omits unchanged legacy empty avatar fields and sends an explicit color change', async () => {
  const current = {
    id: 42,
    flowId: 'flow',
    name: 'name',
    description: 'description',
    color: '',
    avatarIcon: null,
  };
  const edited = { ...current, name: 'renamed' };
  const writes = [];
  const save = productionFunction(
    '../src/components/workflow/modal/flow-edit/index.tsx',
    node =>
      ts.isVariableDeclaration(node) && node.name.getText() === 'handleOk'
        ? node.initializer.arguments[0]
        : undefined,
    {
      currentFlow: current,
      tempFlow: edited,
      setLoading: () => {},
      saveFlowAPI: async patch => {
        writes.push(patch);
        return { ...current, ...patch };
      },
      setModalType: () => {},
      setCurrentFlow: () => {},
      shouldShowRequestError: () => true,
      message: { error: assert.fail },
    }
  );
  save();
  await Promise.resolve();
  assert.equal(writes[0].avatarIcon, undefined);
  assert.equal(writes[0].avatarColor, undefined);
  assert.equal(writes[0].name, 'renamed');
  edited.color = '#abcdef';
  save();
  await Promise.resolve();
  assert.equal(writes[1].avatarColor, '#abcdef');
  assert.equal('color' in writes[1], false);
});

const noop = () => {};
function virtualSubmitHandler(onSubmit, extra = {}) {
  const view = { pending: false, error: '', cancelled: false };
  const submitPending = { current: false };
  const scope = {
    onSubmit,
    submitPending,
    setSubmitting: value => {
      view.pending = value;
    },
    setSubmitError: value => {
      view.error = value;
    },
    form: { getFieldValue: () => 2 },
    formValues: undefined,
    selectedVoice: 'retained-voice',
    enableVoice: true,
    selectedAvatar: 'retained-avatar',
    enableAvatar: true,
    callSceneId: 'retained-call-avatar',
    sceneMode: 0,
    sceneVcn: 'scene-voice',
    t: key => key,
    message: { error: assert.fail },
    ...extra,
  };
  const handleSubmit = productionFunction(
    '../src/components/virtual-config-modal/index.tsx',
    node =>
      ts.isVariableDeclaration(node) && node.name.getText() === 'handleSubmit'
        ? node.initializer
        : undefined,
    scope
  );
  const handleCancel = productionFunction(
    '../src/components/virtual-config-modal/index.tsx',
    node =>
      ts.isVariableDeclaration(node) && node.name.getText() === 'handleCancel'
        ? node.initializer
        : undefined,
    {
      submitPending,
      onCancel: () => {
        view.cancelled = true;
      },
    }
  );
  return { view, handleSubmit, handleCancel };
}
function workflowListUI(createTalkAgent) {
  const states = [],
    routes = [];
  let cursor = 0;
  const dependencies = {
    react: {
      useEffect: noop,
      useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          value => {
            states[index] =
              typeof value === 'function' ? value(states[index]) : value;
          },
        ];
      },
    },
    'react-router-dom': {
      Link: 'Link',
      useNavigate: () => path => routes.push(path),
    },
    antd: {
      Button: 'Button',
      Input: { Search: 'Search', TextArea: 'TextArea' },
      Modal: 'Modal',
      Pagination: 'Pagination',
      message: {},
    },
    '@/utils/http': {},
    '@/services/flow': {},
    '@/components/virtual-config-modal': {
      default: 'VirtualConfig',
      __esModule: true,
    },
    '@/services/spark-common': { createTalkAgent },
    '@/components/workflow/utils': {},
    '@/pages/agents/style.css': {},
  };
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(
    readFileSync(
      new URL('../src/pages/workflow/list.tsx', import.meta.url),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const exports = {};
  new Function('require', 'exports', code)(
    name => (name in dependencies ? dependencies[name] : require(name)),
    exports
  );
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return undefined;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  return {
    routes,
    render() {
      cursor = 0;
      return exports.default();
    },
    find,
  };
}
const mediaFields = {
  name: ' avatar ',
  botDesc: ' description ',
  botType: 1,
  avatar: 'icon',
};

test('live workflow list opens media creation and actual submit navigates only after one successful request', async () => {
  let resolve;
  const pending = new Promise(done => {
    resolve = done;
  });
  const payloads = [];
  const ui = workflowListUI(async payload => {
    payloads.push(payload);
    return pending;
  });
  let tree = ui.render();
  assert.equal(
    ui.find(tree, node => node.type === 'VirtualConfig'),
    undefined
  );
  const button = ui.find(
    tree,
    node =>
      node.type === 'Button' && node.props.children === '新建语音 / 虚拟人'
  );
  assert.ok(button, 'entry is present in the active list');
  button.props.onClick();
  tree = ui.render();
  const modal = ui.find(tree, node => node.type === 'VirtualConfig');
  const { view, handleSubmit, handleCancel } = virtualSubmitHandler(
    modal.props.onSubmit
  );
  const saving = handleSubmit(mediaFields);
  await handleSubmit(mediaFields);
  handleCancel();
  assert.equal(payloads.length, 1);
  assert.equal(view.pending, true);
  assert.equal(view.cancelled, false);
  assert.deepEqual(ui.routes, []);
  assert.deepEqual(payloads[0].talkAgentConfig, {
    interactType: 2,
    vcn: 'retained-voice',
    vcnEnable: 1,
    sceneId: 'retained-avatar',
    callSceneId: 'retained-call-avatar',
    sceneMode: 0,
    sceneEnable: 1,
    sceneVcn: 'scene-voice',
    isDelete: 0,
  });
  assert.equal(payloads[0].name, 'avatar');
  resolve({ maasId: 202180, botId: 180 });
  await saving;
  assert.equal(view.pending, false);
  assert.equal(view.error, '');
  assert.deepEqual(ui.routes, ['/work_flow/202180/arrange?botId=180']);
  assert.equal(
    ui.find(ui.render(), node => node.type === 'VirtualConfig'),
    undefined
  );
});

test('media creation errors remain in the open form and permit an explicit successful retry', async () => {
  let fail = true;
  const ui = workflowListUI(async () => {
    if (fail) throw new Error('Creation denied');
    return { maasId: 202181, botId: 181 };
  });
  ui.find(
    ui.render(),
    node =>
      node.type === 'Button' && node.props.children === '新建语音 / 虚拟人'
  ).props.onClick();
  const modal = ui.find(ui.render(), node => node.type === 'VirtualConfig');
  const { view, handleSubmit } = virtualSubmitHandler(modal.props.onSubmit);
  await handleSubmit(mediaFields);
  assert.equal(view.error, 'Creation denied');
  assert.equal(view.pending, false);
  assert.deepEqual(ui.routes, []);
  assert.ok(ui.find(ui.render(), node => node.type === 'VirtualConfig'));
  fail = false;
  await handleSubmit(mediaFields);
  assert.equal(view.error, '');
  assert.deepEqual(ui.routes, ['/work_flow/202181/arrange?botId=181']);
});

test('media edit failures propagate to the same persistent form error without changing prior settings', async () => {
  const current = {
    id: 42,
    flowId: 'existing-flow',
    flowConfig: '{"vcn":"retained-voice"}',
  };
  const save = mediaSaveHandler({
    currentFlow: current,
    saveFlowAPI: async () => {
      throw new Error('Edit denied');
    },
    setModalType: assert.fail,
    setCurrentFlow: assert.fail,
  });
  const { view, handleSubmit } = virtualSubmitHandler(save);
  await handleSubmit(mediaFields);
  assert.equal(view.error, 'Edit denied');
  assert.equal(view.pending, false);
  assert.equal(current.flowConfig, '{"vcn":"retained-voice"}');
});

test('refreshed media settings and late avatar catalog retain the persisted scene and scene voice', async () => {
  const flowConfig = {
    sceneId: 'saved-avatar',
    sceneVcn: 'saved-scene-voice',
    vcn: 'saved-voice',
    sceneMode: 0,
    sceneEnable: 1,
    vcnEnable: 1,
    callSceneId: 'saved-call',
    interactType: 2,
  };
  const formValues = productionFunction(
    '../src/pages/workflow/components/flow-header/index.tsx',
    node =>
      ts.isJsxAttribute(node) && node.name.getText() === 'formValues'
        ? node.initializer.expression
        : undefined,
    {
      currentFlow: {
        flowId: 'flow',
        name: 'saved',
        category: 1,
        avatarIcon: 'icon',
        description: 'description',
      },
      flowConfig,
    }
  );
  assert.deepEqual(formValues.talkAgentConfig, flowConfig);
  let avatar = formValues.talkAgentConfig.sceneId;
  let voice = formValues.talkAgentConfig.sceneVcn;
  const load = productionFunction(
    '../src/components/virtual-config-modal/index.tsx',
    node =>
      ts.isVariableDeclaration(node) && node.name.getText() === 'getAvatarList'
        ? node.initializer
        : undefined,
    {
      getSceneList: async () => [
        { sceneId: 'catalog-first', defaultVCN: 'catalog-voice' },
      ],
      setAvatarList: noop,
      setSelectedAvatar: update => {
        avatar = typeof update === 'function' ? update(avatar) : update;
      },
      setSceneVcn: update => {
        voice = typeof update === 'function' ? update(voice) : update;
      },
      message: { info: assert.fail },
      t: key => key,
    }
  );
  await load();
  assert.equal(avatar, 'saved-avatar');
  assert.equal(voice, 'saved-scene-voice');
});

function avatarConsumer() {
  const sdk = avatarHarness();
  const errors = [];
  const sdkAvatarInfo = { avatar_id: '' },
    sdkTTSInfo = { vcn: '' };
  let pending, previousCleanup;
  const originalInit = sdk.handle.initAvatar;
  sdk.handle.initAvatar = options => {
    pending = originalInit(options);
    return pending;
  };
  return {
    parameters: sdk.parameters,
    errors,
    sdkAvatarInfo,
    async consume(currentFlow) {
      previousCleanup?.();
      pending = undefined;
      const talkAgentConfig = productionFunction(
        '../src/components/workflow/drawer/chat-debugger/index.tsx',
        node =>
          ts.isVariableDeclaration(node) &&
          node.name.getText() === 'talkAgentConfig'
            ? node.initializer
            : undefined,
        { useMemo: fn => fn(), readConfigObject, currentFlow }
      );
      const effect = productionFunction(
        '../src/components/workflow/drawer/chat-debugger/index.tsx',
        node =>
          ts.isCallExpression(node) &&
          node.expression.getText() === 'useEffect' &&
          node.arguments[0]?.getText().includes('sdkTTSInfo.vcn =')
            ? node.arguments[0]
            : undefined,
        {
          currentFlow,
          talkAgentConfig,
          chatType: 'vms',
          hasVirtualScene: talkAgentConfig.sceneEnable === 1,
          open: true,
          setVmsInteractiveRefStatus: sdk.state.setVmsInteractiveRefStatus,
          setAvatarError: value => {
            if (value) errors.push(value);
          },
          setLoadingVms: noop,
          readConfigObject,
          sdkAvatarInfo,
          sdkTTSInfo,
          chatAnswer: '',
          vmsInteractionCmpRef: { current: sdk.handle },
        }
      );
      previousCleanup = effect();
      await pending;
      await tick();
      return talkAgentConfig;
    },
  };
}

test('actual media edit, refreshed execution view and SDK consume the saved call avatar', async () => {
  let current = { id: 42, flowId: 'media-flow', type: 4, advancedConfig: '{}' };
  let stored;
  const save = mediaSaveHandler({
    currentFlow: current,
    saveFlowAPI: async patch => {
      stored = structuredClone(patch);
      return normalizeWorkflowResponse({
        ...current,
        ...patch,
        flowConfig: JSON.stringify(patch.flowConfig),
      });
    },
    setCurrentFlow: update => {
      current = update(current);
    },
    setModalType: noop,
  });
  const { view, handleSubmit } = virtualSubmitHandler(save, {
    sceneMode: 1,
    callSceneId: 'avatar_lfy',
    selectedAvatar: 'broadcast-retained',
  });
  await handleSubmit(mediaFields);
  assert.equal(view.error, '');
  assert.equal(stored.flowConfig.sceneMode, 1);
  assert.equal(stored.flowConfig.callSceneId, 'avatar_lfy');
  assert.equal(stored.flowConfig.sceneId, 'broadcast-retained');
  const refreshed = normalizeWorkflowResponse(
    JSON.parse(JSON.stringify(current))
  );
  const consumer = avatarConsumer();
  const selected = await consumer.consume(
    workflowExecutionView(refreshed, false, null)
  );
  assert.equal(selected.sceneMode, 1);
  assert.equal(selected.sceneId, 'broadcast-retained');
  assert.equal(selected.callSceneId, 'avatar_lfy');
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, 'avatar_lfy');
  assert.equal(consumer.parameters.at(-1).tts.vcn, 'retained-voice');
});

test('actual SDK switches broadcast/call frozen versions independently of the current draft', async () => {
  const media = (sceneMode, name) => ({
    interactType: 2,
    sceneEnable: 1,
    sceneMode,
    sceneId: `broadcast-${name}`,
    callSceneId: `call-${name}`,
    vcn: `voice-${name}`,
  });
  const versionA = { flowConfig: media(0, 'A'), advancedConfig: {} };
  const versionB = {
    flowConfig: JSON.stringify(media(1, 'B')),
    advancedConfig: '{}',
  };
  const draft = {
    id: 42,
    flowConfig: JSON.stringify(media(1, 'draft')),
    advancedConfig: '{}',
  };
  const original = JSON.stringify(draft);
  const consumer = avatarConsumer();
  for (const [version, expected] of [
    [versionA, 'broadcast-A'],
    [versionB, 'call-B'],
    [versionA, 'broadcast-A'],
  ]) {
    await consumer.consume(workflowExecutionView(draft, true, version));
    assert.equal(consumer.parameters.at(-1).avatar.avatar_id, expected);
  }
  assert.equal(consumer.parameters.length, 3);
  assert.deepEqual(
    consumer.parameters.map(p => p.tts.vcn),
    ['voice-A', 'voice-B', 'voice-A']
  );
  assert.equal(JSON.stringify(draft), original);
  // Retained string-valued mode also selects the call avatar.
  await consumer.consume({
    ...draft,
    flowConfig: JSON.stringify(media('1', 'legacy')),
  });
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, 'call-legacy');
});

test('a missing call avatar never starts or retains the other mode avatar', async () => {
  const consumer = avatarConsumer();
  const flow = {
    id: 42,
    advancedConfig: '{}',
    flowConfig: {
      interactType: 2,
      sceneEnable: 1,
      sceneMode: 0,
      sceneId: 'broadcast-only',
      vcn: 'voice',
    },
  };
  await consumer.consume({
    ...flow,
    flowConfig: JSON.stringify(flow.flowConfig),
  });
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, 'broadcast-only');
  await consumer.consume({
    ...flow,
    flowConfig: JSON.stringify({
      ...flow.flowConfig,
      sceneMode: 1,
      callSceneId: '',
    }),
  });
  assert.equal(consumer.parameters.length, 1);
  assert.equal(consumer.sdkAvatarInfo.avatar_id, '');
  assert.deepEqual(consumer.errors, [
    '所选模式未配置虚拟人形象，请先完成设置。',
  ]);
});
