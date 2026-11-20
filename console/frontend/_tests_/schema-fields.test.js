import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
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
const helpers = load('mcp-tools.ts');
const model = load('schema-form-model.ts');
let id = 0;
const jsx = (type, props) =>
  typeof type === 'function' ? type(props) : { type, props };
const { SchemaFields } = load('schema-fields.tsx', {
  react: { useId: () => `field-${id++}` },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  './mcp-tools': helpers,
  './schema-form-model': model,
});
const nodes = node =>
  Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === 'object'
      ? [node, ...nodes(node.props?.children)]
      : [];
function fields(schema, value = {}) {
  let result = value;
  const tree = SchemaFields({
    schema,
    value: JSON.stringify(value),
    onChange: next => (result = JSON.parse(next)),
  });
  return { nodes: nodes(tree), value: () => result };
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
