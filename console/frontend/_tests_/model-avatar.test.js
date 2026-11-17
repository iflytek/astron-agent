import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'exports', compiled)(id => {
    if (id.startsWith('@/assets/')) return id;
    const target = id.startsWith('@/')
      ? path.join(sourceRoot, id.slice(2))
      : path.resolve(path.dirname(file), id);
    return load(`${target}.ts`);
  }, exports);
  return exports;
}
const { getModelAvatar, defaultModelAvatar } = load(
  path.join(sourceRoot, 'pages/model-management/utils/model-avatar.ts')
);
const { officialProviderCatalog } = load(
  path.join(
    sourceRoot,
    'pages/model-management/utils/official-provider-catalog.ts'
  )
);
// Personal list and detail both return Model.url with llmSource=0, including
// models configured through the official supplier directory.
const savedModel = url => ({
  llmSource: 0,
  url,
  provider: 'openai',
  name: 'DeepSeek',
  domain: 'spark-x',
  icon: 'old-generic-emoji.png',
});

test('every supplier directory endpoint brands saved personal models', () => {
  for (const { endpoint, icon } of Object.values(officialProviderCatalog)) {
    assert.equal(getModelAvatar(savedModel(endpoint)), icon, endpoint);
    assert.equal(
      getModelAvatar(savedModel(`${endpoint}/chat/completions`)),
      icon
    );
  }
});

test('official Spark and explicit regional endpoints retain their brands', () => {
  const cases = [
    [
      'https://spark-api-open.xf-yun.com/v1/chat/completions',
      'common/spark.png',
    ],
    ['https://spark-openapi.cn-huabei-1.xf-yun.com/v1', 'common/spark.png'],
    [
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'custom/qwen.svg',
    ],
    ['https://dashscope-us.aliyuncs.com/compatible-mode/v1', 'custom/qwen.svg'],
    ['https://api.minimax.io/v1', 'custom/minimax.svg'],
    ['https://api.moonshot.ai/v1', 'custom/moonshot.svg'],
    ['https://api.z.ai/api/paas/v4', 'custom/zhipu.svg'],
  ];
  for (const [endpoint, icon] of cases) {
    assert.ok(getModelAvatar(savedModel(endpoint)).endsWith(icon), endpoint);
  }
});

test('URL parsing matches hostname exactly, independently of path and case', () => {
  const expected = officialProviderCatalog.deepseek.icon;
  assert.equal(
    getModelAvatar(savedModel('https://API.DEEPSEEK.COM:443/v1')),
    expected
  );
  for (const endpoint of [
    'https://api.deepseek.com.evil.example/v1',
    'https://fake-api.deepseek.com/v1',
    'https://api.deepseek.com@evil.example/v1',
    'https://evil.example/api.deepseek.com/v1',
    'https://evil.example/?endpoint=https://api.deepseek.com',
    'https://gateway.example/v1',
    'https://localhost/v1',
    'api.deepseek.com/v1',
    'javascript://api.deepseek.com/v1',
    '',
    null,
    undefined,
  ]) {
    assert.equal(
      getModelAvatar(savedModel(endpoint)),
      defaultModelAvatar,
      String(endpoint)
    );
  }
});

test('legacy official rows preserve their supplied image and brand fallback', () => {
  assert.equal(
    getModelAvatar({ llmSource: 1, icon: 'official.svg' }),
    'official.svg'
  );
  assert.equal(
    getModelAvatar({
      llmSource: 1,
      categoryTree: [
        {
          key: 'modelProvider',
          name: '供应商',
          children: [{ key: 'qwen', name: '千问' }],
        },
      ],
    }),
    officialProviderCatalog.qwen.icon
  );
  assert.equal(getModelAvatar(null), defaultModelAvatar);
});
