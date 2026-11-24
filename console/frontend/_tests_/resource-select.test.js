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
      '../src/pages/resource-management/resource-tools/resource-select.tsx',
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
let focused = 0;
const Select = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({ focus: () => focused++ }));
  return React.createElement('mock-select', props);
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)(
  key =>
    ({
      react: React,
      'react/jsx-runtime': jsxRuntime,
      antd: { Select },
      './resource-select.css': {},
    })[key],
  module,
  module.exports
);
const ResourceSelect = module.exports.default;

test('required resource select blocks empty form input, focuses official control and clears error after choice', () => {
  let renderer;
  let result;
  function App() {
    const [value, setValue] = React.useState('');
    result = value;
    return React.createElement(ResourceSelect, {
      required: true,
      value,
      onChange: setValue,
      options: [{ value: 'false', label: '否' }],
    });
  }
  act(() => {
    renderer = create(React.createElement(App));
  });
  const proxy = renderer.root.findByType('input');
  assert.equal(proxy.props.required, true);
  assert.equal(proxy.props.value, '');
  let prevented = false;
  act(() =>
    proxy.props.onInvalid({
      preventDefault: () => {
        prevented = true;
      },
    })
  );
  assert.equal(prevented, true);
  assert.equal(focused, 1);
  assert.equal(
    renderer.root.findByProps({ role: 'alert' }).children.join(''),
    '请选择一项'
  );
  act(() =>
    renderer.root.findByType('mock-select').props.onChange('false', {})
  );
  assert.equal(result, 'false');
  assert.equal(renderer.root.findByType('input').props.value, 'false');
  assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 0);
  act(() => renderer.unmount());
});
