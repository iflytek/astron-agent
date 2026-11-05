import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {
  avatarHarness,
  deferred,
  eventTarget,
  tick,
} from './helpers/avatar-lifecycle-harness.js';
import { readConfigObject } from '../src/components/workflow/drawer/chat-debugger/chat-state.ts';
const noop = () => {};
const options = id => ({
  sdkAvatarInfo: { avatar_id: id },
  sdkTTSInfo: { vcn: `voice-${id}` },
});
const readyConfig = { sparkVirtualManAppId: 'test-app' };
function debuggerCallback(select, scope) {
  const path = '../src/components/workflow/drawer/chat-debugger/index.tsx';
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let expression;
  function visit(node) {
    expression ??= select(node);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(expression);
  const code = ts.transpileModule(
    `export const actual = ${expression.getText(tree)};`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }
  ).outputText;
  const exports = {};
  new Function(...Object.keys(scope), 'exports', code)(
    ...Object.values(scope),
    exports
  );
  return exports.actual;
}
function debuggerCaller(sdk) {
  const ui = { error: '', loading: false, retry: 0 };
  const sdkAvatarInfo = { avatar_id: '' },
    sdkTTSInfo = { vcn: '' };
  let cleanup;
  function render(overrides = {}) {
    cleanup?.();
    const effect = debuggerCallback(
      node =>
        ts.isCallExpression(node) &&
        node.expression.getText() === 'useEffect' &&
        node.arguments[0]?.getText().includes('sdkTTSInfo.vcn =')
          ? node.arguments[0]
          : undefined,
      {
        currentFlow: { id: 42, advancedConfig: '{}' },
        talkAgentConfig: { avatarId: 'call-A', vcn: 'voice-A' },
        chatType: 'vms',
        hasVirtualScene: true,
        open: true,
        vmsInteractionCmpRef: { current: sdk.handle },
        sdkAvatarInfo,
        sdkTTSInfo,
        chatAnswer: '',
        readConfigObject,
        setAvatarError: value => {
          ui.error = value;
        },
        setLoadingVms: value => {
          ui.loading = value;
        },
        setVmsInteractiveRefStatus: sdk.state.setVmsInteractiveRefStatus,
        ...overrides,
      }
    );
    cleanup = effect();
  }
  return {
    ui,
    render,
    unmount: () => cleanup?.(),
    close: debuggerCallback(
      node =>
        ts.isVariableDeclaration(node) &&
        node.name.getText() === 'closeFunction'
          ? node.initializer
          : undefined,
      {
        clearData: noop,
        setOpen: noop,
        vmsInteractionCmpRef: { current: sdk.handle },
        sdkAvatarInfo,
        chatAnswer: '',
        setVmsInteractiveRefStatus: sdk.state.setVmsInteractiveRefStatus,
      }
    ),
    retry() {
      debuggerCallback(
        node =>
          ts.isJsxAttribute(node) &&
          node.name.getText() === 'onClick' &&
          node.initializer?.getText().includes('setAvatarRetry')
            ? node.initializer.expression
            : undefined,
        {
          setAvatarRetry: update => {
            ui.retry = update(ui.retry);
          },
        }
      )();
      render();
    },
  };
}

test('dispose while signature and runtime config are pending prevents SDK creation', async () => {
  const signature = deferred(),
    config = deferred();
  const h = avatarHarness({
    signature: () => signature.promise,
    config: () => config.promise,
  });
  const pending = h.handle.initAvatar(options('old'));
  assert.equal(h.loading.at(-1), true);
  h.handle.dispose();
  const writesAfterDispose = [h.loading.length, h.statuses.length];
  signature.resolve('test-signature');
  config.resolve(readyConfig);
  assert.equal(await pending, false);
  assert.equal(h.instances.length, 0);
  assert.equal(h.handle.instance, null);
  assert.equal(h.loading.at(-1), false);
  assert.equal(h.state.vmsInteractiveRefStatus, 'stop');
  assert.deepEqual([h.loading.length, h.statuses.length], writesAfterDispose);
  h.unmount();
});

test('reverse configuration responses only initialize the latest frozen selection', async () => {
  const a = deferred(),
    b = deferred();
  let request = 0;
  const h = avatarHarness({
    config: () => (++request === 1 ? a.promise : b.promise),
  });
  const first = h.handle.initAvatar(options('history-A'));
  const latest = h.handle.initAvatar(options('history-B'));
  b.resolve(readyConfig);
  assert.equal(await latest, true);
  a.resolve(readyConfig);
  assert.equal(await first, false);
  assert.equal(h.instances.length, 1);
  assert.equal(h.parameters[0].avatar.avatar_id, 'history-B');
  assert.equal(h.parameters[0].tts.vcn, 'voice-history-B');
  assert.equal(h.state.vmsInteractiveRef, h.instances[0]);
  h.unmount();
});

test('late start completion releases the old SDK without replacing the new ready instance', async () => {
  const startA = deferred();
  const h = avatarHarness({
    start: sdk => (sdk.index === 0 ? startA.promise : Promise.resolve()),
  });
  const first = h.handle.initAvatar(options('old-A'));
  await tick();
  assert.equal(
    h.handle.instance,
    null,
    'pending instances must not be published'
  );
  assert.equal(await h.handle.initAvatar(options('new-B')), true);
  const b = h.handle.instance;
  startA.resolve();
  assert.equal(await first, false);
  assert.equal(h.handle.instance, b);
  assert.equal(h.state.vmsInteractiveRef, b);
  assert.ok(h.instances[0].destroyCount >= 1);
  assert.ok(h.instances[0].player.stopCount >= 1);
  assert.equal(h.instances[1].destroyCount, 0);
  h.unmount();
});

for (const phase of ['configuration', 'start']) {
  test(`unmount during ${phase} invalidates pending work and removes every listener`, async () => {
    const gate = deferred();
    const h = avatarHarness(
      phase === 'configuration'
        ? { config: () => gate.promise }
        : { start: () => gate.promise }
    );
    const pending = h.handle.initAvatar(options('unmounted'));
    await tick();
    assert.equal(h.body.count(), 3);
    h.unmount();
    const writesAtUnmount = [h.loading.length, h.statuses.length];
    assert.equal(h.body.count(), 0);
    assert.equal(h.document.count(), 0);
    assert.equal(h.window.count(), 0);
    gate.resolve(readyConfig);
    assert.equal(await pending, false);
    assert.equal(h.handle.instance, null);
    assert.equal(h.state.vmsInteractiveRef, null);
    assert.deepEqual([h.loading.length, h.statuses.length], writesAtUnmount);
  });
}

for (const phase of ['signature', 'configuration', 'start']) {
  test(`${phase} rejection clears loading/resources, hides credentials and allows explicit retry`, async () => {
    let fail = true;
    const problem = () =>
      Promise.reject(new Error('wss://private?signature=secret-credential'));
    const h = avatarHarness({
      signature: () =>
        fail && phase === 'signature'
          ? problem()
          : Promise.resolve('test-signature'),
      config: () =>
        fail && phase === 'configuration'
          ? problem()
          : Promise.resolve(readyConfig),
      start: () => (fail && phase === 'start' ? problem() : Promise.resolve()),
    });
    await assert.rejects(h.handle.initAvatar(options('failed')), error => {
      assert.equal(error.message, '虚拟人连接失败，请检查配置后重试。');
      assert.equal(error.message.includes('secret'), false);
      return true;
    });
    assert.equal(h.loading.at(-1), false);
    assert.equal(h.handle.instance, null);
    assert.equal(h.state.vmsInteractiveRef, null);
    assert.equal(h.state.vmsInteractiveRefStatus, 'error');
    if (phase === 'start') assert.ok(h.instances[0].destroyCount >= 1);
    fail = false;
    assert.equal(await h.handle.initAvatar(options('retry')), true);
    assert.equal(h.handle.instance.params.avatar.avatar_id, 'retry');
    assert.equal(h.loading.at(-1), false);
    assert.equal(h.state.vmsInteractiveRefStatus, 'init');
    h.unmount();
  });
}

test('stale rejected start and player events cannot change the new attempt state', async () => {
  const oldStart = deferred();
  let blocked = 0;
  const h = avatarHarness({
    start: sdk => (sdk.index === 0 ? oldStart.promise : Promise.resolve()),
    onBlocked: () => {
      blocked++;
    },
  });
  const old = h.handle.initAvatar(options('old'));
  await tick();
  assert.equal(await h.handle.initAvatar(options('new')), true);
  const state = [
    h.loading.length,
    h.statuses.length,
    h.state.vmsInteractiveRef,
  ];
  h.instances[0].player.events.blocked();
  oldStart.reject(new Error('stale failure'));
  assert.equal(await old, false);
  assert.equal(blocked, 0);
  assert.deepEqual(
    [h.loading.length, h.statuses.length, h.state.vmsInteractiveRef],
    state
  );
  h.unmount();
  h.instances[1].player.events.blocked();
  assert.equal(blocked, 0);
});

test('each component owns its player and listeners; old unmount cannot clear another ready SDK', async () => {
  const body = eventTarget();
  const a = avatarHarness({ body });
  const b = avatarHarness({ body, state: a.state });
  await a.handle.initAvatar(options('A'));
  await b.handle.initAvatar(options('B'));
  const active = b.handle.instance;
  assert.equal(body.count(), 6);
  a.unmount();
  assert.equal(body.count(), 3);
  assert.equal(a.state.vmsInteractiveRef, active);
  assert.equal(active.destroyCount, 0);
  b.unmount();
  assert.equal(body.count(), 0);
});

test('actual debugger close invalidates a pending request even without a published instance', async () => {
  const gate = deferred();
  const h = avatarHarness({ config: () => gate.promise });
  const caller = debuggerCaller(h);
  caller.render();
  caller.close();
  gate.resolve(readyConfig);
  await tick();
  assert.equal(h.instances.length, 0);
  assert.equal(h.loading.at(-1), false);
  assert.equal(caller.ui.error, '');
  caller.unmount();
  h.unmount();
});

test('actual debugger cancels pending avatar on missing selection, text, phone and unmount', async () => {
  for (const next of [
    { talkAgentConfig: { avatarId: '', vcn: 'voice' } },
    { chatType: 'text' },
    { chatType: 'phone' },
    { open: false },
    null,
  ]) {
    const gate = deferred();
    const h = avatarHarness({ config: () => gate.promise });
    const caller = debuggerCaller(h);
    caller.render();
    if (next) caller.render(next);
    else caller.unmount();
    gate.resolve(readyConfig);
    await tick();
    assert.equal(h.instances.length, 0);
    assert.equal(h.loading.at(-1), false);
    caller.unmount();
    h.unmount();
  }
});

test('actual debugger catches SDK failure, displays a persistent error and retries successfully', async () => {
  let fail = true;
  const h = avatarHarness({
    start: () =>
      fail ? Promise.reject(new Error('private signature')) : Promise.resolve(),
  });
  const caller = debuggerCaller(h);
  caller.render();
  await tick();
  assert.equal(caller.ui.error, '虚拟人连接失败，请检查配置后重试。');
  assert.equal(h.loading.at(-1), false);
  assert.equal(h.handle.instance, null);
  fail = false;
  caller.retry();
  await tick();
  assert.equal(caller.ui.retry, 1);
  assert.equal(caller.ui.error, '');
  assert.equal(h.handle.instance.params.avatar.avatar_id, 'call-A');
  assert.equal(h.state.vmsInteractiveRefStatus, 'init');
  caller.render({ chatType: 'text' });
  assert.equal(h.handle.instance, null);
  caller.render({ chatType: 'phone' });
  assert.equal(h.handle.instance, null);
  caller.render({ chatType: 'vms' });
  await tick();
  assert.equal(h.handle.instance.params.avatar.avatar_id, 'call-A');
  caller.unmount();
  h.unmount();
});

test('SDK stream settings follow the bundled official IGlobalConfig contract', async () => {
  const h = avatarHarness();
  await h.handle.initAvatar({
    sdkAvatarInfo: {
      avatar_id: 'configured',
      stream: { protocol: 'webrtc', alpha: 0 },
    },
  });
  assert.deepEqual(h.parameters[0].stream, { protocol: 'webrtc', alpha: 0 });
  assert.equal('stream' in h.parameters[0].avatar, false);
  h.unmount();
});

function emitDebuggerAnswer(h, content) {
  debuggerCallback(
    node =>
      ts.isCallExpression(node) &&
      node.expression.getText() === 'useEffect' &&
      node.arguments[0]?.getText().includes('const responseResult = chatList')
        ? node.arguments[0]
        : undefined,
    {
      chatList: [{ type: 'answer', content }],
      vmsInteractiveRefStatus: h.state.vmsInteractiveRefStatus,
      vmsInteractionCmpRef: { current: h.handle },
      sdkTTSInfo: { vcn: 'ready-voice' },
      chatAnswer: '',
      splitSentencesBasic: () => [],
      getProcessedStr: value => value,
      isPureText: () => true,
      message: { error: assert.fail },
    }
  )();
}
function background(h) {
  h.document.visibilityState = 'hidden';
  h.document.dispatch('visibilitychange');
}
function foreground(h) {
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  h.body.dispatch('focus');
  h.body.dispatch('click');
}

test('production answer playback continues after hidden/visible/focus/click without reconnecting', async () => {
  const h = avatarHarness();
  await h.handle.initAvatar(options('ready'));
  const instance = h.handle.instance;
  emitDebuggerAnswer(h, 'answer one');
  assert.equal(instance.spoken.length, 1);
  background(h);
  assert.equal(instance.interruptCount, 1);
  foreground(h);
  await tick();
  emitDebuggerAnswer(h, 'answer two');
  assert.equal(h.state.vmsInteractiveRefStatus, 'init');
  assert.equal(h.handle.instance, instance);
  assert.equal(h.instances.length, 1);
  assert.deepEqual(
    instance.spoken.map(item => item.text),
    ['answer one', 'answer two']
  );
  h.unmount();
});

test('visibility and old resume callbacks cannot revive failed, cancelled or replaced connections', async () => {
  for (const outcome of ['failed', 'cancelled', 'replaced']) {
    const resume = deferred();
    let fail = false,
      resumeCallbacks = 0;
    const h = avatarHarness({
      resume: () => resume.promise,
      onResume: () => {
        resumeCallbacks++;
      },
      start: () =>
        fail ? Promise.reject(new Error('failed start')) : Promise.resolve(),
    });
    await h.handle.initAvatar(options('old'));
    const old = h.handle.instance;
    background(h);
    foreground(h);
    if (outcome === 'failed') {
      fail = true;
      await assert.rejects(h.handle.initAvatar(options('failed')), /连接失败/);
    } else if (outcome === 'cancelled') h.handle.dispose();
    else await h.handle.initAvatar(options('replacement'));
    const status = h.state.vmsInteractiveRefStatus;
    const active = h.handle.instance;
    resume.resolve();
    await tick();
    assert.equal(
      resumeCallbacks,
      0,
      'resume from the old player must be ignored'
    );
    background(h);
    foreground(h);
    await tick();
    assert.equal(h.state.vmsInteractiveRefStatus, status);
    assert.equal(h.handle.instance, active);
    emitDebuggerAnswer(h, 'new answer');
    assert.equal(old.spoken.length, 0);
    if (outcome === 'replaced') assert.equal(active.spoken.length, 1);
    else assert.equal(h.handle.instance, null);
    h.unmount();
  }
});

test('explicit interruption remains interrupted across visibility and player resume events', async () => {
  const h = avatarHarness();
  await h.handle.initAvatar(options('explicit'));
  h.handle.interrupt();
  background(h);
  foreground(h);
  await tick();
  assert.equal(h.state.vmsInteractiveRefStatus, 'interrupt');
  emitDebuggerAnswer(h, 'must not restart explicit interruption');
  assert.equal(h.handle.instance.spoken.length, 0);
  h.unmount();
});
