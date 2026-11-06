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
      ts.isVariableDeclaration(node) && node.name.getText() === 'getVoiceList'
        ? node.initializer
        : undefined,
    {
      formValues: undefined,
      getVcnList: async () => [{ voiceType: 'catalog-default' }],
      setVoiceError: () => {},
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
      generationPending: { current: false },
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
      useRef: initial => ({ current: initial }),
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
      Alert: 'Alert',
      Dropdown: 'Dropdown',
      Empty: 'Empty',
      Image: 'Image',
      Spin: 'Spin',
      Button: 'Button',
      Input: Object.assign(() => null, {
        Search: 'Search',
        TextArea: 'TextArea',
      }),
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
    '@/store/space-store': { default: () => ({}), __esModule: true },
    '@/assets/imgs/workflow/flow-icon.png': 'workflow-icon',
    '@/pages/agents/catalog.module.scss': {},
    '@ant-design/icons': {
      EllipsisOutlined: 'EllipsisOutlined',
      PlusOutlined: 'PlusOutlined',
      UploadOutlined: 'UploadOutlined',
    },
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
      setAvatarError: noop,
      formValues,
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
    state: sdk.state,
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

test('legacy call avatar configuration survives editing and refresh without being sent to the SDK', async () => {
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
  assert.equal(consumer.parameters.length, 0);
  assert.equal(consumer.sdkAvatarInfo.avatar_id, '');
  assert.match(consumer.errors[0], /旧通话形象不支持/);
});

test('frozen supported avatars remain independent while legacy versions dispose the current SDK without fallback', async () => {
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
  await consumer.consume(workflowExecutionView(draft, true, versionA));
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, 'broadcast-A');
  await consumer.consume(workflowExecutionView(draft, true, versionB));
  assert.equal(consumer.parameters.length, 1);
  assert.equal(consumer.sdkAvatarInfo.avatar_id, '');
  assert.equal(consumer.state.vmsInteractiveRef, null);
  assert.match(consumer.errors.at(-1), /旧通话形象不支持/);
  await consumer.consume(workflowExecutionView(draft, true, versionA));
  assert.equal(consumer.parameters.length, 2);
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, 'broadcast-A');
  assert.equal(JSON.stringify(draft), original);
  await consumer.consume({
    ...draft,
    flowConfig: JSON.stringify(media('1', 'legacy')),
  });
  assert.equal(consumer.parameters.length, 2);
  assert.equal(consumer.sdkAvatarInfo.avatar_id, '');
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
    '旧通话形象不支持当前虚拟人播放，请在设置中选择目录形象。',
  ]);
});

// Compile the production service modules and intercept only the HTTP boundary.
// This catches retired routes and response-shape regressions hidden by service mocks.
function mediaServices(http) {
  const require = createRequire(import.meta.url);
  const load = file => {
    const source = readFileSync(
      new URL(`../src/services/${file}.ts`, import.meta.url),
      'utf8'
    );
    const module = { exports: {} };
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    new Function('require', 'module', 'exports', compiled)(
      name =>
        name === '../utils/http' || name === '@/utils/http'
          ? http
          : require(name),
      module,
      module.exports
    );
    return module.exports;
  };
  return {
    ...load('agent-square'),
    ...load('spark-common'),
    ...load('chat'),
    ...load('model'),
  };
}
function mediaCallback(name, scope, component = 'virtual-config-modal') {
  return productionFunction(
    `../src/components/${component}/index.tsx`,
    node =>
      ts.isVariableDeclaration(node) && node.name.getText() === name
        ? node.initializer
        : undefined,
    { formValues: undefined, ...scope }
  );
}

test('media category loader calls the live shared endpoint, maps its labels and excludes category 25', async () => {
  const requests = [];
  let fail = true,
    options,
    error,
    loading;
  const rows = [
    { typeKey: 1, typeName: '办公助手', typeNameEn: 'Office' },
    { typeKey: 25, typeName: '排除' },
  ];
  const services = mediaServices({
    get: async path => {
      requests.push(path);
      if (fail) throw new Error('offline');
      return rows;
    },
  });
  const load = mediaCallback('getBotTypeList', {
    getAgentType: services.getAgentType,
    setCategoriesLoading: value => {
      loading = value;
    },
    setCategoryError: value => {
      error = value;
    },
    setBotTypeList: value => {
      options = value;
    },
  });
  await load();
  assert.match(error, /分类加载失败/);
  assert.equal(loading, false);
  fail = false;
  await load();
  assert.deepEqual(
    requests,
    Array(2).fill('/home-page/agent-square/get-bot-type-list')
  );
  assert.deepEqual(options, [rows[0]]);
  assert.equal(error, '');
  const selectSource = readFileSync(
    new URL(
      '../src/components/virtual-config-modal/index.tsx',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(
    selectSource,
    /fieldNames=\{\{ label: 'typeName', value: 'typeKey' \}\}/
  );
  assert.match(selectSource, /optionFilterProp="typeName"/);
  assert.doesNotMatch(selectSource, /getBotType\(/);
});

test('media catalogs use their real HTTP routes, retain saved choices and expose failed loads with retry', async () => {
  for (const kind of ['avatar', 'voice', 'speaker']) {
    const requests = [];
    let fail = true,
      error,
      result,
      selected = 'saved',
      voice = 'saved-scene-voice',
      observed;
    const rows =
      kind === 'avatar'
        ? [{ sceneId: 'catalog-scene', defaultVCN: 'catalog-voice' }]
        : kind === 'voice'
          ? [{ voiceType: 'catalog-voice', name: '音色' }]
          : [{ id: 1, assetId: 'speaker', name: '我的音色' }];
    const http = {};
    for (const method of ['get', 'post'])
      http[method] = async path => {
        requests.push([method, path]);
        if (fail) throw new Error('offline');
        return rows;
      };
    const services = mediaServices(http);
    const setError = value => {
      error = value;
    };
    const setRows = value => {
      result = value;
    };
    const setSelected = update => {
      selected = update(selected);
    };
    const load =
      kind === 'avatar'
        ? mediaCallback('getAvatarList', {
            getSceneList: services.getSceneList,
            setAvatarError: setError,
            setAvatarList: setRows,
            setSelectedAvatar: setSelected,
            setSceneVcn: update => {
              voice = update(voice);
            },
            message: { info: assert.fail },
            t: key => key,
          })
        : kind === 'voice'
          ? mediaCallback('getVoiceList', {
              getVcnList: services.getVcnList,
              setVoiceError: setError,
              setOfficialVcnList: setRows,
              setSelectedVoice: setSelected,
            })
          : mediaCallback(
              'getMyVoicerList',
              {
                getMySpeakerList: services.getMySpeakerList,
                setSpeakerError: setError,
                setMySpeaker: setRows,
                onMySpeakerChange: value => {
                  observed = value;
                },
              },
              'speaker-modal'
            );
    await load();
    assert.match(error, /加载失败/);
    assert.equal(result, undefined);
    fail = false;
    await load();
    assert.equal(error, '');
    assert.deepEqual(result, rows);
    assert.equal(selected, 'saved');
    assert.equal(voice, 'saved-scene-voice');
    if (kind === 'speaker') assert.deepEqual(observed, rows);
    const expected =
      kind === 'avatar'
        ? ['post', '/talkAgent/getSceneList']
        : kind === 'voice'
          ? ['get', '/voice/get-pronunciation-person']
          : ['get', '/speaker/train/train-speaker'];
    assert.deepEqual(requests, [expected, expected]);
  }
});

test('description model selector consumes complete paginated models and offers only enabled records', async () => {
  const requests = [];
  let options,
    error,
    fail = true;
  const services = mediaServices({
    post: async (path, body) => {
      requests.push([path, body]);
      if (fail) return { records: [], total: 2, current: 1, size: 100 };
      return {
        records: [
          { id: 13, name: 'user model', enabled: true },
          { id: 14, name: 'disabled', enabled: false },
        ],
        total: 2,
        current: 1,
        size: 100,
      };
    },
  });
  const load = mediaCallback('getGenerationModels', {
    getAllModels: services.getAllModels,
    setGenerationModels: value => {
      options = value;
    },
    setModelError: value => {
      error = value;
    },
  });
  await load();
  assert.match(error, /模型加载失败/);
  fail = false;
  await load();
  assert.equal(error, '');
  assert.deepEqual(options, [{ id: 13, name: 'user model' }]);
  assert.deepEqual(
    requests,
    Array(2).fill([
      '/api/model/list',
      { type: 0, filter: 0, page: 1, pageSize: 100 },
    ])
  );
  const source = readFileSync(
    new URL(
      '../src/components/virtual-config-modal/index.tsx',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(source, /\[modelId, setModelId\] = useState<number>\(\)/);
});

function descriptionGenerator(post, overrides = {}) {
  const state = {
    error: '',
    loading: false,
    description: 'original description',
  };
  const scope = {
    generationPending: { current: false },
    submitPending: { current: false },
    modelId: 13,
    form: {
      getFieldValue: field =>
        field === 'name' ? '  Name from form  ' : state.description,
      setFieldValue: (field, value) => {
        assert.equal(field, 'botDesc');
        state.description = value;
      },
    },
    setGenerationError: value => {
      state.error = value;
    },
    setLoading: value => {
      state.loading = value;
    },
    aiGenPrologue: mediaServices({ post }).aiGenPrologue,
    ...overrides,
  };
  return { state, scope, generate: mediaCallback('aiGen', scope) };
}

test('AI description calls the real endpoint with explicit model and name, deduplicates and waits', async () => {
  const requests = [];
  let finish;
  const pending = new Promise(resolve => {
    finish = resolve;
  });
  const { state, generate, scope } = descriptionGenerator((path, body) => {
    requests.push([path, body]);
    return pending;
  });
  const request = generate();
  await generate();
  assert.deepEqual(requests, [
    ['/bot/ai-prologue-gen', { name: 'Name from form', modelId: 13 }],
  ]);
  assert.equal(state.loading, true);
  assert.equal(scope.generationPending.current, true);
  assert.equal(state.description, 'original description');
  finish('Generated description');
  await request;
  assert.equal(state.description, 'Generated description');
  assert.equal(state.error, '');
  assert.equal(state.loading, false);
  assert.equal(scope.generationPending.current, false);
});

test('AI description failure or empty reply preserves text and remains retryable', async () => {
  for (const response of [
    new Error('upstream failed'),
    '',
    { text: 'wrong shape' },
  ]) {
    let fail = true;
    const { state, generate } = descriptionGenerator(async () => {
      if (!fail) return 'retry success';
      if (response instanceof Error) throw response;
      return response;
    });
    await generate();
    assert.ok(state.error);
    assert.equal(state.loading, false);
    assert.equal(state.description, 'original description');
    fail = false;
    await generate();
    assert.equal(state.error, '');
    assert.equal(state.description, 'retry success');
  }
});

test('AI description requires a name and explicit model before sending any HTTP request', async () => {
  for (const overrides of [
    { modelId: undefined },
    { form: { getFieldValue: () => '  ' } },
  ]) {
    const { state, generate } = descriptionGenerator(assert.fail, overrides);
    await generate();
    assert.match(state.error, /请/);
    assert.equal(state.loading, false);
    assert.equal(state.description, 'original description');
  }
});

test('generated descriptions up to the backend limit save unchanged while longer input is rejected', async () => {
  const writes = [],
    errors = [];
  const { handleSubmit } = virtualSubmitHandler(
    async value => writes.push(value),
    {
      message: { error: value => errors.push(value) },
    }
  );
  const description = 'a'.repeat(255);
  await handleSubmit({
    name: 'English assistant',
    botType: 1,
    botDesc: description,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].botDesc, description);
  await handleSubmit({
    name: 'English assistant',
    botType: 1,
    botDesc: description + 'a',
  });
  assert.equal(writes.length, 1);
  assert.match(errors[0], /255/);
});

test('opening a legacy media configuration and loading catalogs preserves even empty saved fields', async () => {
  const config = {
    interactType: 2,
    sceneEnable: 1,
    vcnEnable: 1,
    sceneMode: 1,
    sceneId: '',
    callSceneId: 'avatar_wmy001',
    sceneVcn: '',
    vcn: '',
  };
  const formValues = {
    name: 'legacy',
    botDesc: 'description',
    botType: 1,
    avatar: '',
    talkAgentConfig: config,
  };
  const state = {};
  const setter = key => update => {
    state[key] = typeof update === 'function' ? update(state[key]) : update;
  };
  const scope = {
    formValues,
    form: { setFieldValue: noop },
    setAvatarUrl: noop,
    setAvatarLoaded: noop,
    setEnableAvatar: noop,
    setEnableVoice: noop,
    setBotCreateActiveV: noop,
    botCreateActiveV: {},
    setSelectedAvatar: setter('sceneId'),
    setCallSceneId: setter('callSceneId'),
    setSceneMode: setter('sceneMode'),
    setSelectedVoice: setter('vcn'),
    setSceneVcn: setter('sceneVcn'),
  };
  const hydrate = productionFunction(
    '../src/components/virtual-config-modal/index.tsx',
    node =>
      ts.isCallExpression(node) &&
      node.expression.getText() === 'useEffect' &&
      node.arguments[0]?.getText().includes("form.setFieldValue('name'")
        ? node.arguments[0]
        : undefined,
    scope
  );
  hydrate();
  const before = structuredClone(state);
  const services = mediaServices({
    post: async path => {
      assert.equal(path, '/talkAgent/getSceneList');
      return [{ sceneId: '118801001', defaultVCN: 'catalog-voice' }];
    },
    get: async path => {
      assert.equal(path, '/voice/get-pronunciation-person');
      return [{ voiceType: 'catalog-voice' }];
    },
  });
  await mediaCallback('getAvatarList', {
    ...scope,
    getSceneList: services.getSceneList,
    setAvatarError: noop,
    setAvatarList: noop,
    message: { info: assert.fail },
    t: key => key,
  })();
  await mediaCallback('getVoiceList', {
    ...scope,
    getVcnList: services.getVcnList,
    setVoiceError: noop,
    setOfficialVcnList: noop,
  })();
  assert.deepEqual(state, before);
  assert.deepEqual(state, {
    sceneId: '',
    callSceneId: 'avatar_wmy001',
    sceneMode: 1,
    vcn: '',
    sceneVcn: '',
  });
});

test('only explicit confirmation of a supported catalog avatar changes a legacy mode and preserves its old call ID', async () => {
  const state = {
    sceneMode: 1,
    sceneId: 'old-broadcast',
    callSceneId: 'avatar_lfy',
    sceneVcn: 'old-scene-voice',
    vcn: 'saved-voice',
    open: true,
    error: '',
  };
  const choose = mediaCallback('confirmAvatarSelection', {
    avatarList: [{ sceneId: '118801001', defaultVCN: 'catalog-voice' }],
    tempSelectedAvatar: '118801001',
    tempSelectedVoice: 'saved-voice',
    voiceOptions: [],
    setSelectedAvatar: value => {
      state.sceneId = value;
    },
    setSceneMode: value => {
      state.sceneMode = value;
    },
    setSceneVcn: value => {
      state.sceneVcn = value;
    },
    setSelectedVoice: value => {
      state.vcn = value;
    },
    setAvatarModalVisible: value => {
      state.open = value;
    },
    setAvatarError: value => {
      state.error = value;
    },
  });
  assert.equal(state.sceneMode, 1);
  choose();
  assert.equal(state.sceneMode, 0);
  assert.equal(state.sceneId, '118801001');
  assert.equal(state.callSceneId, 'avatar_lfy');
  assert.equal(state.open, false);
  const writes = [];
  const { handleSubmit } = virtualSubmitHandler(
    async value => writes.push(value),
    {
      sceneMode: state.sceneMode,
      selectedAvatar: state.sceneId,
      callSceneId: state.callSceneId,
      sceneVcn: state.sceneVcn,
      selectedVoice: state.vcn,
    }
  );
  await handleSubmit(mediaFields);
  const consumer = avatarConsumer();
  await consumer.consume({
    flowConfig: JSON.stringify(writes[0].talkAgentConfig),
    advancedConfig: '{}',
  });
  assert.equal(consumer.parameters.at(-1).avatar.avatar_id, '118801001');
  assert.equal(writes[0].talkAgentConfig.callSceneId, 'avatar_lfy');
});

test('empty or stale avatar catalogs display an error without switching mode or dismissing the selector', () => {
  for (const avatarList of [[], [{ sceneId: 'another-id' }]]) {
    let error = '';
    const choose = mediaCallback('confirmAvatarSelection', {
      avatarList,
      tempSelectedAvatar: 'missing-id',
      tempSelectedVoice: '',
      voiceOptions: [],
      setSelectedAvatar: assert.fail,
      setSceneMode: assert.fail,
      setSceneVcn: assert.fail,
      setSelectedVoice: assert.fail,
      setAvatarModalVisible: assert.fail,
      setAvatarError: value => {
        error = value;
      },
    });
    choose();
    assert.match(error, /可用形象/);
  }
});
