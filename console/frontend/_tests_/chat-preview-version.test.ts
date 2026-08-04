import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkflowChatUrl,
  resolveWorkflowChatVersion,
} from '../src/hooks/chat-preview-version.ts';

test('draft preview URL uses the router version segment', () => {
  assert.equal(
    buildWorkflowChatUrl('http://localhost', 8, 'debugger'),
    'http://localhost/chat/8/debugger'
  );
});

test('named versions are encoded in the router version segment', () => {
  assert.equal(
    buildWorkflowChatUrl('http://localhost', 8, 'release 1'),
    'http://localhost/chat/8/release%201'
  );
});

test('request override wins and route version is the default', () => {
  assert.equal(resolveWorkflowChatVersion(undefined, 'debugger'), 'debugger');
  assert.equal(resolveWorkflowChatVersion('v2', 'debugger'), 'v2');
  assert.equal(resolveWorkflowChatVersion(undefined, undefined), '');
});
