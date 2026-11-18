import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('./keyboard-shortcuts.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const exports = {};
class Element {
  constructor({ canvas = false, control = false, editable = false } = {}) {
    this.canvas = canvas;
    this.control = control;
    this.isContentEditable = editable;
  }
  closest(selector) {
    return (selector === '[data-workflow-canvas]' ? this.canvas : this.control)
      ? this
      : null;
  }
}
new Function('exports', 'HTMLElement', source)(exports, Element);
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
