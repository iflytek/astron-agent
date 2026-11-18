import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'exports', compiled)(id => {
    if (id.startsWith('@/assets/')) {
      const asset = path.join(sourceRoot, id.slice(2));
      assert.ok(existsSync(asset), `Bundled icon must exist: ${id}`);
      return asset;
    }
    if (id.endsWith('.scss')) return { icon: 'workflow-node-icon' };
    if (!id.startsWith('.') && !id.startsWith('@/')) return require(id);
    const target = id.startsWith('@/')
      ? path.join(sourceRoot, id.slice(2))
      : path.resolve(path.dirname(file), id);
    return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  }, exports);
  return exports;
}
const { workflowNodeIconSource, normalizeWorkflowNodeIcons } = load(
  path.join(sourceRoot, 'components/workflow/nodes/node-icon-source.ts')
);
const { WorkflowNodeIcon } = load(
  path.join(sourceRoot, 'components/workflow/nodes/node-icon.tsx')
);
const defaults = JSON.parse(
  readFileSync(
    new URL(
      '../../backend/astron_console/workflows/migrations/node_defaults.json',
      import.meta.url
    ),
    'utf8'
  )
)
  .filter(row => row.category === 'WORKFLOW_NODE_TEMPLATE')
  .map(row => JSON.parse(row.value));

test('the shipped node catalog renders bundled images or official SVG icons without external defaults', () => {
  const original = structuredClone(defaults);
  const [category] = normalizeWorkflowNodeIcons([
    { name: 'Nodes', nodes: defaults },
  ]);
  for (const node of category.nodes) {
    const markup = renderToStaticMarkup(
      React.createElement(WorkflowNodeIcon, {
        nodeType: node.idType,
        src: node.data.icon,
      })
    );
    assert.match(markup, /<(img|svg)\b/, node.idType);
    assert.doesNotMatch(markup, /src="https?:\/\//, node.idType);
    assert.equal(node.icon, node.data.icon, node.idType);
  }
  assert.deepEqual(
    defaults,
    original,
    'Normalization must not mutate service data'
  );
});

test('saved built-in identities and nested start/end nodes ignore stale remote images', () => {
  for (const nodeType of [
    'node-start',
    'spark-llm',
    'ifly-code',
    'agent',
    'if-else',
    'iteration-node-start',
    'iteration-node-end',
    'loop-node-start',
    'loop-node-end',
    'loop-exit',
  ]) {
    const markup = renderToStaticMarkup(
      React.createElement(WorkflowNodeIcon, {
        nodeType,
        src: 'https://unavailable.example/icon.png',
      })
    );
    assert.match(markup, /<(img|svg)\b/, nodeType);
    assert.doesNotMatch(markup, /unavailable\.example/, nodeType);
  }
});

test('selected resource icons remain custom, with a usable default for missing resources', () => {
  for (const nodeType of ['plugin', 'mcp', 'flow', 'rpa']) {
    assert.equal(
      workflowNodeIconSource(nodeType, '/selected-resource.png'),
      '/selected-resource.png'
    );
    assert.ok(existsSync(workflowNodeIconSource(nodeType)), nodeType);
  }
  const [category] = normalizeWorkflowNodeIcons([
    {
      name: 'Extensions',
      nodes: [{ idType: 'extension-node', data: { icon: '/extension.svg' } }],
    },
  ]);
  assert.equal(category.nodes[0].data.icon, '/extension.svg');
  assert.match(
    renderToStaticMarkup(
      React.createElement(WorkflowNodeIcon, { nodeType: 'extension-node' })
    ),
    /<svg\b/
  );
});
