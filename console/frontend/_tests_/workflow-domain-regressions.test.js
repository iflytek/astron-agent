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

test('published Agent references accept API-created query/input bindings without an inline template', () => {
  for (const name of ['query', 'input']) {
    const node = {
      nodeType: 'agent',
      data: {
        nodeParam: {
          agentId: 158,
          instruction: { queryErrMsg: 'stale error' },
        },
        inputs: [
          {
            id: 'query',
            name,
            schema: {
              type: 'string',
              value: {
                type: 'ref',
                content: {
                  nodeId: 'node-start::start',
                  name: 'AGENT_USER_INPUT',
                },
              },
            },
          },
        ],
        outputs: [],
      },
    };
    assert.equal(utilities.checkedNodeParams(node), true);
    assert.equal(node.data.nodeParam.agentIdErrMsg, '');
    assert.equal(utilities.checkedNodeInputData(node.data.inputs, node), true);
    node.data.inputs[0].schema.value.content = {};
    assert.equal(utilities.checkedNodeInputData(node.data.inputs, node), false);
    node.data.inputs = [];
    assert.equal(utilities.checkedNodeParams(node), false);
  }
});

test('legacy inline Agents cannot execute until rebound to an existing Agent', () => {
  const node = {
    nodeType: 'agent',
    data: {
      nodeParam: {
        plugin: { mcpServerUrls: [] },
        instruction: { query: '{{query}}' },
        serviceId: 'model',
      },
      inputs: [{ name: 'query' }],
      outputs: [],
    },
  };
  assert.equal(utilities.checkedNodeParams(node), false);
  assert.equal(node.data.nodeParam.agentIdErrMsg, '请选择已有 Agent');
  node.data.nodeParam.agentId = 158;
  assert.equal(utilities.checkedNodeParams(node), true);
});

function agentSelection(node) {
  const noop = () => undefined;
  const agents = [
    { id: 158, botName: 'Support', publishedVersionId: 1 },
    { id: 159, botName: 'Research', publishedVersionId: 2 },
  ];
  const states = [agents, false, '', 0];
  const react = {
    ...require('react'),
    memo: component => component,
    useEffect: noop,
    useState: () => [states.shift(), noop],
  };
  const { AgentDetail } = loadTypeScript(
    '../src/components/workflow/nodes/agent/index.tsx',
    {
      react,
      antd: {
        Alert: 'alert',
        Button: 'button',
        Select: 'select',
        Spin: 'spin',
      },
      '@/services/agents': { listAgents: noop },
      '@/components/workflow/store/use-flows-manager': selector =>
        selector({ canvasesDisabled: false }),
      '@/components/workflow/hooks/use-node-common': {
        useNodeCommon: () => ({
          handleChangeNodeParam: (update, value) => update(node.data, value),
        }),
      },
      '@/components/workflow/ui': { FLowCollapse: 'section' },
      '../components/inputs': 'inputs',
      '../components/outputs': 'outputs',
      '../components/exception-handling': 'exception-handling',
    }
  );
  const editor = AgentDetail({ id: node.id, data: node.data });
  const content = editor.props.children[0].props.content;
  return content.props.children.find(
    element => element?.props?.['aria-label'] === '选择 Agent'
  ).props.onChange;
}

function validateAgentBranches(node, edges) {
  const makeNode = (id, nodeType) => ({
    id,
    nodeType,
    data: { label: id, nodeMeta: {}, nodeParam: {}, inputs: [], outputs: [] },
  });
  let errors;
  const state = {
    nodes: [makeNode('start', 'node-start'), node, makeNode('end', 'node-end')],
    edges: [{ id: 'start-agent', source: 'start', target: node.id }, ...edges],
    checkNode: () => true,
    setEdges: update => {
      state.edges = update(state.edges);
    },
  };
  const { checkFlow } = loadTypeScript(
    '../src/components/workflow/store/flow-manager-function.ts',
    {
      antd: { message: {} },
      '@/utils/http-error': {},
      './advanced-config-persistence': {},
      '@/services/flow': {},
      '../utils/variable-aggregation': {},
      './use-flow-store': { getState: () => state },
      './use-iterator-flow-store': {},
      '@/components/workflow/utils/workflow-import-dependencies': {
        getActiveImportDependencyIssues: () => [],
      },
      './workflow-save-coordinator': {},
      i18next: { t: key => key },
    }
  );
  const valid = checkFlow(() => ({
    setErrNodes: value => {
      errors = value;
    },
  }));
  return { valid, errors };
}

test('actual Agent selection preserves custom names, remarks and configured exception branches', () => {
  const node = {
    id: 'agent::support',
    nodeType: 'agent',
    data: {
      label: 'Answer customer questions',
      nodeMeta: { aliasName: 'Customer support', nodeType: '基础节点' },
      nodeParam: {
        handlingEdge: 'normal_one_of::support',
        exceptionHandlingEdge: 'fail_one_of::support',
        remark: 'Escalate failures to a teammate',
        remarkVisible: true,
        streamOutput: true,
        agentIdErrMsg: '请选择已有 Agent',
        modelId: 9,
        llmId: 9,
        serviceId: 'old-model',
        uid: 'old-owner',
        appId: 'old-app',
        modelConfig: { domain: 'old-model', agentStrategy: 1 },
        instruction: { query: '{{input}}', reasoning: 'old prompt' },
        plugin: { tools: ['old-tool'], mcpServerUrls: ['https://old.example'] },
        maxLoopCount: 10,
        enableChatHistoryV2: { isEnabled: true, rounds: 2 },
      },
      retryConfig: { shouldRetry: true, errorStrategy: 2, maxRetries: 2 },
      inputs: [{ name: 'input', schema: { type: 'string' } }],
      outputs: [{ name: 'output', schema: { type: 'string' } }],
    },
  };
  const edges = [
    {
      id: 'normal',
      source: node.id,
      sourceHandle: 'normal_one_of::support',
      target: 'end',
    },
    {
      id: 'failure',
      source: node.id,
      sourceHandle: 'fail_one_of::support',
      target: 'end',
    },
  ];
  const original = structuredClone(node);
  const originalEdges = structuredClone(edges);
  const select = agentSelection(node);
  for (const [agentId, agentName] of [
    [158, 'Support'],
    [159, 'Research'],
  ]) {
    select(agentId);
    assert.equal(node.data.nodeParam.agentId, agentId);
    assert.equal(node.data.nodeParam.agentName, agentName);
    assert.equal(node.data.nodeParam.agentIdErrMsg, '');
    assert.deepEqual(node.data.nodeMeta, original.data.nodeMeta);
    assert.equal(node.data.label, original.data.label);
    assert.deepEqual(node.data.retryConfig, original.data.retryConfig);
    assert.deepEqual(node.data.inputs, original.data.inputs);
    assert.deepEqual(node.data.outputs, original.data.outputs);
    assert.equal(node.data.nodeParam.remark, original.data.nodeParam.remark);
    assert.equal(node.data.nodeParam.remarkVisible, true);
    assert.equal(node.data.nodeParam.streamOutput, true);
    assert.deepEqual(edges, originalEdges);
    assert.equal(node.data.nodeParam.handlingEdge, edges[0].sourceHandle);
    assert.equal(
      node.data.nodeParam.exceptionHandlingEdge,
      edges[1].sourceHandle
    );
    assert.deepEqual(validateAgentBranches(node, edges), {
      valid: true,
      errors: [],
    });
    for (const field of [
      'modelId',
      'llmId',
      'serviceId',
      'uid',
      'appId',
      'modelConfig',
      'instruction',
      'plugin',
      'maxLoopCount',
      'enableChatHistoryV2',
    ]) {
      assert.equal(Object.hasOwn(node.data.nodeParam, field), false, field);
    }
  }
  // Confirm the validation exercised above detects the original failure mode.
  delete node.data.nodeParam.exceptionHandlingEdge;
  const broken = validateAgentBranches(node, edges);
  assert.equal(broken.valid, false);
  assert.match(broken.errors[0].errorMsg, /异常处理节点存在未连接的边/);
});
