import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('./keyboard-shortcuts.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const exports = {};
class DomElement {
  constructor({
    canvas = false,
    control = false,
    editable = false,
    roleButton = null,
    node = false,
  } = {}) {
    this.canvas = canvas;
    this.control = control;
    this.isContentEditable = editable;
    this.roleButton = roleButton;
    this.node = node;
  }
  closest(selector) {
    if (selector === '[data-workflow-canvas]') return this.canvas ? this : null;
    if (selector === '[role="button"]') return this.roleButton;
    // Both native controls and role buttons were formerly caught by one query.
    return this.control ||
      (selector.includes('[role="button"]') && this.roleButton)
      ? this
      : null;
  }
  matches(selector) {
    return selector === '.react-flow__node' && this.node;
  }
}
class Element extends DomElement {}
class SvgElement extends DomElement {}
new Function('exports', 'Element', 'HTMLElement', source)(
  exports,
  DomElement,
  Element
);
const ignore = target => exports.shouldIgnoreWorkflowShortcut({ target });

test('delete shortcuts belong only to the focused canvas', () => {
  assert.equal(
    ignore(new Element()),
    true,
    'inspector whitespace must preserve selected node'
  );
  assert.equal(ignore(new Element({ canvas: true })), false);
  assert.equal(
    ignore(new Element({ canvas: true, control: true })),
    true,
    'buttons, dialogs and form fields are excluded'
  );
  assert.equal(ignore(new Element({ canvas: true, editable: true })), true);
  assert.equal(ignore(null), true);
});

test('a focused React Flow role-button node keeps canvas shortcuts without enabling its nested controls', () => {
  const node = new Element({ canvas: true, node: true });
  node.roleButton = node;
  const label = new Element({ canvas: true, roleButton: node });
  const nestedAction = new Element({ canvas: true });
  nestedAction.roleButton = nestedAction;
  const nativeButton = new Element({
    canvas: true,
    control: true,
    roleButton: node,
  });
  assert.equal(ignore(node), false);
  assert.equal(ignore(label), false);
  assert.equal(ignore(nestedAction), true);
  assert.equal(ignore(nativeButton), true);

  const scope = exports.createWorkflowShortcutScope();
  scope.trackInteraction({ target: label });
  assert.equal(scope.shouldIgnore({ target: node }), false);
  scope.trackInteraction({ target: new Element() });
  assert.equal(scope.shouldIgnore({ target: node }), true);
  scope.trackInteraction({ target: nativeButton });
  assert.equal(scope.shouldIgnore({ target: node }), true);
});

test('inspector or popup whitespace revokes canvas shortcuts even when DOM focus stays on canvas', () => {
  const scope = exports.createWorkflowShortcutScope();
  const canvas = new Element({ canvas: true });
  const keyboardEvent = { target: canvas };
  scope.trackInteraction({ target: canvas });
  assert.equal(scope.shouldIgnore(keyboardEvent), false);

  // Clicking a non-focusable surface can leave the keyboard event target unchanged.
  scope.trackInteraction({ target: new Element() });
  assert.equal(scope.shouldIgnore(keyboardEvent), true);
  scope.trackInteraction({ target: canvas });
  assert.equal(scope.shouldIgnore(keyboardEvent), false);
  scope.trackInteraction({
    target: new Element({ canvas: true, control: true }),
  });
  assert.equal(scope.shouldIgnore(keyboardEvent), true);

  // Keyboard navigation back into the canvas also restores its shortcuts.
  scope.trackInteraction({ target: canvas });
  assert.equal(scope.shouldIgnore(keyboardEvent), false);
});

test('clicking SVG paths on an already focused node keeps its canvas scope but not nested actions', () => {
  const node = new Element({ canvas: true, node: true });
  node.roleButton = node;
  const path = new SvgElement({ canvas: true, roleButton: node });
  const action = new Element({ canvas: true });
  action.roleButton = action;
  const actionPath = new SvgElement({ canvas: true, roleButton: action });
  const scope = exports.createWorkflowShortcutScope();

  scope.trackInteraction({ target: node });
  scope.trackInteraction({ target: path });
  assert.equal(scope.shouldIgnore({ target: node }), false);
  scope.trackInteraction({ target: actionPath });
  assert.equal(scope.shouldIgnore({ target: node }), true);
  scope.trackInteraction({ target: new SvgElement() });
  assert.equal(scope.shouldIgnore({ target: node }), true);
});
