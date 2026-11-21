import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function load(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    name => {
      if (name.endsWith('.css')) return {};
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unmocked dependency: ${name}`);
    },
    module,
    module.exports
  );
  return module.exports;
}
const helpers = load(
  '../src/pages/resource-management/resource-tools/mcp-tools.ts',
  {
    './schema-form-model': load(
      '../src/pages/resource-management/resource-tools/schema-form-model.ts'
    ),
  }
);
const errors = load(
  '../src/pages/resource-management/resource-tools/resource-errors.ts'
);
const templates = load(
  '../src/pages/resource-management/resource-tools/http-test-template.ts',
  {
    './mcp-tools': helpers,
  }
);

function children(node) {
  return Array.isArray(node) ? node : [node];
}
function nodes(node) {
  return children(node).flatMap(item =>
    item && typeof item === 'object'
      ? [item, ...nodes(item.props?.children)]
      : []
  );
}
function text(node) {
  return children(node)
    .map(item =>
      item && typeof item === 'object'
        ? text(item.props?.children)
        : (item ?? '')
    )
    .join('');
}

// Execute the actual component handlers with controlled HTTP responses. Only the
// hooks and presentation components are adapted; no copied state transition code.
function fixture(mode) {
  const cells = [];
  let cursor = 0,
    effects = [];
  const changed = (old, next) =>
    !old || old.some((value, i) => !Object.is(value, next[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!cells[index])
        cells[index] = {
          value: typeof initial === 'function' ? initial() : initial,
        };
      return [
        cells[index].value,
        update => {
          cells[index].value =
            typeof update === 'function' ? update(cells[index].value) : update;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (cells[index] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (changed(cells[index]?.deps, deps))
        effects.push(() => {
          cells[index]?.cleanup?.();
          cells[index] = { deps, cleanup: effect() };
        });
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Input = Object.assign(() => null, { TextArea: 'TextArea' });
  const ui = Object.fromEntries(
    [
      'Alert',
      'Button',
      'Drawer',
      'Dropdown',
      'Empty',
      'Modal',
      'Pagination',
      'Select',
      'Skeleton',
      'Tabs',
      'Tag',
    ].map(name => [name, name])
  );
  const space = { spaceId: 'test-space', enterpriseId: '' };
  const requests = [];
  const row = {
    id: 11,
    name: 'Read-only fixture',
    version: 'V1.0',
    schema: {},
    tools: {
      servers: [{ tools: [{ name: 'read', inputSchema: { type: 'object' } }] }],
    },
  };
  const http = {
    get: async url =>
      url.endsWith('/catalog')
        ? []
        : url.endsWith('/11')
          ? row
          : { records: [row], total: 1 },
    post: (url, body) => {
      const next = deferred();
      requests.push({ ...next, url, body });
      return next.promise;
    },
  };
  const Component = load(
    '../src/pages/resource-management/resource-tools/index.tsx',
    {
      react: hooks,
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      antd: { ...ui, Input },
      '@ant-design/icons': new Proxy({}, { get: (_, key) => key }),
      '@/utils/http': { default: http },
      '@/store/space-store': { default: selector => selector(space) },
      './mcp-tools': helpers,
      './http-test-template': templates,
      './resource-errors': errors,
      './connection-parameters': { default: 'ConnectionParameters' },
      './resource-select': { default: 'ResourceSelect' },
      './http-config': { prepareHttpSchemaForSave: value => value },
      './http-config-form': { default: 'HttpConfigForm' },
      './schema-fields': { SchemaFields: 'SchemaFields' },
      './schema-form-model': { httpInputSchema: () => ({ type: 'object' }) },
    }
  ).default;
  let tree;
  function render() {
    cursor = 0;
    effects = [];
    tree = Component({ mode });
    effects.forEach(effect => effect());
    nodes(tree)
      .filter(node => node.type === 'form' && node.props.ref)
      .forEach(node => {
        node.props.ref.current = { reportValidity: () => true };
      });
    return tree;
  }
  const all = () => nodes(tree);
  const button = name =>
    all().find(
      node => node.type === 'Button' && text(node.props.children) === name
    );
  render();
  return {
    render,
    all,
    button,
    requests,
    space,
    output: () =>
      all()
        .filter(node => node.props?.className === 'resource-tools-result')
        .flatMap(node => nodes(node).filter(child => child.type === 'pre'))
        .map(node => text(node.props.children))
        .join('\n'),
    alerts: () =>
      all()
        .filter(node => node.type === 'Alert')
        .map(node => node.props),
    async open() {
      await settle();
      render();
      button(mode === 'mcp' ? '查看工具与测试' : '查看与测试').props.onClick();
      await settle();
      render();
    },
  };
}

for (const mode of ['tools', 'mcp']) {
  test(`${mode}: new test clears earlier output while pending and after plain-object rejection`, async () => {
    const app = fixture(mode);
    await app.open();
    app.button('运行测试').props.onClick();
    app.requests[0].resolve(
      mode === 'mcp'
        ? { isError: true, content: [{ text: 'previous-response' }] }
        : { value: 'previous-response' }
    );
    await settle();
    app.render();
    assert.match(app.output(), /previous-response/);
    if (mode === 'mcp')
      assert.ok(
        app.alerts().some(alert => alert.message === '工具返回调用失败')
      );

    app.button('运行测试').props.onClick();
    app.render();
    assert.equal(app.button('运行测试').props.loading, true);
    assert.equal(app.output(), '');
    assert.ok(
      !app.alerts().some(alert => alert.message === '工具返回调用失败')
    );
    app.requests[1].reject({ code: 502, message: '上游未响应' });
    await settle();
    app.render();
    assert.equal(app.output(), '');
    assert.equal(app.button('运行测试').props.loading, false);
    const failure = app
      .alerts()
      .find(
        alert =>
          alert.message ===
          (mode === 'mcp' ? 'MCP 工具调用失败' : 'HTTP 工具调用失败')
      );
    assert.ok(failure);
    assert.match(failure.description, /上游未响应/);
    assert.match(failure.description, /重新运行测试/);
  });
}

test('a rejected test from the preceding space cannot show an error or result in a new space', async () => {
  const app = fixture('tools');
  await app.open();
  app.button('运行测试').props.onClick();
  app.space.spaceId = 'other-space';
  app.render();
  app.requests[0].reject({ message: 'old-space-error' });
  await settle();
  app.render();
  assert.equal(app.output(), '');
  assert.ok(
    !app.alerts().some(alert => alert.description?.includes('old-space-error'))
  );
});

test('connection validation has its own failure and recovery for a non-Error rejection', async () => {
  const app = fixture('mcp');
  await settle();
  app.render();
  app.button('新建服务').props.onClick();
  app.render();
  const form = app.all().find(node => node.type === 'form');
  form.props.ref.current = { reportValidity: () => true };
  form.props.onSubmit({ preventDefault() {} });
  app.requests[0].reject({ code: 400, desc: '无法连接该 MCP 服务' });
  await settle();
  app.render();
  const failure = app
    .alerts()
    .find(alert => alert.message === 'MCP 连接验证与保存未完成');
  assert.ok(failure);
  assert.match(failure.description, /无法连接该 MCP 服务/);
  assert.match(failure.description, /重新验证/);
  assert.ok(!app.alerts().some(alert => alert.message === 'MCP 工具调用失败'));
});

test('discovery and invocation have distinct fallback recovery without serializing thrown objects', () => {
  const opaque = {
    token: 'must-not-render',
    response: { headers: { authorization: 'secret' } },
  };
  const discovery = errors.resourceFailure(opaque, errors.mcpDiscoveryFailure);
  const invocation = errors.resourceFailure(null, errors.mcpCallFailure);
  assert.equal(discovery.title, 'MCP 工具发现失败');
  assert.equal(invocation.title, 'MCP 工具调用失败');
  assert.match(discovery.description, /连接与授权.*重新发现/);
  assert.match(invocation.description, /工具参数.*重新运行测试/);
  assert.doesNotMatch(
    JSON.stringify(discovery),
    /must-not-render|authorization|secret/
  );
});
