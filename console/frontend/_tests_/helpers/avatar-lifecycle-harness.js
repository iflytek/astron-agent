import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const noop = () => {};
export const tick = () => new Promise(resolve => setImmediate(resolve));
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type) {
      for (const handler of listeners.get(type) || []) handler();
    },
    count() {
      return [...listeners.values()].reduce(
        (total, entries) => total + entries.size,
        0
      );
    },
  };
}
export function avatarHarness(options = {}) {
  const instances = [],
    parameters = [],
    loading = [],
    statuses = [];
  const effects = [],
    cleanups = [];
  const body = options.body || eventTarget();
  const document = { ...eventTarget(), body, visibilityState: 'visible' };
  const window = eventTarget();
  const state = options.state || {
    vmsInteractiveRef: null,
    vmsInteractiveRefPlayer: null,
    vmsInteractiveRefStatus: '',
  };
  state.setVmsInteractiveRef ||= value => {
    state.vmsInteractiveRef = value;
  };
  state.setVmsInteractiveRefPlayer ||= value => {
    state.vmsInteractiveRefPlayer = value;
  };
  state.setVmsInteractiveRefStatus ||= value => {
    state.vmsInteractiveRefStatus = value;
    statuses.push(value);
  };
  const store = select => select(state);
  store.getState = () => state;
  const react = {
    forwardRef: render => render,
    useRef: value => ({ current: value }),
    useImperativeHandle: (ref, create) => {
      ref.current = create();
    },
    useEffect: effect => {
      effects.push(effect);
    },
  };
  class SDK {
    constructor() {
      this.index = instances.length;
      this.startCount =
        this.stopCount =
        this.destroyCount =
        this.interruptCount =
          0;
      this.spoken = [];
      this.player = {
        stopCount: 0,
        events: {},
        on(event, handler) {
          this.events[event] = handler;
        },
        stop() {
          this.stopCount++;
        },
        resume: options.resume || (() => Promise.resolve()),
      };
      instances.push(this);
    }
    setApiInfo(value) {
      this.apiInfo = value;
    }
    setGlobalParams(value) {
      this.params = structuredClone(value);
      parameters.push(this.params);
    }
    start() {
      this.startCount++;
      return options.start?.(this) || Promise.resolve();
    }
    interrupt() {
      this.interruptCount++;
      return Promise.resolve();
    }
    stop() {
      this.stopCount++;
    }
    destroy() {
      this.destroyCount++;
    }
    writeText(text, params) {
      this.spoken.push({ text, params });
      return Promise.resolve('written');
    }
  }
  const dependencies = {
    react,
    '@/utils/avatar-sdk-web_3.1.2.1002/index.js': {
      __esModule: true,
      default: SDK,
      PlayerEvents: { playNotAllowed: 'blocked' },
    },
    '@/store/chat-store': { __esModule: true, default: store },
    '@/services/spark-common': {
      getSignedUrl:
        options.signature || (() => Promise.resolve('test-signature')),
    },
    '@/services/platform-account': {
      getPlatformAccountRuntimeConfig:
        options.config ||
        (() => Promise.resolve({ sparkVirtualManAppId: 'test-app' })),
    },
  };
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        '../../src/components/vms-interaction-cmp/index.tsx',
        import.meta.url
      ),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const exports = {};
  new Function('require', 'exports', 'document', 'window', compiled)(
    name => (name in dependencies ? dependencies[name] : require(name)),
    exports,
    document,
    window
  );
  const ref = { current: null };
  exports.default(
    {
      avatarDom: {},
      loadingStatusChange: value => loading.push(value),
      playerResumeCallback: options.onResume,
      notAllowedPlayCallback: options.onBlocked,
    },
    ref
  );
  for (const effect of effects) cleanups.push(effect());
  return {
    handle: ref.current,
    instances,
    parameters,
    loading,
    statuses,
    state,
    document,
    window,
    body,
    unmount() {
      for (const cleanup of cleanups.reverse()) cleanup?.();
    },
  };
}
