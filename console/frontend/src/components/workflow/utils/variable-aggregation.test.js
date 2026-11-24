import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const icon = '/assets/variable-aggregation-icon.svg';
const compiled = ts.transpileModule(
  readFileSync(new URL('./variable-aggregation.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const actions = {};
new Function('require', 'exports', compiled)(name => {
  if (name === 'uuid') return { v4: () => 'generated-id' };
  if (name === 'i18next') return { default: { t: value => value } };
  if (name.endsWith('.svg')) return { default: icon };
  throw new Error(`Unexpected dependency: ${name}`);
}, actions);

test('server aggregation templates receive the local icon without changing their configuration', () => {
  const data = {
    inputs: [{ name: 'existing-candidate' }],
    nodeParam: { fallbackEnabled: true, fallbackValue: 'retained' },
  };
  const otherNode = { idType: 'node-variable', data: { icon: 'storage.svg' } };
  const templates = [
    {
      name: '转换',
      nodes: [{ idType: 'variable-aggregation', data }, otherNode],
    },
  ];

  const result = actions.appendVariableAggregationNodeTemplate(templates);

  assert.equal(result[0].nodes.length, 2);
  assert.deepEqual(result[0].nodes[0].data, { ...data, icon });
  assert.equal(result[0].nodes[1], otherNode);
  assert.equal(templates[0].nodes[0].data, data);
  assert.equal(data.icon, undefined);
});

test('missing aggregation templates are added with the same local icon', () => {
  const result = actions.appendVariableAggregationNodeTemplate([]);
  assert.equal(result[0].nodes[0].idType, 'variable-aggregation');
  assert.equal(result[0].nodes[0].data.icon, icon);
});
