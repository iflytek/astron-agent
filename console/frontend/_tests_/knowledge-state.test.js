import assert from 'node:assert/strict';
import test from 'node:test';
import { commitChunkChange } from '../src/utils/knowledge-state.ts';

function state(initial) {
  let value = initial;
  return {
    get: () => value,
    set: update => {
      value = typeof update === 'function' ? update(value) : update;
    },
  };
}

test('server ID and enabled state update list and active editor only after success', async () => {
  const original = Object.freeze({
    id: 'old-id',
    enabled: false,
    content: 'text',
    index: 4,
  });
  const list = state([original]);
  const editor = state(original);
  let resolve;
  const pending = new Promise(done => {
    resolve = done;
  });
  const request = commitChunkChange(
    'old-id',
    () => pending,
    list.set,
    editor.set
  );
  assert.equal(list.get()[0], original);
  assert.equal(editor.get(), original);
  resolve({ id: 'provider-id', enabled: true, content: 'text' });
  await request;
  assert.equal(list.get()[0].id, 'provider-id');
  assert.equal(editor.get().id, 'provider-id');
  assert.equal(editor.get().index, 4);
  assert.equal(editor.get().enabled, true);
  assert.equal(original.id, 'old-id');
  assert.equal(original.enabled, false);
  // A subsequent disable/edit/delete uses the returned string ID from either view.
  const nextId = editor.get().id;
  await commitChunkChange(
    nextId,
    async () => ({ id: nextId, enabled: false }),
    list.set,
    editor.set
  );
  assert.equal(list.get()[0].enabled, false);
  assert.equal(editor.get().enabled, false);
  assert.equal(typeof nextId, 'string');
});

test('rejected toggle retains list, editor ID and enabled state', async () => {
  const original = { id: 'old-id', enabled: false, content: 'draft' };
  const list = state([original]);
  const editor = state(original);
  await assert.rejects(
    commitChunkChange(
      'old-id',
      async () => {
        throw new Error('provider failure');
      },
      list.set,
      editor.set
    ),
    /provider failure/
  );
  assert.equal(list.get()[0], original);
  assert.equal(editor.get(), original);
  assert.equal(editor.get().enabled, false);
});

test('completion preserves newer rows and a different active editor', async () => {
  const list = state([
    { id: 'old', enabled: false },
    { id: 'new-row', enabled: true },
  ]);
  const current = { id: 'another', enabled: false };
  const editor = state(current);
  await commitChunkChange(
    'old',
    async () => ({ id: 'new-id', enabled: true }),
    list.set,
    editor.set
  );
  assert.deepEqual(
    list.get().map(item => item.id),
    ['new-id', 'new-row']
  );
  assert.equal(editor.get(), current);
  const emptyEditor = state(null);
  await commitChunkChange(
    'new-id',
    async () => ({ id: 'new-id', enabled: false }),
    list.set,
    emptyEditor.set
  );
  assert.equal(emptyEditor.get(), null);
});
