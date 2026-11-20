import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
function load(name, mocks = {}) {
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL(
        `../src/pages/resource-management/resource-tools/${name}`,
        import.meta.url
      ),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }
  );
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    key => {
      if (key in mocks) return mocks[key];
      throw new Error(key);
    },
    module,
    module.exports
  );
  return module.exports;
}
const model = load('schema-form-model.ts');
const helpers = load('mcp-tools.ts', { './schema-form-model': model });
const { SchemaFields } = load('schema-fields.tsx', {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  './mcp-tools': helpers,
  './schema-form-model': model,
});
const renderers = [];
test.afterEach(() =>
  act(() => renderers.splice(0).forEach(renderer => renderer.unmount()))
);
function fields(schema, value = {}) {
  let result = value;
  let setInput;
  function App() {
    const [input, set] = React.useState({
      schema,
      value: JSON.stringify(value),
      resource: 'initial',
    });
    setInput = set;
    result = JSON.parse(input.value);
    return React.createElement(SchemaFields, {
      key: input.resource,
      schema: input.schema,
      value: input.value,
      onChange: next =>
        set(previous =>
          previous.value === next ? previous : { ...previous, value: next }
        ),
    });
  }
  let renderer;
  act(() => {
    renderer = create(React.createElement(App));
  });
  renderers.push(renderer);
  const app = {
    get nodes() {
      return renderer.root
        .findAll(node => typeof node.type === 'string')
        .map(node => ({
          type: node.type,
          props: Object.fromEntries(
            Object.entries(node.props).map(([key, prop]) => [
              key,
              typeof prop === 'function' && key.startsWith('on')
                ? (...args) => {
                    let returned;
                    act(() => {
                      returned = prop(...args);
                    });
                    return returned;
                  }
                : prop,
            ])
          ),
        }));
    },
    value: () => result,
    render: (next = result, nextSchema = schema, resource = 'initial') =>
      act(() =>
        setInput({ schema: nextSchema, value: JSON.stringify(next), resource })
      ),
  };
  return app;
}
const text = node =>
  Array.isArray(node)
    ? node.map(text).join('')
    : node && typeof node === 'object'
      ? text(node.props?.children)
      : node == null || node === false
        ? ''
        : String(node);
const control = (app, name) => {
  const label = app.nodes.find(
    node =>
      node.type === 'label' &&
      text(node.props.children).replace(/ \*$/, '') === name
  );
  return app.nodes.find(
    node => node.props?.id && node.props.id === label?.props.htmlFor
  );
};
test('MCP nested references, enum booleans and numeric inputs remain typed without adding optional keys', () => {
  const schema = {
    type: 'object',
    required: ['repo', 'count', 'enabled', 'options'],
    properties: {
      repo: { type: 'string' },
      count: { type: 'integer' },
      enabled: { type: 'boolean' },
      options: { $ref: '#/$defs/Options' },
      unused: { type: 'string' },
    },
    $defs: {
      Options: {
        type: 'object',
        required: ['label'],
        properties: { label: { type: 'string' } },
      },
    },
  };
  for (const [name, event, expected] of [
    ['repo', { value: 'astron-agent' }, 'astron-agent'],
    ['count', { value: '0', valueAsNumber: 0 }, 0],
    ['enabled', { value: 'false' }, false],
  ]) {
    const app = fields(schema, {});
    const input = control(app, name);
    assert.ok(input);
    assert.equal(input.props.required, true);
    input.props.onChange({ target: event });
    assert.deepEqual(app.value(), { [name]: expected });
  }
  const app = fields(schema, { options: { label: 'hello' } });
  assert.ok(control(app, 'label'));
  assert.ok(app.nodes.some(node => node.type === 'details'));
  assert.equal('unused' in app.value(), false);
});
test('optional scalar clearing omits it while empty required text stays explicit', () => {
  const schema = {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' }, optional: { type: 'string' } },
  };
  let app = fields(schema, { name: 'x', optional: 'y' });
  control(app, 'optional').props.onChange({ target: { value: '' } });
  assert.deepEqual(app.value(), { name: 'x' });
  app = fields(schema, { name: 'x' });
  control(app, 'name').props.onChange({ target: { value: '' } });
  assert.deepEqual(app.value(), { name: '' });
});
test('HTTP form selects saved operation and keeps path/query/header/body and local refs', () => {
  const schema = {
    servers: [{ url: 'https://example.com' }],
    components: {
      schemas: {
        Options: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
        },
      },
    },
    paths: {
      '/unused': { get: { parameters: [] } },
      '/{repo}': {
        parameters: [{ name: 'repo', in: 'path', schema: { type: 'string' } }],
        post: {
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: true,
              schema: { type: 'integer' },
            },
            { name: 'token', in: 'header', schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Options' },
              },
            },
          },
        },
      },
    },
  };
  const result = model.httpInputSchema({
    schema,
    method: 'POST',
    endPoint: 'https://example.com/{repo}',
  });
  assert.deepEqual(Object.keys(result.properties), [
    'path',
    'query',
    'header',
    'body',
  ]);
  assert.deepEqual(result.required, ['path', 'query', 'body']);
  assert.equal(result.properties.body.properties.enabled.type, 'boolean');
  assert.deepEqual(result.properties.path.required, ['repo']);
});
test('arrays are edited as item forms and removing an item preserves remaining values', () => {
  const app = fields(
    {
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' } } },
    },
    { tags: ['a', 'b'] }
  );
  const button = app.nodes.find(
    node =>
      node.type === 'button' && text(node.props.children) === '移除第 1 项'
  );
  assert.ok(button);
  button.props.onClick();
  assert.deepEqual(app.value(), { tags: ['b'] });
});
test('field updates cannot mutate prototypes and reference cycles terminate', () => {
  const original = { other: 0 };
  const result = model.updateProperty(original, '__proto__', { bad: true });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), true);
  assert.equal({}.bad, undefined);
  assert.deepEqual(original, { other: 0 });
  const root = {
    $defs: { A: { $ref: '#/$defs/B' }, B: { $ref: '#/$defs/A' } },
  };
  assert.ok(model.resolveField({ $ref: '#/$defs/A' }, root).$ref);
});

test('structured enum selects preserve object and array values rather than rendering container editors', () => {
  for (const [type, choices] of [
    ['object', [{ mode: 'a' }, { mode: 'b' }]],
    ['array', [[1], [2, 3]]],
  ]) {
    const schema = {
      type: 'object',
      required: ['choice'],
      properties: { choice: { type, enum: choices } },
    };
    assert.deepEqual(helpers.schemaExample(schema), { choice: choices[0] });
    const app = fields(schema, helpers.schemaExample(schema));
    const select = control(app, 'choice');
    assert.equal(select.type, 'select');
    select.props.onChange({ target: { value: JSON.stringify(choices[1]) } });
    assert.deepEqual(app.value(), { choice: choices[1] });
  }
});

test('opening optional containers initializes only their required child containers', () => {
  for (const nested of [
    { type: 'object', properties: {} },
    { type: 'array', items: { type: 'string' } },
  ]) {
    const schema = {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          title: '请求内容',
          required: ['nested'],
          properties: { nested, unused: { type: 'object' } },
        },
      },
    };
    const app = fields(schema, {});
    const button = app.nodes.find(
      node =>
        node.type === 'button' && text(node.props.children) === '填写请求内容'
    );
    assert.ok(button);
    assert.deepEqual(app.value(), {});
    button.props.onClick();
    assert.deepEqual(app.value(), {
      body: { nested: nested.type === 'array' ? [] : {} },
    });
  }
  const definition = {
    type: 'object',
    required: ['nested'],
    properties: {
      nested: { $ref: '#/$defs/Child' },
      ignored: { type: 'array' },
    },
    $defs: {
      Child: {
        type: 'object',
        required: ['values'],
        properties: { values: { type: 'array', items: { type: 'string' } } },
      },
    },
  };
  assert.deepEqual(model.fieldDefault(definition), { nested: { values: [] } });
});

test('MCP text/list union uses typed controls and restores all list items across type switches', () => {
  const app = fields(
    {
      type: 'object',
      required: ['repoName'],
      properties: {
        repoName: {
          description: 'A repository or repositories.',
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
      },
    },
    { repoName: '' }
  );
  assert.equal(control(app, 'repoName').type, 'input');
  assert.equal(control(app, 'repoName').props.required, true);
  assert.equal(
    app.nodes.some(node => node.type === 'textarea'),
    false
  );
  assert.equal(text(control(app, 'repoName类型').props.children), '文本列表');
  control(app, 'repoName').props.onChange({
    target: { value: 'langchain-ai/deepagents' },
  });
  app.render();
  control(app, 'repoName类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), { repoName: ['langchain-ai/deepagents'] });
  app.render();
  app.nodes
    .find(
      node => node.type === 'button' && text(node.props.children) === '添加一项'
    )
    .props.onClick();
  app.render();
  control(app, '第 2 项').props.onChange({
    target: { value: 'iflytek/astron-agent' },
  });
  app.render();
  control(app, 'repoName类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { repoName: 'langchain-ai/deepagents' });
  app.render();
  control(app, 'repoName类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), {
    repoName: ['langchain-ai/deepagents', 'iflytek/astron-agent'],
  });
  app.render();
  assert.equal(control(app, '第 2 项').props.value, 'iflytek/astron-agent');
  assert.equal(
    app.nodes.some(node => node.type === 'textarea'),
    false
  );
});

test('oneOf local references, typed defaults and nullable values choose corresponding editors', () => {
  const schema = {
    type: 'object',
    required: ['choice'],
    properties: {
      choice: { oneOf: [{ type: 'null' }, { $ref: '#/$defs/List' }] },
    },
    $defs: {
      List: { type: 'array', title: '仓库列表', items: { type: 'string' } },
    },
  };
  const app = fields(schema, { choice: ['a', 'b'] });
  assert.equal(control(app, 'choice类型').props.value, 1);
  assert.equal(control(app, '第 2 项').props.value, 'b');
  control(app, 'choice类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { choice: null });
  app.render();
  assert.equal(control(app, 'choice').props.value, 'null');
  control(app, 'choice类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), { choice: ['a', 'b'] });
  assert.deepEqual(model.fieldDefault(schema), { choice: [] });
  assert.deepEqual(helpers.schemaExample(schema), { choice: [] });
  assert.deepEqual(
    model.fieldDefault({
      anyOf: [{ type: 'string' }, { type: 'array' }],
      default: ['saved'],
    }),
    ['saved']
  );
});

test('type arrays retain optional omission and numeric editor selection while empty', () => {
  const app = fields({
    type: 'object',
    properties: { optional: { type: ['string', 'number', 'null'] } },
  });
  assert.deepEqual(app.value(), {});
  control(app, 'optional类型').props.onChange({ target: { value: '1' } });
  app.render();
  assert.equal(control(app, 'optional').props.type, 'number');
  assert.deepEqual(app.value(), {});
  control(app, 'optional').props.onChange({
    target: { value: '0', valueAsNumber: 0 },
  });
  app.render();
  assert.deepEqual(app.value(), { optional: 0 });
  // Editing the advanced value selects its actual type rather than coercing it.
  app.render({ optional: null });
  assert.equal(control(app, 'optional类型').props.value, 2);
  assert.equal(control(app, 'optional').props.value, 'null');
});

test('union branch drafts stay isolated by field and use the latest advanced edits', () => {
  const union = {
    anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  };
  const app = fields(
    {
      type: 'object',
      required: ['left', 'right'],
      properties: { left: union, right: union },
    },
    { left: 'left', right: 'right' }
  );
  control(app, 'left类型').props.onChange({ target: { value: '1' } });
  app.render();
  control(app, 'right类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), { left: ['left'], right: ['right'] });
  app.render({ left: ['latest', 'list'], right: ['right'] });
  control(app, 'left类型').props.onChange({ target: { value: '0' } });
  app.render();
  control(app, 'left类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), { left: ['latest', 'list'], right: ['right'] });
});

test('union defaults select their matching type and reference recursion remains bounded', () => {
  const choice = {
    anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    default: ['a'],
  };
  const app = fields({ type: 'object', properties: { choice } });
  assert.equal(control(app, 'choice类型').props.value, 1);
  assert.deepEqual(
    helpers.schemaExample({ type: 'object', properties: { choice } }),
    { choice: ['a'] }
  );
  assert.deepEqual(
    model.fieldDefault({
      anyOf: [{ type: 'string' }, { type: 'array', default: [] }],
    }),
    []
  );
  const recursive = {
    $defs: { Recursive: { anyOf: [{ $ref: '#/$defs/Recursive' }] } },
    type: 'object',
    required: ['choice'],
    properties: { choice: { $ref: '#/$defs/Recursive' } },
  };
  assert.doesNotThrow(() => helpers.schemaExample(recursive));
  assert.doesNotThrow(() => fields(recursive, { choice: '' }));
});

test('optional union type and draft survive moving into optional fields and an unchanged parent value', () => {
  const app = fields(
    {
      type: 'object',
      properties: {
        choice: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      },
    },
    { choice: 'keep me' }
  );
  control(app, 'choice类型').props.onChange({ target: { value: '1' } });
  assert.deepEqual(app.value(), {});
  assert.equal(control(app, 'choice类型').props.value, 1);
  assert.equal(control(app, 'choice').props.type, 'number');
  // Its scalar value stays absent, but the editor choice is still a real UI update.
  control(app, 'choice类型').props.onChange({ target: { value: '1' } });
  assert.equal(control(app, 'choice').props.type, 'number');
  control(app, 'choice类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { choice: 'keep me' });
});

test('array union drafts follow stable row identity after deleting an earlier row', () => {
  const app = fields(
    {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
      },
    },
    { items: ['first', 'second'] }
  );
  control(app, '第 1 项类型').props.onChange({ target: { value: '1' } });
  control(app, '第 2 项类型').props.onChange({ target: { value: '1' } });
  const outerRemove = app.nodes.filter(
    node =>
      node.type === 'button' && text(node.props.children) === '移除第 1 项'
  )[1];
  outerRemove.props.onClick();
  assert.deepEqual(app.value(), { items: [['second']] });
  control(app, '第 1 项类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { items: ['second'] });
});

test('nested inactive union drafts survive outer branch unmounts', () => {
  const app = fields(
    {
      type: 'object',
      required: ['outer'],
      properties: {
        outer: {
          anyOf: [
            {
              type: 'object',
              required: ['inner'],
              properties: {
                inner: {
                  anyOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } },
                  ],
                },
              },
            },
            { type: 'string' },
          ],
        },
      },
    },
    { outer: { inner: 'inner-text' } }
  );
  control(app, 'inner类型').props.onChange({ target: { value: '1' } });
  control(app, '第 1 项').props.onChange({
    target: { value: 'new-list-text' },
  });
  control(app, 'outer类型').props.onChange({ target: { value: '1' } });
  control(app, 'outer类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { outer: { inner: ['new-list-text'] } });
  control(app, 'inner类型').props.onChange({ target: { value: '0' } });
  assert.deepEqual(app.value(), { outer: { inner: 'inner-text' } });
});

test('raw value, schema and resource changes isolate inactive union drafts', () => {
  const schema = {
    type: 'object',
    required: ['choice'],
    properties: {
      choice: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
    },
  };
  for (const reset of ['raw', 'schema', 'resource']) {
    const app = fields(schema, { choice: 'old-text' });
    control(app, 'choice类型').props.onChange({ target: { value: '1' } });
    control(app, '第 1 项').props.onChange({
      target: { value: 'current-list' },
    });
    app.render(
      { choice: [reset === 'raw' ? 'new-list' : 'current-list'] },
      reset === 'schema'
        ? { ...schema, description: 'New definition' }
        : schema,
      reset === 'resource' ? 'another-resource' : 'initial'
    );
    control(app, 'choice类型').props.onChange({ target: { value: '0' } });
    assert.deepEqual(
      app.value(),
      { choice: reset === 'raw' ? 'new-list' : 'current-list' },
      reset
    );
  }
});
