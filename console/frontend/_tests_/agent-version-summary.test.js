import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(
  new URL('../src/pages/agents/version-summary.ts', import.meta.url),
  'utf8'
);
const exports = {};
new Function(
  'exports',
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
)(exports);
const { versionPrompt, versionModel } = exports;

test('snapshot shows the structured prompt used by execution instead of stale plain text', () => {
  assert.equal(
    versionPrompt({
      promptType: 1,
      prompt: 'stale',
      promptSections: [
        { key: '任务', value: '回答问题' },
        { key: '规则', value: '简洁中文' },
      ],
    }),
    '任务\n回答问题\n规则\n简洁中文'
  );
  assert.equal(
    versionPrompt({ promptType: 1, prompt: 'fallback', promptSections: [] }),
    'fallback'
  );
  assert.equal(
    versionPrompt({
      promptType: 0,
      prompt: 'plain',
      promptSections: [{ key: 'unused', value: 'unused' }],
    }),
    'plain'
  );
});

test('snapshot model follows execution ID even if legacy model text has not changed', () => {
  const definition = { modelId: 2, model: 'old model' };
  assert.equal(
    versionModel(definition, [{ id: 2, name: 'current model' }]),
    'current model'
  );
  assert.equal(versionModel(definition, []), '模型 #2');
  assert.equal(versionModel({ model: 'legacy model' }), 'legacy model');
  assert.equal(versionModel({}), '未配置模型');
});
