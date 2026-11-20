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

const input = tag => props =>
  React.createElement(tag, {
    type: props.type,
    value: props.value,
    onChange: props.onChange,
    step: props.step,
    placeholder: props.placeholder,
  });
const Input = input('input');
Input.TextArea = input('textarea');
const antd = {
  Input,
  Button: ({ children, htmlType, onClick }) =>
    React.createElement(
      'button',
      { type: htmlType || 'button', onClick },
      children
    ),
  Modal: ({ children, onCancel }) =>
    React.createElement(
      'div',
      { role: 'dialog' },
      children,
      React.createElement(
        'button',
        { onClick: onCancel, 'aria-label': 'Close dialog' },
        'Close dialog'
      )
    ),
  Alert: ({ message }) =>
    React.createElement('div', { role: 'alert' }, message),
};
const helpers = load('http-config.ts');
const Dialog = load('parameter-options-dialog.tsx', {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  antd,
  './http-config': helpers,
}).default;

const renderers = [];
test.afterEach(() =>
  act(() => renderers.splice(0).forEach(renderer => renderer.unmount()))
);
function dialog(schema, description = 'Original description') {
  const saves = [];
  let cancellations = 0;
  let renderer;
  act(() => {
    renderer = create(
      React.createElement(Dialog, {
        name: 'limit',
        schema,
        description,
        onSave: (next, text) => saves.push({ schema: next, description: text }),
        onCancel: () => cancellations++,
      })
    );
  });
  renderers.push(renderer);
  return {
    root: renderer.root,
    saves,
    cancellations: () => cancellations,
    change: (tag, value) =>
      act(() =>
        renderer.root.findByType(tag).props.onChange({ target: { value } })
      ),
    submit: () =>
      act(() =>
        renderer.root
          .findByType('form')
          .props.onSubmit({ preventDefault() {}, stopPropagation() {} })
      ),
    cancel: () =>
      act(() =>
        renderer.root
          .findAllByType('button')
          .find(node => node.children.join('') === '取消')
          .props.onClick()
      ),
  };
}

test('cancel discards edited description and default without calling onSave', () => {
  const schema = { type: 'integer', default: 10, minimum: 0 };
  const app = dialog(schema);
  app.change('textarea', 'Unsaved description');
  app.change('input', '20');
  app.cancel();
  assert.deepEqual(app.saves, []);
  assert.equal(app.cancellations(), 1);
  assert.deepEqual(schema, { type: 'integer', default: 10, minimum: 0 });
});

test('apply commits a typed integer and description while preserving schema metadata', () => {
  const schema = {
    type: 'integer',
    default: 10,
    minimum: 0,
    maximum: 100,
    'x-owned': 'keep',
  };
  const app = dialog(schema);
  app.change('textarea', 'Page size');
  app.change('input', '0');
  app.submit();
  assert.deepEqual(app.saves, [
    { schema: { ...schema, default: 0 }, description: 'Page size' },
  ]);
  assert.equal(app.cancellations(), 0);
  assert.equal(schema.default, 10);
});

test('boolean selection commits false as a boolean and preserves metadata', () => {
  const schema = {
    type: 'boolean',
    default: true,
    enum: [true, false],
    'x-owned': 'keep',
  };
  const app = dialog(schema);
  app.change('select', 'false');
  app.submit();
  assert.deepEqual(app.saves[0].schema, { ...schema, default: false });
  assert.equal(typeof app.saves[0].schema.default, 'boolean');
});

test('invalid integer shows an error without submitting and a corrected value can apply', () => {
  const app = dialog({ type: 'integer', default: 2 });
  app.change('input', '1.5');
  app.submit();
  assert.deepEqual(app.saves, []);
  const alert = app.root.findByProps({ role: 'alert' });
  assert.match(alert.children.join(''), /有效数字/);
  app.change('input', '3');
  assert.equal(app.root.findAllByProps({ role: 'alert' }).length, 0);
  app.submit();
  assert.equal(app.saves[0].schema.default, 3);
});

test('complex and referenced defaults stay untouched when their description changes', () => {
  for (const schema of [
    {
      $ref: '#/components/schemas/Options',
      default: { enabled: false },
      'x-owned': 'keep',
    },
    {
      type: 'object',
      default: { enabled: false },
      properties: { enabled: { type: 'boolean' } },
    },
    { type: 'array', default: [0, 1], items: { type: 'integer' } },
  ]) {
    const app = dialog(schema);
    assert.equal(app.root.findAllByType('input').length, 0);
    assert.equal(app.root.findAllByType('select').length, 0);
    app.change('textarea', 'Updated description');
    app.submit();
    assert.equal(app.saves[0].schema, schema);
    assert.equal(app.saves[0].description, 'Updated description');
  }
});

test('an untouched empty string default is retained and clearing a numeric default removes only the default', () => {
  const textSchema = { type: 'string', default: '', minLength: 0 };
  const textDialog = dialog(textSchema);
  textDialog.submit();
  assert.equal(textDialog.saves[0].schema, textSchema);
  const numeric = dialog({ type: 'number', default: 0, minimum: 0 });
  numeric.change('input', '');
  numeric.submit();
  assert.deepEqual(numeric.saves[0].schema, { type: 'number', minimum: 0 });
});
