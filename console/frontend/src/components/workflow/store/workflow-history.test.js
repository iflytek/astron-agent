import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(
  readFileSync(new URL('./workflow-history.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }
).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { readHistoryAnswer, readHistoryQuestion, workflowRetryPath } = exports;

test('retains legacy plain text and a partially completed answer', () => {
  assert.equal(readHistoryAnswer('legacy answer').content, 'legacy answer');
  assert.equal(
    readHistoryAnswer('{"content":"partial","reasoningContent":"thinking"}')
      .content,
    'partial'
  );
  assert.equal(
    readHistoryQuestion('old user input')[0].default,
    'old user input'
  );
});
test('does not mistake arbitrary JSON for a structured assistant answer', () => {
  assert.equal(readHistoryAnswer('["result"]').content, '["result"]');
  assert.equal(readHistoryAnswer('{"result":42}').content, '{"result":42}');
  assert.deepEqual(
    readHistoryQuestion(
      '[null,{"name":"x","type":"string","default":"actual"}]'
    ),
    [{ name: 'x', type: 'string', default: 'actual' }]
  );
});
test('retry always addresses a known execution rather than the current draft', () => {
  assert.equal(
    workflowRetryPath('fixed-run'),
    '/workflow/runs/fixed-run/retry'
  );
  assert.equal(workflowRetryPath('a/b'), '/workflow/runs/a%2Fb/retry');
  assert.throws(() => workflowRetryPath(undefined));
  assert.throws(() => workflowRetryPath(''));
});
