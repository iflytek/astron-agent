import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTypeScript(relativePath, mocks = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const module = { exports: {} };
  const moduleRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/assets/')) return name;
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(
    moduleRequire,
    module,
    module.exports
  );
  return module.exports;
}

const utilities = loadTypeScript(
  '../src/components/workflow/utils/reactflowUtils.ts',
  {
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
    i18next: { t: key => key },
    './variable-aggregation': { validateVariableAggregationNode: () => true },
  }
);

test('schema conversion preserves nested required fields and skips hidden fields', () => {
  const outputs = utilities.transformTree([
    {
      id: 'result',
      name: 'result',
      type: 'object',
      children: [
        { id: 'name', name: 'name', type: 'string' },
        { id: 'hidden', name: 'hidden', type: 'string', open: false },
      ],
    },
  ]);
  assert.deepEqual(outputs, [
    {
      id: 'result',
      name: 'result',
      schema: {
        type: 'object',
        properties: [{ id: 'name', name: 'name', type: 'string' }],
      },
    },
  ]);
  outputs[0].schema.properties[0].required = true;
  const schema = utilities.generateValidationSchema(outputs[0]);
  assert.equal(utilities.validateInputJSON('{"name":"value"}', schema), '');
  assert.match(utilities.validateInputJSON('{}', schema), /required/);
});

test('nested parameter defaults use the nested schema instead of an absent root schema', () => {
  const property = {
    id: 'items',
    name: 'items',
    type: 'array-object',
    properties: [
      { id: 'count', name: 'count', type: 'integer', required: true },
    ],
  };
  const schema = utilities.generateValidationSchema(property);
  assert.equal(utilities.validateInputJSON('[{"count":0}]', schema), '');
  assert.match(utilities.validateInputJSON('[{}]', schema), /required/);
  assert.match(
    utilities.validateInputJSON('[{"count":"wrong"}]', schema),
    /integer/
  );
});

test('regenerating fallback output preserves all primitive array values', () => {
  for (const [type, values] of [
    ['array-string', ['', 'second']],
    ['array-integer', [0, 2]],
    ['array-number', [0, 2.5]],
    ['array-boolean', [false, true]],
  ]) {
    const original = { before: values };
    const updated = utilities.generateOrUpdateObject(
      [{ name: 'after', schema: { type } }],
      original
    );
    assert.deepEqual(updated, { after: values });
    assert.deepEqual(original, { before: values });
    assert.notEqual(updated.after, values);
  }
});

test('regenerating fallback output updates every object array item recursively', () => {
  const schema = [
    {
      name: 'results',
      schema: {
        type: 'array-object',
        properties: [
          { name: 'label', type: 'string' },
          { name: 'scores', type: 'array-number' },
          {
            name: 'children',
            type: 'array-object',
            properties: [{ name: 'enabled', type: 'boolean' }],
          },
          { name: 'count', type: 'integer' },
        ],
      },
    },
  ];
  const original = {
    results: [
      {
        name: 'first',
        scores: [0, 1],
        children: [{ active: false }, { active: true }],
      },
      { name: 'second', scores: [2, 3], children: [] },
    ],
  };
  const snapshot = structuredClone(original);
  assert.deepEqual(utilities.generateOrUpdateObject(schema, original), {
    results: [
      {
        label: 'first',
        scores: [0, 1],
        children: [{ enabled: false }, { enabled: true }],
        count: 0,
      },
      { label: 'second', scores: [2, 3], children: [], count: 0 },
    ],
  });
  assert.deepEqual(original, snapshot);
});

test('fallback output distinguishes existing empty arrays from missing values', () => {
  const schema = [
    {
      name: 'results',
      schema: {
        type: 'array-object',
        properties: [{ name: 'name', type: 'string' }],
      },
    },
  ];
  assert.deepEqual(utilities.generateOrUpdateObject(schema, { results: [] }), {
    results: [],
  });
  for (const original of [undefined, {}, { results: 'not an array' }]) {
    assert.deepEqual(utilities.generateOrUpdateObject(schema, original), {
      results: [{ name: '' }],
    });
  }
});

test('removing a nested field keeps the source object and sibling fields intact', () => {
  const original = { results: [{ name: 'kept', secret: 'removed' }] };
  const updated = utilities.deleteFieldByPath(original, ['results', 'secret']);
  assert.deepEqual(updated, { results: [{ name: 'kept' }] });
  assert.equal(original.results[0].secret, 'removed');
  assert.equal(
    utilities.deleteFieldByPath(original, ['missing', 'secret']),
    original
  );
});

test('copying a node with an empty condition list does not corrupt inputs', () => {
  const original = {
    nodeMeta: { aliasName: 'Branch' },
    nodeParam: { cases: [] },
    inputs: [
      {
        id: 'left',
        name: 'left',
        schema: { type: 'string', value: { type: 'literal', content: 'a' } },
      },
      {
        id: 'right',
        name: 'right',
        schema: { type: 'string', value: { type: 'ref', content: {} } },
      },
    ],
    outputs: [],
  };
  const copy = utilities.copyNodeData(original);
  assert.deepEqual(copy.nodeParam.cases, []);
  assert.notEqual(copy.inputs[0].id, original.inputs[0].id);
  assert.deepEqual(
    copy.inputs[0].schema.value,
    original.inputs[0].schema.value
  );
  assert.equal(original.inputs[0].id, 'left');
});

test('database array literals remain valid and cannot masquerade as URL inputs', () => {
  const input = {
    id: 'filter',
    name: 'filter',
    schema: {
      type: 'array-number',
      value: { type: 'literal', content: [1, 2] },
    },
  };
  const node = {
    id: 'database::example',
    nodeType: 'database',
    position: { x: 0, y: 0 },
    data: {
      nodeMeta: { aliasName: 'Database' },
      nodeParam: {},
      inputs: [input],
      outputs: [],
    },
  };
  assert.equal(utilities.checkedNodeInputData([input], node), true);
  assert.equal(utilities.isRefKnowledgeBase(input), false);
  input.customParameterType = 'image_understanding';
  assert.equal(utilities.checkedNodeInputData([input], node), false);
});

test('both graph stores pass their captured getter to edge-reference updates', () => {
  for (const name of ['use-flow-store.ts', 'use-iterator-flow-store.ts']) {
    let args;
    const functions = new Proxy(
      { initialStatus: { nodes: [], edges: [], historys: [], zoom: 80 } },
      {
        get(target, key) {
          if (key === '__esModule') return true;
          if (key === 'initialStatus') return target.initialStatus;
          if (key === 'switchNodeRef')
            return (...values) => {
              args = values;
            };
          return () => undefined;
        },
      }
    );
    const store = loadTypeScript(`../src/components/workflow/store/${name}`, {
      './flow-function': functions,
    }).default;
    const connection = { source: 'source', target: 'target' };
    const edge = { id: 'edge', source: 'previous', target: 'target' };
    store.getState().switchNodeRef(connection, edge);
    assert.equal(args[0], connection);
    assert.equal(args[1], edge);
    assert.equal(args[2](), store.getState());
  }
});

function iteratorEditor() {
  const noop = () => undefined;
  const makeInput = name => ({
    id: `input-${name}`,
    name,
    schema: { type: 'string', value: { type: 'ref', content: {} } },
  });
  const parent = {
    id: 'iteration::parent',
    nodeType: 'iteration',
    position: { x: 0, y: 0 },
    data: {
      nodeMeta: { aliasName: 'Iterator' },
      nodeParam: {},
      inputs: [],
      outputs: ['alpha', 'beta', 'gamma'].map(name => ({
        id: `output-${name}`,
        name,
        schema: { type: 'array-string', default: '' },
      })),
    },
  };
  parent.data.outputs[0].schema.properties = [
    { id: 'nested', name: 'nested', type: 'string' },
  ];
  const end = {
    id: 'iteration-node-end::child',
    nodeType: 'iteration-node-end',
    position: { x: 0, y: 0 },
    data: {
      nodeMeta: { aliasName: 'End' },
      nodeParam: {},
      parentId: parent.id,
      inputs: ['alpha', 'beta', 'gamma'].map(makeInput),
      outputs: [],
    },
  };
  const state = {
    nodes: [parent, end],
    edges: [],
    takeSnapshot: noop,
    updateNodeRef: noop,
    deleteNodeRef: noop,
    delayUpdateNodeRef: noop,
    delayCheckNode: noop,
    checkNode: () => true,
    setNode(id, update) {
      const current = state.nodes.find(node => node.id === id);
      if (!current) return;
      const next = typeof update === 'function' ? update(current) : update;
      state.nodes = state.nodes.map(node => (node.id === id ? next : node));
    },
  };
  const store = selector => selector(state);
  store.getState = () => state;
  const manager = {
    getCurrentStore: () => store,
    showIterativeModal: false,
    iteratorId: '',
    nodeList: [],
    canvasesDisabled: false,
    agentModels: [],
    sparkLlmModels: [],
    questionAnswerModels: [],
    decisionMakingModels: [],
    extractorParameterModels: [],
    autoSaveCurrentFlow: noop,
    canPublishSetNot: noop,
  };
  const managerStore = selector => selector(manager);
  managerStore.getState = () => manager;
  const react = {
    ...require('react'),
    useMemo: callback => callback(),
    useCallback: callback => callback,
    useState: initial => [initial, noop],
  };
  const hook = loadTypeScript(
    '../src/components/workflow/hooks/use-node-common.tsx',
    {
      react,
      ahooks: { useMemoizedFn: callback => callback },
      antd: { Tooltip: noop, Checkbox: noop },
      'react-i18next': { useTranslation: () => ({ t: key => key }) },
      '@/components/workflow/store/use-flows-manager': managerStore,
      '@/components/workflow/store/use-flow-store': store,
      '@/components/workflow/utils/reactflowUtils': utilities,
      '@/components/workflow/ui': {},
      '@/components/workflow/constant': { originOutputTypeList: [] },
      '@/components/workflow/hooks/use-one-click-update': {},
      '@/utils': { isJSON: () => false },
      '../utils/iterator-outputs': loadTypeScript(
        '../src/components/workflow/utils/iterator-outputs.ts'
      ),
    }
  );
  return { state, actions: hook.useNodeCommon({ id: parent.id }) };
}

test('iterator description and nested edits do not rename end inputs', () => {
  const { state, actions } = iteratorEditor();
  actions.handleChangeOutputParam(
    'output-alpha',
    (output, value) => {
      output.schema.default = value;
    },
    'A description, not an input name'
  );
  actions.handleChangeOutputParam('nested', output => {
    output.name = 'renamed nested field';
  });
  assert.equal(state.nodes[1].data.inputs[0].name, 'alpha');
  actions.handleChangeOutputParam(
    'output-alpha',
    (output, value) => {
      output.name = value;
    },
    'renamed'
  );
  assert.equal(state.nodes[1].data.inputs[0].name, 'renamed');
});

test('iterator removal uses the previous output index and preserves sibling inputs', () => {
  const { state, actions } = iteratorEditor();
  actions.handleRemoveOutputLine('output-beta');
  assert.deepEqual(
    state.nodes[0].data.outputs.map(output => output.name),
    ['alpha', 'gamma']
  );
  assert.deepEqual(
    state.nodes[1].data.inputs.map(input => [input.id, input.name]),
    [
      ['input-alpha', 'alpha'],
      ['input-gamma', 'gamma'],
    ]
  );
});
