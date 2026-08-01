import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { fetchSseWithContext } from '../src/utils/sse-request.ts';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowChatSource = readFileSync(
  resolve(frontendRoot, 'src/components/workflow/store/flow-chat-function.ts'),
  'utf8'
);

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

test('workflow POST streams stop retries and finalize active UI state', () => {
  assert.doesNotMatch(
    workflowChatSource,
    /onerror\(\)\s*\{\s*get\(\)\.controllerRef\?\.abort\(\);\s*\}/,
    'aborting and returning from onerror still schedules the default retry'
  );
  assert.equal(
    workflowChatSource.match(/handleWorkflowSseError\(error, get/g)?.length,
    3,
    'chat, resume, and interrupt-abort POST streams must share no-retry handling'
  );
  assert.match(
    workflowChatSource,
    /get\(\)\.wsMessageStatus\s*!==\s*'end'[\s\S]*handleFlowStop\([\s\S]*throw requestError/,
    'transport failures must finalize an active workflow before rejecting'
  );
  assert.equal(
    workflowChatSource.match(/void fetchEventSource\(/g)?.length,
    3,
    'all workflow POST stream promises must be handled explicitly'
  );
  assert.equal(
    workflowChatSource.match(
      /onclose\(\) \{\s*handleWorkflowSseClose\(get\);\s*\}/g
    )?.length,
    2,
    'chat and resume streams must finalize when the connection closes early'
  );
  assert.equal(
    workflowChatSource.match(/\.catch\(\(\) => undefined\);/g)?.length,
    3,
    'expected workflow SSE rejections must not become unhandled promises'
  );
});
