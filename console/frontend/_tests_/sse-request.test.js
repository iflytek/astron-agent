import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { fetchSseWithContext } from '../src/utils/sse-request.ts';
import {
  createWorkflowSseLifecycle,
  isTerminalWorkflowSseErrorFrame,
} from '../src/components/workflow/store/workflow-sse.ts';

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
  cookie: 'astron_csrf=current-csrf-token',
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
  '/workflow/chat',
  '/workflow/resume',
];

const captureRequest = async (path, getContext, method = 'POST') => {
  let capturedRequest;

  await fetchSseWithContext(path, {
    getContext,
    method,
    openWhenHidden: true,
    onerror(error) {
      throw error;
    },
    fetch: async (input, init) => {
      capturedRequest = {
        input: input.toString(),
        method: init?.method,
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
    spaceId: '',
    spaceType: 'personal',
    enterpriseId: '',
  };
  const getContext = () => currentContext;

  currentContext = {
    languageCode: 'en-US',
    spaceId: '42',
    spaceType: 'team',
    enterpriseId: '7',
  };

  for (const path of requestPaths) {
    const request = await captureRequest(path, getContext);

    assert.equal(request.input, path);
    assert.equal(request.headers.get('accept'), 'text/event-stream');
    assert.equal(request.headers.get('accept-language'), 'en-US');
    assert.equal(request.headers.get('authorization'), null);
    assert.equal(request.headers.get('x-csrftoken'), 'current-csrf-token');
    assert.equal(request.headers.get('space-id'), '42');
    assert.equal(request.headers.get('enterprise-id'), '7');
  }
});

test('non-team SSE requests omit stale enterprise context', async () => {
  const request = await captureRequest('/chat-message/chat', () => ({
    languageCode: 'zh-CN',
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

test('a synchronous workflow business-error frame is terminal', () => {
  assert.equal(
    isTerminalWorkflowSseErrorFrame({
      code: 8129,
      message: 'Imported workflow dependency is unresolved',
    }),
    true
  );
  assert.equal(
    isTerminalWorkflowSseErrorFrame({
      code: 500,
      workflow_step: { node: { id: 'plugin::1' } },
    }),
    false
  );
  assert.equal(isTerminalWorkflowSseErrorFrame({ code: 0 }), false);
});

test('knowledge document search sends authenticated team context on its GET stream', async () => {
  const request = await captureRequest(
    '/file/search-file?repoId=91',
    () => ({
      languageCode: 'zh-CN',
      spaceId: '42',
      spaceType: 'team',
      enterpriseId: '7',
    }),
    'GET'
  );
  assert.equal(request.method, 'GET');
  assert.equal(request.headers.get('space-id'), '42');
  assert.equal(request.headers.get('enterprise-id'), '7');
  assert.equal(request.headers.get('authorization'), null);
});

test('failed knowledge stream ends instead of retrying a forbidden request', async () => {
  let calls = 0;
  await assert.rejects(
    fetchSseWithContext('/file/search-file?repoId=91', {
      getContext: () => ({
        languageCode: 'zh-CN',
        spaceId: '42',
        spaceType: 'team',
        enterpriseId: '7',
      }),
      method: 'GET',
      openWhenHidden: true,
      fetch: async () => {
        calls += 1;
        return new Response('{}', {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      },
      async onopen(response) {
        if (!response.ok) throw new Error('forbidden');
      },
      onerror(error) {
        throw error;
      },
    }),
    /forbidden/
  );
  assert.equal(calls, 1);
});
