import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readMcpRows,
  readParameterSummaries,
} from './agent/components/add-tool/catalog.ts';
import { databaseTableOptions } from './database/types.ts';
import { numericConstraint, readModelSettings } from './model-settings.ts';
import { changeReferencedInput, inputReference } from './types.ts';
import { mergeNodeDebugRequest } from './components/node-operation/node-debug-request.ts';

const tokenSetting = {
  key: 'max_tokens',
  name: 'Maximum tokens',
  constraintType: 'range',
  default: 1024,
  constraintContent: [{ name: '1' }, { name: '4096' }],
};

test('model config endpoint arrays are usable without an invented config envelope', () => {
  const settings = readModelSettings({
    llmSource: 2,
    serviceId: 'model-a',
    config: JSON.stringify([tokenSetting]),
  });
  assert.equal(settings.length, 1);
  assert.equal(settings[0].key, 'maxTokens');
  assert.equal(settings[0].default, 1024);
  assert.equal(numericConstraint(settings[0].constraintContent[1].name), 4096);
});

test('custom model parameter names are preserved for outbound provider requests', () => {
  const settings = readModelSettings({
    llmSource: 0,
    serviceId: 'custom',
    config: JSON.stringify([tokenSetting]),
  });
  assert.equal(settings[0].key, 'max_tokens');
  assert.equal(settings[0].name, 'max_tokens');
  assert.equal(settings[0].desc, 'Maximum tokens');
});

test('service-block model configuration retains its documented fallback', () => {
  const settings = readModelSettings({
    llmSource: 2,
    serviceId: 'not-listed',
    config: { serviceBlock: { '@@serviceId@@': [{ fields: [tokenSetting] }] } },
  });
  assert.equal(settings[0].key, 'maxTokens');
});

test('malformed model settings and non-numeric bounds cannot reach controls', () => {
  assert.deepEqual(
    readModelSettings({ llmSource: 0, serviceId: '', config: '{' }),
    []
  );
  assert.deepEqual(
    readModelSettings({
      llmSource: 0,
      serviceId: '',
      config: JSON.stringify([{ ...tokenSetting, default: {} }]),
    }),
    []
  );
  assert.equal(numericConstraint('not-a-number'), undefined);
});

test('tool parameter previews accept valid rows and reject malformed envelopes', () => {
  const valid = {
    name: 'query',
    title: 'Question',
    type: 'string',
    description: 'User input',
  };
  const result = readParameterSummaries(
    JSON.stringify({ toolRequestInput: [null, valid, { type: 9 }] })
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'query');
  assert.deepEqual(readParameterSummaries('{'), []);
  assert.deepEqual(
    readParameterSummaries(JSON.stringify({ toolRequestInput: {} })),
    []
  );
});

test('MCP server rows bind resource IDs and retain optional metadata', () => {
  const rows = readMcpRows([
    {
      id: '9007199254740993',
      name: 'Server',
      server_url: 'https://example.test/mcp',
    },
    null,
    { id: 'bad', name: 'Missing endpoint' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, '9007199254740993');
  assert.equal(rows[0].toolId, '9007199254740993');
  assert.equal(rows[0].childName, '');
});

test('database tree conversion preserves large table IDs while using names as selections', () => {
  const tables = databaseTableOptions([
    {
      value: 'database',
      label: 'Database',
      children: [
        { value: '9007199254740993', label: 'orders' },
        null,
        { value: {}, label: 'invalid' },
      ],
    },
  ]);
  assert.deepEqual(tables[0].children, [
    { id: '9007199254740993', value: 'orders', label: 'orders' },
  ]);
});

test('input reference lookup distinguishes literal arrays and updates only known IDs', () => {
  const literal = {
    id: 'input',
    name: 'input',
    schema: {
      type: 'array-number',
      value: { type: 'literal', content: [1, 2] },
    },
  };
  const reference = {
    id: 'input',
    name: 'input',
    schema: {
      type: 'string',
      value: { type: 'ref', content: { nodeId: 'source', name: 'output' } },
    },
  };
  assert.equal(inputReference(literal), undefined);
  assert.deepEqual(inputReference(reference), {
    nodeId: 'source',
    name: 'output',
  });
  const calls = [];
  const change = (id, update, value) => {
    calls.push(id);
    update(reference, value);
  };
  changeReferencedInput(
    change,
    undefined,
    (input, value) => {
      input.name = value;
    },
    'ignored'
  );
  changeReferencedInput(
    change,
    'input',
    (input, value) => {
      input.name = value;
    },
    'renamed'
  );
  assert.deepEqual(calls, ['input']);
  assert.equal(reference.name, 'renamed');
});

test('debug requests retain parsed JSON without overwriting current editor inputs', () => {
  const input = {
    id: 'input',
    name: 'latest name',
    schema: {
      type: 'object',
      value: { type: 'ref', content: { nodeId: 'source', name: 'output' } },
    },
  };
  const latestNode = { id: 'node', data: { label: 'latest', inputs: [input] } };
  for (const content of [{ nested: [false, 0] }, [1, 2], false, 0]) {
    const requestedNode = {
      ...latestNode,
      data: {
        ...latestNode.data,
        label: 'stale',
        inputs: [
          {
            ...input,
            schema: { ...input.schema, value: { type: 'literal', content } },
          },
        ],
      },
    };
    const merged = mergeNodeDebugRequest(latestNode, latestNode, requestedNode);
    assert.equal(merged.data.label, 'latest');
    assert.equal(merged.data.inputs[0].name, 'latest name');
    assert.deepEqual(merged.data.inputs[0].schema.value, {
      type: 'literal',
      content,
    });
    assert.equal(latestNode.data.inputs[0].schema.value.type, 'ref');
  }
});

test('debug requests tolerate legacy snapshots without an inputs array', () => {
  const node = { id: 'legacy', data: { label: 'legacy' } };
  assert.deepEqual(mergeNodeDebugRequest(node, node, node).data.inputs, []);
});
