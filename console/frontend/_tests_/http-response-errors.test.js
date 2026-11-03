import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import axios from 'axios';
import React from 'react';
import ts from 'typescript';
import { shouldShowRequestError } from '../src/utils/http-error.ts';

const require = createRequire(import.meta.url);

// Execute the production modules, replacing only browser/UI dependencies.
// Requests still use Axios's real HTTP adapter against a local HTTP server.
function loadModule(path, dependencies) {
  const filename = new URL(path, import.meta.url).pathname;
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const exports = {};
  runInNewContext(
    outputText,
    {
      exports,
      require: name =>
        Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
      document: { cookie: '' },
      window: { location: { pathname: '/resource/knowledge' } },
      console,
    },
    { filename }
  );
  return exports;
}

function createClient() {
  const messages = [];
  const redirects = [];
  const client = axios.create({ adapter: 'http', proxy: false });
  client.CancelToken = axios.CancelToken;
  client.isCancel = axios.isCancel;
  const state = { spaceId: '', spaceType: 'personal' };
  const message = { error: content => messages.push(content) };
  const loaded = loadModule('../src/utils/http.ts', {
    axios: client,
    './session': { ensureCsrfToken: async () => 'csrf-token' },
    antd: { message },
    '../../package.json': { version: 'test' },
    '@/locales/zh': { zh: {} },
    '@/locales/en': { en: {} },
    '@/locales/i18n': { language: 'zh', on() {} },
    '@/utils/event-bus': { emit() {} },
    '@/store/space-store': {
      getState: () => state,
      setState: update => Object.assign(state, update),
    },
    './auth': { handleLoginRedirect: () => redirects.push('login') },
  });
  return { http: loaded.default, message, messages, redirects };
}

async function startServer(t, status, payload) {
  const received = [];
  const server = createServer(async (request, response) => {
    const parts = [];
    for await (const part of request) parts.push(part);
    received.push({
      path: request.url,
      body: Buffer.concat(parts).toString(),
    });
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { url: `http://127.0.0.1:${server.address().port}`, received };
}

for (const [status, content] of [
  [400, '知识库名称不能为空'],
  [403, '无权访问该资源'],
  [502, '资源服务拒绝请求'],
]) {
  test(`HTTP ${status} preserves server message, rejects and displays once`, async t => {
    const server = await startServer(t, status, {
      code: status,
      message: content,
    });
    const { http, message, messages, redirects } = createClient();
    await assert.rejects(
      http.post(`${server.url}/repo/create-repo`, { name: 'kb' }),
      error => {
        assert.equal(error.code, status);
        assert.equal(error.message, content);
        if (shouldShowRequestError(error)) message.error(error.message);
        return true;
      }
    );
    assert.deepEqual(messages, [content]);
    assert.deepEqual(redirects, []);
    assert.equal(server.received.length, 1);
  });
}

test('HTTP 200 business failure keeps one existing global toast', async t => {
  const server = await startServer(t, 200, { code: 8125, message: '请求失败' });
  const { http, messages } = createClient();
  await assert.rejects(http.get(server.url), error => error.code === 8125);
  assert.deepEqual(messages, ['请求失败']);
});

test('HTTP 401 redirects and rejects without global or caller error toast', async t => {
  const server = await startServer(t, 401, { code: 401, message: '请登录' });
  const { http, message, messages, redirects } = createClient();
  await assert.rejects(http.get(server.url), error => {
    assert.equal(error.code, 101);
    if (shouldShowRequestError(error)) message.error(error.message);
    return true;
  });
  assert.deepEqual(messages, []);
  assert.deepEqual(redirects, ['login']);
});

test('canceled request remains the same Axios cancellation and never toasts', async () => {
  const { http, message, messages, redirects } = createClient();
  const cancellation = axios.CancelToken.source();
  cancellation.cancel('request superseded');
  await assert.rejects(
    http.get('/canceled', { cancelToken: cancellation.token }),
    error => {
      assert.equal(error, cancellation.token.reason);
      assert.ok(axios.isCancel(error));
      if (shouldShowRequestError(error)) message.error(error.message);
      return true;
    }
  );
  assert.deepEqual(messages, []);
  assert.deepEqual(redirects, []);
});

test('superseding an in-flight duplicate does not cancel the replacement or toast', async t => {
  let firstArrived;
  const arrived = new Promise(resolve => {
    firstArrived = resolve;
  });
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    if (requests === 1) {
      firstArrived();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ code: 0, data: { id: 'replacement' } }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const { http, messages } = createClient();
  const url = `http://127.0.0.1:${server.address().port}/repo/list`;
  const first = http.get(url);
  const canceled = assert.rejects(first, error => axios.isCancel(error));
  await arrived;
  const replacement = await http.get(url);
  await canceled;
  assert.equal(replacement.id, 'replacement');
  assert.deepEqual(messages, []);
});

test('knowledge create handles HTTP rejection, keeps modal open and clears loading', async t => {
  const server = await startServer(t, 502, {
    code: 502,
    message: '资源服务拒绝请求',
  });
  const { http, message, messages } = createClient();
  const navigation = [];
  const modalUpdates = [];
  const loadingUpdates = [];
  let finish;
  const finished = new Promise(resolve => {
    finish = resolve;
  });
  let stateIndex = 0;
  const form = { getFieldsValue: () => ({ name: 'loop02-kb' }) };
  const Form = Object.assign(() => null, {
    Item: () => null,
    useForm: () => [form],
  });
  const Input = Object.assign(() => null, { TextArea: () => null });
  const { CreateModal } = loadModule(
    '../src/pages/resource-management/knowledge-page/components/modal-component.tsx',
    {
      react: {
        ...React,
        useRef: () => ({ current: null }),
        useState: initial => {
          const index = stateIndex++;
          return [
            initial,
            value => {
              if (index === 3) {
                loadingUpdates.push(value);
                if (!value) finish();
              }
            },
          ];
        },
      },
      'react-router-dom': { useNavigate: () => path => navigation.push(path) },
      'react-i18next': { useTranslation: () => ({ t: key => key }) },
      antd: { Button: 'button', Form, Input, message },
      '@/services/knowledge': {
        createKnowledgeAPI: params =>
          http.post(`${server.url}/repo/create-repo`, params),
      },
      '@/utils/http-error': { shouldShowRequestError },
      '@/assets/imgs/main/icon_dialog_del.png': 'delete.png',
      '@/assets/imgs/knowledge/knowledge_version_checked.svg': 'checked.svg',
    }
  );
  const tree = CreateModal({
    setCreateModal: value => modalUpdates.push(value),
  });
  function findSubmit(node) {
    if (!React.isValidElement(node)) return undefined;
    if (node.type === 'button' && node.props.type === 'primary') return node;
    return React.Children.toArray(node.props.children)
      .map(findSubmit)
      .find(Boolean);
  }
  findSubmit(tree).props.onClick();
  await finished;
  // Give unhandled rejections a full turn to surface; node:test fails them.
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(messages, ['资源服务拒绝请求']);
  assert.deepEqual(loadingUpdates, [true, false]);
  assert.deepEqual(modalUpdates, []);
  assert.deepEqual(navigation, []);
  assert.deepEqual(JSON.parse(server.received[0].body), {
    name: 'loop02-kb',
    desc: '',
    tag: 'Ragflow-RAG',
  });
});
