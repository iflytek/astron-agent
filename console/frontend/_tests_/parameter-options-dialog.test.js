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
    ...props,
  });
const Input = input('input');
Input.TextArea = input('textarea');
const antd = {
  Input,
  Button: ({ children, htmlType, onClick, ...props }) =>
    React.createElement(
      'button',
      { ...props, type: htmlType || 'button', onClick },
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
  Tooltip: ({ children }) => children,
  Alert: ({ message }) =>
    React.createElement('div', { role: 'alert' }, message),
};
const helpers = load('http-config.ts');
const Dialog = load('parameter-options-dialog.tsx', {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  antd,
  './http-config': helpers,
  './resource-select': {
    default: ({ options, onChange, ...props }) =>
      React.createElement(
        'select',
        { ...props, onChange: event => onChange(event.target.value) },
        options.map(option =>
          React.createElement(
            'option',
            { key: option.value, value: option.value },
            option.label
          )
        )
      ),
  },
  '@ant-design/icons': { DeleteOutlined: () => null, PlusOutlined: () => null },
  './parameter-options-dialog.css': {},
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

function named(app, label, tag = 'input') {
  return app.root
    .findAllByType(tag)
    .find(node => node.props['aria-label'] === label);
}
function changeNode(node, value, checked) {
  const target = {
    value,
    checked,
    setCustomValidity(message) {
      this.validationMessage = message;
    },
    reportValidity() {},
    validity: {},
  };
  act(() => node.props.onChange({ target }));
}

test('object and array object item fields are editable without JSON and apply together', () => {
  const schema = {
    type: 'object',
    'x-owned': true,
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { count: { type: 'integer', default: 1 } },
          required: ['count'],
        },
      },
    },
  };
  const app = dialog(schema);
  changeNode(named(app, 'limit.rows[].count默认值'), '0');
  changeNode(named(app, 'limit.rows[].count说明'), '数量');
  changeNode(named(app, 'limit.rows[].count字段名'), 'total');
  app.submit();
  const result = app.saves[0].schema;
  assert.deepEqual(result.properties.rows.items.required, ['total']);
  assert.deepEqual(result.properties.rows.items.properties.total, {
    type: 'integer',
    default: 0,
    description: '数量',
  });
  assert.equal(result.properties.rows.items.additionalProperties, false);
  assert.equal(result['x-owned'], true);
  assert.equal(schema.properties.rows.items.properties.count.default, 1);
});

test('new object children and nested array types remain draft until apply, cancel discards them', () => {
  const app = dialog({ type: 'object', properties: {} });
  act(() =>
    app.root
      .findAllByType('button')
      .find(node => node.props['aria-label'] === '添加 limit 子字段')
      .props.onClick()
  );
  changeNode(named(app, 'limit.parameter1类型', 'select'), 'array');
  changeNode(named(app, 'limit.parameter1元素类型', 'select'), 'boolean');
  changeNode(named(app, 'limit.parameter1[]默认值', 'select'), 'false');
  app.submit();
  assert.deepEqual(app.saves[0].schema.properties.parameter1.items, {
    type: 'boolean',
    default: false,
  });
  const cancelled = dialog({ type: 'object', properties: {} });
  act(() =>
    cancelled.root
      .findAllByType('button')
      .find(node => node.props['aria-label'] === '添加 limit 子字段')
      .props.onClick()
  );
  cancelled.cancel();
  assert.equal(cancelled.saves.length, 0);
});
