import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
const { outputText } = ts.transpileModule(
  readFileSync(
    new URL(
      '../src/pages/resource-management/resource-tools/connection-parameters.tsx',
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
const Input = React.forwardRef((props, ref) => {
  const native = React.useRef({
    message: '',
    setCustomValidity(message) {
      this.message = message;
    },
  });
  React.useImperativeHandle(ref, () => ({ input: native.current }));
  return React.createElement('input', {
    ...props,
    'data-native': native.current,
  });
});
Input.Password = Input;
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)(
  key =>
    ({
      react: React,
      'react/jsx-runtime': jsxRuntime,
      antd: { Input },
      '@ant-design/icons': {
        DeleteOutlined: () => null,
        PlusOutlined: () => null,
      },
    })[key],
  module,
  module.exports
);
const ConnectionParameters = module.exports.default;

test('MCP masked credentials retain their original key and new rows must provide a real value', () => {
  let renderer;
  let result;
  function App() {
    const [value, setValue] = React.useState('{"API_KEY":"******"}');
    result = JSON.parse(value);
    return React.createElement(ConnectionParameters, {
      value,
      onChange: setValue,
    });
  }
  act(() => {
    renderer = create(React.createElement(App));
  });
  const root = renderer.root;
  assert.equal(
    root.findByProps({ 'aria-label': '环境参数名' }).props.readOnly,
    true
  );
  act(() => root.findByProps({ 'aria-label': '添加环境参数' }).props.onClick());
  const name = root.findAllByProps({ 'aria-label': '环境参数名' }).at(-1);
  act(() => name.props.onChange({ target: { value: 'TOKEN' } }));
  const token = root.findByProps({ 'aria-label': 'TOKEN的值' });
  act(() => token.props.onChange({ target: { value: '******' } }));
  assert.match(
    root.findByProps({ 'aria-label': 'TOKEN的值' }).findByType('input').props[
      'data-native'
    ].message,
    /真实参数值/
  );
  act(() =>
    root
      .findByProps({ 'aria-label': 'TOKEN的值' })
      .props.onChange({ target: { value: 'fresh-value' } })
  );
  assert.equal(
    root.findByProps({ 'aria-label': 'TOKEN的值' }).findByType('input').props[
      'data-native'
    ].message,
    ''
  );
  assert.deepEqual(result, { API_KEY: '******', TOKEN: 'fresh-value' });
  act(() =>
    root.findByProps({ 'aria-label': '删除环境参数 API_KEY' }).props.onClick()
  );
  assert.deepEqual(result, { TOKEN: 'fresh-value' });
  act(() => renderer.unmount());
});
