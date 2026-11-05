import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture(validateFields, createApplication) {
  const source = readFileSync(
    new URL(
      '../src/pages/bot-api/components/create-application.tsx',
      import.meta.url
    ),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const dependencies = {
    react: {
      useRef: value => ({ current: value }),
      useState: value => [value, () => {}],
    },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    antd: {
      Alert: 'alert',
      Modal: 'modal',
      Form: { useForm: () => [{ validateFields }], Item: 'item' },
      Input: { TextArea: 'textarea' },
    },
    uuid: { v4: () => 'create-request-id' },
    '@/services/published-api': { createApplication },
    '@/pages/agents/errors': { errorText: error => error.message },
  };
  const exports = {};
  new Function('require', 'exports', compiled)(id => {
    assert.ok(Object.hasOwn(dependencies, id), `unexpected import ${id}`);
    return dependencies[id];
  }, exports);
  const created = [];
  const modal = exports.default({
    onClose() {},
    onCreated: id => created.push(id),
  });
  return { submit: modal.props.onOk, created };
}

test('rapid create clicks while validation waits create one application', async () => {
  let finishValidation;
  let validations = 0;
  const requests = [];
  const f = fixture(
    () => {
      validations += 1;
      return new Promise(resolve => {
        finishValidation = resolve;
      });
    },
    async body => {
      requests.push(body);
      return { appId: 'app-1' };
    }
  );
  f.submit();
  f.submit();
  assert.equal(validations, 1);
  finishValidation({ appName: '  App  ', appDescribe: 'description' });
  await settle();
  assert.deepEqual(requests, [
    {
      appName: 'App',
      appDescribe: 'description',
      requestId: 'create-request-id',
    },
  ]);
  assert.deepEqual(f.created, ['app-1']);
});

test('invalid form permits correction and a failed request retries with the same identity', async () => {
  let validations = 0;
  const requests = [];
  const f = fixture(
    async () => {
      if (++validations === 1) throw new Error('required field');
      return { appName: 'App' };
    },
    async body => {
      requests.push(body);
      if (requests.length === 1) throw new Error('response lost');
      return { appId: 'app-1' };
    }
  );
  f.submit();
  await settle();
  assert.equal(requests.length, 0);
  f.submit();
  await settle();
  assert.deepEqual(f.created, []);
  f.submit();
  await settle();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].requestId, requests[1].requestId);
  assert.deepEqual(f.created, ['app-1']);
});
