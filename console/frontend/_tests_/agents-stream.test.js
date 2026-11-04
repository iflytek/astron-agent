import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, deps = {}) {
  const source = readFileSync(
    new URL(`../src/${path}`, import.meta.url),
    'utf8'
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => deps[name], exports);
  return exports;
}
const { reduceRun, interruptRun } = load('pages/agents/run-state.ts');
const initial = () => ({
  id: 'pending',
  question: 'hello',
  answer: '',
  reasoning: '',
  status: 'running',
  events: [],
});

test('tool and retrieval failures preserve partial text and failed terminal status', () => {
  let run = reduceRun(initial(), {
    type: 'delta',
    data: { content: 'Partial ', reasoningContent: 'Thinking' },
  });
  run = reduceRun(run, {
    type: 'tool',
    data: {
      id: 'tool-1',
      function: { response: { code: 1, message: 'Tool unavailable' } },
    },
  });
  run = reduceRun(run, {
    type: 'knowledge',
    data: { references: [{ title: 'Document' }] },
  });
  run = reduceRun(run, {
    type: 'error',
    data: { message: 'Retrieval failed' },
  });
  run = reduceRun(run, {
    type: 'end',
    data: { id: 'run-1', status: 'failed' },
  });
  assert.equal(run.answer, 'Partial ');
  assert.equal(run.reasoning, 'Thinking');
  assert.equal(run.events.length, 3);
  assert.equal(run.status, 'failed');
});

test('disconnect preserves received output and cannot overwrite completed run', () => {
  const partial = reduceRun(initial(), {
    type: 'delta',
    data: { content: 'Retained' },
  });
  const interrupted = interruptRun(partial, 'Disconnected');
  assert.equal(interrupted.answer, 'Retained');
  assert.equal(interrupted.status, 'interrupted');
  const completed = reduceRun(partial, {
    type: 'end',
    data: { status: 'completed' },
  });
  assert.equal(interruptRun(completed, 'late error'), completed);
});

function streamHarness() {
  const scope = { spaceId: '5', spaceType: 'personal', enterpriseId: '' };
  let options;
  let resolve;
  const pending = new Promise(done => {
    resolve = done;
  });
  const api = load('services/agents.ts', {
    '@/utils/http': { getLanguageCode: () => 'zh' },
    '@/store/space-store': { getState: () => scope },
    '@/utils/sse-request': {
      fetchSseWithContext: async (_url, config) => {
        options = config;
        await pending;
      },
    },
  });
  return {
    api,
    scope,
    get options() {
      return options;
    },
    resolve,
  };
}

test('SSE validates HTTP response, disables retry and rejects missing terminal event', async () => {
  const harness = streamHarness();
  const result = harness.api.streamAgentRun(
    7,
    'session',
    { message: 'hello' },
    {},
    new AbortController().signal
  );
  const options = harness.options;
  await assert.rejects(
    options.onopen(new Response('{}', { status: 403 })),
    /403/
  );
  await assert.rejects(
    options.onopen(new Response('{}', { status: 200 })),
    /content type/
  );
  assert.doesNotThrow(() => options.onmessage({ event: '', data: '' }));
  assert.throws(() => options.onclose(), /before end/);
  assert.throws(() => options.onerror(new Error('network')), /network/);
  harness.scope.spaceId = 'different-space';
  assert.equal(options.getContext().spaceId, '5');
  options.onmessage({
    event: 'end',
    data: JSON.stringify({ id: 'r', status: 'cancelled' }),
  });
  assert.doesNotThrow(() => options.onclose());
  harness.resolve();
  await result;
});

test('legacy history attachments cannot be downloaded or automatically reused', () => {
  const { isFileAvailable, inputFiles, needsFileUpload } = load(
    'pages/agents/files.ts'
  );
  const legacy = {
    id: 'legacy-file-1',
    name: 'original.pdf',
    size: 42,
    legacy: true,
    available: false,
  };
  const upload = { id: 'uploaded-file', name: 'new.pdf', direction: 'input' };
  const output = { id: 'output-file', name: 'report.txt', direction: 'output' };
  assert.equal(isFileAvailable(legacy), false);
  assert.equal(
    isFileAvailable({ ...legacy, legacy: false, available: true }),
    false
  );
  assert.equal(isFileAvailable({ ...upload, available: false }), false);
  assert.equal(isFileAvailable(upload), true);
  assert.equal(needsFileUpload({ files: [legacy, output] }), true);
  assert.equal(needsFileUpload({ files: [upload, output] }), false);
  assert.deepEqual(inputFiles({ files: [upload, output] }), [upload]);
});

test('ordinary agent edits omit resource references and explicit MCP clearing sends an empty selection', () => {
  const { buildAgentResourceUpdate } = streamHarness().api;
  // Public selections cannot represent every legacy binding/version. Never write them back implicitly.
  const draft = {
    tools: [11],
    skills: [22],
    mcpServerIds: [],
    repoIds: [],
    configuredMcpCount: 2,
  };
  assert.deepEqual(buildAgentResourceUpdate(draft, {}), {});
  assert.deepEqual(buildAgentResourceUpdate(draft, { mcpServerIds: true }), {
    mcpServerIds: [],
  });
  assert.deepEqual(buildAgentResourceUpdate(draft, { tools: true }), {
    tools: [11],
  });
  assert.deepEqual(buildAgentResourceUpdate(draft, { skills: true }), {
    skills: [22],
  });
  assert.deepEqual(buildAgentResourceUpdate(draft, { repoIds: true }), {
    repoIds: [],
  });
  assert.deepEqual(
    buildAgentResourceUpdate(
      { ...draft, mcpServerIds: [33] },
      { mcpServerIds: true }
    ),
    { mcpServerIds: [33] }
  );
  // A successful save/reset or undo omits the field again, rather than repeatedly replacing bindings.
  assert.deepEqual(
    buildAgentResourceUpdate(draft, {
      tools: false,
      skills: false,
      mcpServerIds: false,
      repoIds: false,
    }),
    {}
  );
});
