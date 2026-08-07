import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { fetchSseWithContext } from '../src/utils/sse-request.ts';
import { createWorkflowSseLifecycle } from '../src/components/workflow/store/workflow-sse.ts';

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
};
globalThis.window = {
  clearTimeout: globalThis.clearTimeout,
  setTimeout: globalThis.setTimeout,
};

test.after(() => {
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

const requestPaths = [
  '/chat-message/bot-debug',
  '/chat-message/chat',
  '/chat-message/re-answer',
];

const captureRequest = async (path, getContext) => {
  let capturedRequest;

  await fetchSseWithContext(path, {
    getContext,
    method: 'POST',
    openWhenHidden: true,
    onerror(error) {
      throw error;
    },
    fetch: async (input, init) => {
      capturedRequest = {
        input: input.toString(),
        headers: new globalThis.Headers(init?.headers),
      };

      return new globalThis.Response('data: {}\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });

  assert.ok(
    capturedRequest,
    'fetchEventSource should invoke the injected fetch'
  );
  return capturedRequest;
};

test('all chat SSE requests use the latest team-space context', async () => {
  let currentContext = {
    languageCode: 'zh-CN',
    accessToken: 'old-token',
    spaceId: '',
    spaceType: 'personal',
    enterpriseId: '',
  };
  const getContext = () => currentContext;

  currentContext = {
    languageCode: 'en-US',
    accessToken: 'latest-token',
    spaceId: '42',
    spaceType: 'team',
    enterpriseId: '7',
  };

  for (const path of requestPaths) {
    const request = await captureRequest(path, getContext);

    assert.equal(request.input, path);
    assert.equal(request.headers.get('accept'), 'text/event-stream');
    assert.equal(request.headers.get('accept-language'), 'en-US');
    assert.equal(request.headers.get('authorization'), 'Bearer latest-token');
    assert.equal(request.headers.get('space-id'), '42');
    assert.equal(request.headers.get('enterprise-id'), '7');
  }
});

test('non-team SSE requests omit stale enterprise context', async () => {
  const request = await captureRequest('/chat-message/chat', () => ({
    languageCode: 'zh-CN',
    accessToken: 'test-token',
    spaceId: '42',
    spaceType: 'personal',
    enterpriseId: 'stale-enterprise',
  }));

  assert.equal(request.headers.get('space-id'), '42');
  assert.equal(request.headers.get('enterprise-id'), null);

  const requestWithoutSpace = await captureRequest(
    '/chat-message/re-answer',
    () => ({
      languageCode: 'zh-CN',
      accessToken: 'test-token',
      spaceId: '',
      spaceType: 'personal',
      enterpriseId: '',
    })
  );

  assert.equal(requestWithoutSpace.headers.get('space-id'), null);
  assert.equal(requestWithoutSpace.headers.get('enterprise-id'), null);
});

test('throwing from an SSE error callback prevents POST request replay', async () => {
  const transportError = new Error('socket closed');
  let requestCount = 0;

  await assert.rejects(
    fetchEventSource('/workflow/chat', {
      method: 'POST',
      openWhenHidden: true,
      fetch: async () => {
        requestCount += 1;
        throw transportError;
      },
      onerror(error) {
        throw error;
      },
    }),
    transportError
  );

  assert.equal(requestCount, 1);
});

test('late callbacks from a completed request cannot finalize its successor', () => {
  let activeRequest = 'request-a';
  const finalized = [];
  const handledMessages = [];
  const requestA = createWorkflowSseLifecycle({
    isCurrent: () => activeRequest === 'request-a',
    finalize: () => finalized.push('request-a'),
    handleMessage: message => {
      handledMessages.push(`request-a:${message}`);
      return message === 'terminal frame';
    },
  });

  requestA.onMessage('terminal frame');
  activeRequest = 'request-b';
  const requestB = createWorkflowSseLifecycle({
    isCurrent: () => activeRequest === 'request-b',
    finalize: () => finalized.push('request-b'),
    handleMessage: message => {
      handledMessages.push(`request-b:${message}`);
      return false;
    },
  });

  requestA.onMessage('late frame');
  requestA.onClose();
  assert.throws(() => requestA.onError(new Error('late socket error')));
  requestB.onMessage('current frame');
  assert.deepEqual(finalized, []);
  assert.deepEqual(handledMessages, [
    'request-a:terminal frame',
    'request-b:current frame',
  ]);
});

test('an active stream that closes early is finalized only once', () => {
  let finalizeCount = 0;
  const lifecycle = createWorkflowSseLifecycle({
    isCurrent: () => true,
    finalize: () => {
      finalizeCount += 1;
    },
  });

  lifecycle.onClose();
  assert.equal(finalizeCount, 1);
  assert.throws(() => lifecycle.onError(new Error('late socket error')));
  assert.equal(finalizeCount, 1);
});
