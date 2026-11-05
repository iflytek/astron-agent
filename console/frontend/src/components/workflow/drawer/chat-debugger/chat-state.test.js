import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(
  new URL('./chat-state.ts', import.meta.url),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const {
  appendChatReply,
  createStartInputInitializer,
  finishFileUpload,
  isStartInputValue,
  readConfigObject,
} = exports;

test('start inputs initialize after opening or delayed graph loading', () => {
  const initialize = createStartInputInitializer();
  const outputs = [{ name: 'question', schema: { type: 'string' } }];
  assert.equal(initialize(false, 'flow', outputs), false);
  assert.equal(initialize(true, 'flow', undefined), false);
  assert.equal(initialize(true, 'flow', outputs), true);
  assert.equal(initialize(false, 'flow', outputs), false);
  assert.equal(initialize(true, 'flow', outputs), true);
});

test('runtime clones preserve edited inputs while flow and parameter changes reset them', () => {
  const initialize = createStartInputInitializer();
  const outputs = [{ name: 'question', schema: { type: 'string' } }];
  assert.equal(initialize(true, 'flow', outputs), true);
  assert.equal(initialize(true, 'flow', structuredClone(outputs)), false);
  assert.equal(initialize(true, 'other-flow', outputs), true);
  assert.equal(
    initialize(true, 'other-flow', [...outputs, { name: 'extra' }]),
    true
  );
});

const createFileParam = () => ({
  name: 'attachment',
  type: 'array-string',
  fileType: 'file',
  required: true,
  default: [
    { id: 'first', name: 'first.pdf', size: 10, url: '', loading: true },
    { id: 'second', name: 'second.pdf', size: 20, url: '', loading: true },
  ],
  validationSchema: null,
  errorMsg: '',
  originErrorMsg: '',
});

test('streaming after chat deletion does not access a missing message', () => {
  const chats = [];
  assert.equal(appendChatReply(chats, 'content', 'late chunk'), chats);
});

test('streaming initializes the selected channel and preserves the previous state', () => {
  const previous = [
    { id: 'answer', type: 'answer', reasoningContent: 'reason' },
  ];
  const next = appendChatReply(previous, 'content', 'hello');
  assert.equal(next[0].content, 'hello');
  assert.equal(next[0].reasoningContent, 'reason');
  assert.equal(previous[0].content, undefined);
  assert.equal(
    appendChatReply(next, 'content', ' world')[0].content,
    'hello world'
  );
});

test('upload completion requires a successful response containing a nonempty URL', () => {
  const previous = [createFileParam()];
  for (const response of [
    null,
    {},
    { code: 1, data: ['url'] },
    { code: 0, data: [] },
    { code: 0, data: [''] },
    { code: 0, data: [false] },
  ]) {
    assert.equal(finishFileUpload(previous, 0, 'first', response), previous);
    assert.equal(previous[0].default[0].loading, true);
  }
});

test('a successful upload updates its file only without changing earlier state', () => {
  const previous = [createFileParam()];
  const next = finishFileUpload(previous, 0, 'second', {
    code: 0,
    data: ['https://example.test/file'],
  });
  assert.deepEqual(next[0].default[0], previous[0].default[0]);
  assert.equal(next[0].default[1].url, 'https://example.test/file');
  assert.equal(next[0].default[1].loading, false);
  assert.equal(previous[0].default[1].loading, true);
  assert.equal(previous[0].default[1].url, '');
});

test('late uploads cannot recreate a deleted input or file', () => {
  const response = { code: 0, data: ['https://example.test/file'] };
  assert.deepEqual(finishFileUpload([], 0, 'first', response), []);
  const previous = [createFileParam()];
  const next = finishFileUpload(previous, 0, 'deleted', response);
  assert.equal(next[0], previous[0]);
});

test('chat input defaults retain supported scalars and files but reject arbitrary editor objects', () => {
  for (const value of ['', false, 0, [], ['one'], createFileParam().default]) {
    assert.equal(isStartInputValue(value), true);
  }
  for (const value of [
    null,
    undefined,
    { nested: true },
    [1],
    ['one', { url: 'file' }],
  ]) {
    assert.equal(isStartInputValue(value), false);
  }
});

test('missing, malformed and non-object persisted configurations use the empty configuration', () => {
  for (const value of [undefined, '', '{', 'null', '[]', 'true', '"text"']) {
    assert.deepEqual(readConfigObject(value), {});
  }
  assert.deepEqual(readConfigObject('{"sceneId":"avatar","sceneEnable":1}'), {
    sceneId: 'avatar',
    sceneEnable: 1,
  });
});
