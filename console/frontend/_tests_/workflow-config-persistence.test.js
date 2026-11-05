import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createSaveCoordinator } from '../src/components/workflow/store/workflow-save-coordinator.ts';
import { normalizeWorkflowResponse } from '../src/services/workflow-response.ts';

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
  await save({ talkAgentConfig: { vcn: 'unsaved' } });
  assert.deepEqual(errors, ['connection lost']);
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
