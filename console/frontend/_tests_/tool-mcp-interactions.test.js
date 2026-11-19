import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
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
  '../src/pages/resource-management/resource-tools/mcp-tools.ts'
);

test('MCP inputs preserve falsy and nested defaults without inventing optional values', () => {
  assert.deepEqual(
    helpers.schemaExample({
      type: 'object',
      required: ['nested'],
      properties: {
        enabled: { type: 'boolean', default: false },
        limit: { type: 'number', default: 0 },
        nested: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' }, skip: { type: 'string' } },
        },
        omitted: { type: 'string' },
      },
    }),
    { enabled: false, limit: 0, nested: { name: '' } }
  );
  assert.deepEqual(helpers.schemaExample({ type: 'object' }), {});
  assert.throws(() => helpers.parseArguments('[]'), /JSON 对象/);
  assert.throws(() => helpers.parseArguments('null'), /JSON 对象/);
});

test('management and workflow discovery preserve the complete official tool schema', () => {
  const tool = {
    name: 'query',
    inputSchema: {
      type: 'object',
      properties: {
        options: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    },
  };
  assert.deepEqual(
    helpers.mcpTools({ tools: { servers: [{ tools: [tool] }] } }),
    [tool]
  );
  assert.deepEqual(helpers.mcpTools({ tools: [tool] }), [tool]);
  assert.equal(helpers.mcpResultFailed({ isError: true, content: [] }), true);
});
