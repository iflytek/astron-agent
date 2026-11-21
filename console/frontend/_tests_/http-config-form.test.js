import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';

function load(name, mocks = {}) {
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL(
        `../src/pages/resource-management/resource-tools/${name}`,
        import.meta.url
      ),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }
  );
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    key => {
      if (key in mocks) return mocks[key];
      throw new Error(key);
    },
    module,
    module.exports
  );
  return module.exports;
}
const Input = React.forwardRef((props, ref) => {
  const native = React.useRef({
    customValidity: '',
    setCustomValidity(message) {
      this.customValidity = message;
    },
    reportValidity() {
      return !this.customValidity;
    },
  });
  React.useImperativeHandle(ref, () => ({ input: native.current }));
  return React.createElement('input', {
    ...props,
    'data-native': native.current,
  });
});
Input.TextArea = props => React.createElement('textarea', props);
const helpers = load('http-config.ts');
const HttpConfigForm = load('http-config-form.tsx', {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  antd: {
    Input,
    Button: ({ children, htmlType, ...props }) =>
      React.createElement(
        'button',
        { ...props, type: htmlType || 'button' },
        children
      ),
    Tabs: () => null,
    Tooltip: ({ children }) => children,
    Alert: ({ message }) =>
      React.createElement('div', { role: 'alert' }, message),
  },
  '@ant-design/icons': {
    DeleteOutlined: () => null,
    PlusOutlined: () => null,
    EditOutlined: () => null,
  },
  './resource-select': { default: () => null },
  './http-config': helpers,
  './parameter-options-dialog': { default: () => null },
  './http-config-form.css': {},
}).default;
const renderers = [];
test.afterEach(() =>
  act(() => renderers.splice(0).forEach(renderer => renderer.unmount()))
);
function form(type = 'integer', initial = 10, body = false) {
  const schema = { type, default: initial, 'x-retained': true };
  const operation = {
    operationId: 'example',
    ...(body
      ? {
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { limit: schema } },
              },
            },
          },
        }
      : { parameters: [{ in: 'query', name: 'limit', schema }] }),
  };
  const document = {
    openapi: '3.0.3',
    servers: [{ url: 'https://example.com' }],
    paths: { '/': { get: operation } },
  };
  let renderer;
  let submitted;
  let replace;
  function App() {
    const [value, setValue] = React.useState(JSON.stringify(document));
    replace = next => setValue(JSON.stringify(next));
    return React.createElement(
      'form',
      {
        onSubmit: event => {
          event.preventDefault();
          submitted = JSON.parse(value);
        },
      },
      React.createElement(HttpConfigForm, { value, onChange: setValue })
    );
  }
  act(() => {
    renderer = create(React.createElement(App));
  });
  renderers.push(renderer);
  const label = body ? '内容 limit默认值' : 'limit默认值';
  return {
    input: () =>
      renderer.root
        .findAllByType('input')
        .find(node => node.props['aria-label'] === label),
    change(value, validity = {}) {
      const native = this.input().props['data-native'];
      Object.assign(native, { value, validity });
      act(() => this.input().props.onChange({ target: native }));
      return native.customValidity;
    },
    reportValidity() {
      return this.input().props['data-native'].reportValidity();
    },
    hasError() {
      return renderer.root.findAllByProps({ role: 'alert' }).length > 0;
    },
    submit() {
      act(() =>
        renderer.root.findByType('form').props.onSubmit({ preventDefault() {} })
      );
      const saved = submitted.paths['/'].get;
      return body
        ? saved.requestBody.content['application/json'].schema.properties.limit
        : saved.parameters[0].schema;
    },
    replaceDefault(next) {
      const copy = structuredClone(document);
      const target = body
        ? copy.paths['/'].get.requestBody.content['application/json'].schema
            .properties.limit
        : copy.paths['/'].get.parameters[0].schema;
      target.default = next;
      act(() => replace(copy));
    },
  };
}

test('Enter submission after default change without blur saves the visible value for Params and Body', () => {
  for (const body of [false, true]) {
    const app = form('integer', 10, body);
    const input = app.input();
    assert.equal(app.change('20'), '');
    assert.equal(
      app.input(),
      input,
      'typing must retain the input instance and focus'
    );
    assert.equal(app.input().props.value, '20');
    assert.deepEqual(app.submit(), {
      type: 'integer',
      default: 20,
      'x-retained': true,
    });
  }
});

test('numeric drafts stay editable without publishing invalid values or normalizing text during typing', () => {
  const app = form('integer', 10);
  const input = app.input();
  assert.match(app.change('1.5'), /有效数字/);
  assert.equal(app.input().props.value, '1.5');
  assert.equal(app.submit().default, 10);
  assert.equal(app.change('012'), '');
  assert.equal(app.input().props.value, '012');
  assert.equal(app.submit().default, 12);
  assert.equal(app.input(), input);
  assert.match(app.change('', { badInput: true }), /完整/);
  assert.equal(
    app.submit().default,
    12,
    'unfinished exponent/sign must not clear the saved default'
  );
  assert.equal(app.change('0'), '');
  assert.equal(app.submit().default, 0);
  assert.equal(app.change(''), '');
  assert.equal('default' in app.submit(), false);
});

test('external default edits update the displayed draft without remounting the input', () => {
  const app = form('string', 'before');
  const input = app.input();
  app.replaceDefault('after');
  assert.equal(app.input(), input);
  assert.equal(app.input().props.value, 'after');
  assert.equal(app.change('typed'), '');
  assert.equal(app.submit().default, 'typed');
});

test('external correction clears stale native validation after an invalid default draft', () => {
  for (const body of [false, true]) {
    const app = form('integer', 10, body);
    const input = app.input();
    assert.match(app.change('1.5'), /有效数字/);
    assert.equal(app.reportValidity(), false);
    assert.equal(app.hasError(), true);
    app.replaceDefault(20);
    assert.equal(app.input(), input, 'the same DOM input must recover');
    assert.equal(app.input().props.value, '20');
    assert.equal(app.reportValidity(), true);
    assert.equal(app.hasError(), false);
    assert.equal(app.submit().default, 20);
  }
});
