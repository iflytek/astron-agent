import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeToolValue,
  TOOL_VALUE_LARGE_BYTES,
} from '../src/components/agent-stream/tool-value.ts';

test('large arrays stay complete while showing a summary', () => {
  const value = Array.from({ length: 3000 }, (_, index) => ({ index }));
  const description = describeToolValue(value);

  assert.equal(description.large, true);
  assert.match(description.summary, /Array · 3000 items/);
  assert.deepEqual(JSON.parse(description.serialized), value);
});

test('objects report fields and UTF-8 size', () => {
  const description = describeToolValue({ result: '你好' });
  const encodedBytes = new TextEncoder().encode(description.serialized).length;

  assert.match(description.summary, /Object · 1 field/);
  assert.equal(description.bytes, encodedBytes);
});

test('the exact byte threshold is treated as large', () => {
  const description = describeToolValue('x'.repeat(TOOL_VALUE_LARGE_BYTES));

  assert.equal(description.bytes, TOOL_VALUE_LARGE_BYTES);
  assert.equal(description.large, true);
  assert.equal(description.serialized.length, TOOL_VALUE_LARGE_BYTES);
});

test('circular values still produce a copyable fallback', () => {
  const value = { name: 'cycle' };
  value.self = value;

  const description = describeToolValue(value);

  assert.equal(typeof description.serialized, 'string');
  assert.ok(description.serialized.length > 0);
  assert.match(description.summary, /Object · 2 fields/);
});
