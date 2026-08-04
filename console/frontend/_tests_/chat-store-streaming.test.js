import assert from 'node:assert/strict';
import test from 'node:test';

import useChatStore from '../src/store/chat-store.ts';
import { shouldIgnoreChatStreamCallback } from '../src/hooks/chat-stream-guard.ts';

const event = (seq, type, extra = {}) => ({
  version: 1,
  runId: 'run-1',
  seq,
  type,
  turnId: 'turn-1',
  ...extra,
});

test('cancelled published chat rejects late text and structured events', () => {
  const store = useChatStore.getState();
  store.initChatStore();
  store.startStreamingMessage({ message: '', reqType: 'BOT' });
  store.applyAgentStreamEvent(
    event(1, 'segment_start', {
      segmentId: 'segment-1',
      source: 'text',
      channel: 'pending',
    })
  );
  store.applyAgentStreamEvent(
    event(2, 'segment_delta', { segmentId: 'segment-1', delta: 'partial' })
  );
  store.updateStreamingMessage('partial');
  store.finalizeAgentStream('cancelled');
  store.finishStreamingMessage(undefined, undefined, 'cancelled');

  const settled = useChatStore.getState().messageList.at(-1);
  assert.equal(settled?.streamStatus, 'cancelled');
  assert.equal(settled?.message, 'partial');

  useChatStore.getState().updateStreamingMessage('late text');
  useChatStore
    .getState()
    .applyAgentStreamEvent(
      event(3, 'segment_delta', { segmentId: 'segment-1', delta: ' late' })
    );

  const afterLateEvents = useChatStore.getState().messageList.at(-1);
  assert.equal(afterLateEvents, settled);
  assert.equal(afterLateEvents?.message, 'partial');
});

test('aborted queued SSE callback is rejected before ancillary side effects', () => {
  const controller = new AbortController();
  let streamId = '';
  let reasoning = '';
  controller.abort('用户停止');

  if (!shouldIgnoreChatStreamCallback(false, controller.signal)) {
    streamId = 'late-stream-id';
    reasoning = 'late reasoning';
  }

  assert.equal(streamId, '');
  assert.equal(reasoning, '');
  assert.equal(
    shouldIgnoreChatStreamCallback(true, new AbortController().signal),
    true
  );
  assert.equal(
    shouldIgnoreChatStreamCallback(false, new AbortController().signal),
    false
  );
});

test('failed chat stream preserves the server diagnostic reason', () => {
  const store = useChatStore.getState();
  store.initChatStore();
  store.startStreamingMessage({ message: '', reqType: 'BOT' });
  store.finishStreamingMessage(
    'sid-1',
    11,
    'error',
    '未查询到对应的工作流版本'
  );

  const failed = useChatStore.getState().messageList.at(-1);
  assert.equal(failed?.streamStatus, 'error');
  assert.equal(failed?.errorMessage, '未查询到对应的工作流版本');
});
