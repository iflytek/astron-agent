import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSseWithContext } from '../src/utils/sse-request.ts';

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
};
globalThis.window = {
  clearTimeout,
  setTimeout,
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
        headers: new Headers(init?.headers),
      };

      return new Response('data: {}\n\n', {
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
