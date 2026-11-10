import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = readFileSync(
    new URL(`../src/${file}`, import.meta.url),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', 'sessionStorage', compiled)(
    id => (Object.hasOwn(dependencies, id) ? dependencies[id] : require(id)),
    exports,
    { getItem: () => null, setItem() {}, removeItem() {} }
  );
  return exports;
}
const models = count =>
  Array.from({ length: count }, (_, id) => ({
    id,
    name: `Model ${id}`,
    shelfStatus: 2,
  }));
const pageData = (all, params) => ({
  records: all.slice(
    (params.page - 1) * params.pageSize,
    params.page * params.pageSize
  ),
  total: all.length,
  size: params.pageSize,
  current: params.page,
  pages: Math.ceil(all.length / params.pageSize),
});
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => {
    resolve = yes;
  });
  return { promise, resolve };
};
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const cells = [];
  let cursor = 0;
  let effects = [];
  const changed = (a, b) => !a || a.some((v, i) => !Object.is(v, b[i]));
  return {
    hooks: {
      useRef(initial) {
        const i = cursor++;
        return (cells[i] ??= { current: initial });
      },
      useCallback(fn, deps) {
        const i = cursor++;
        if (changed(cells[i]?.deps, deps)) cells[i] = { fn, deps };
        return cells[i].fn;
      },
      useEffect(fn, deps) {
        const i = cursor++;
        if (changed(cells[i]?.deps, deps))
          effects.push(() => {
            cells[i]?.cleanup?.();
            cells[i] = { deps, cleanup: fn() };
          });
      },
    },
    render(fn) {
      cursor = 0;
      effects = [];
      const result = fn();
      effects.forEach(fn => fn());
      return result;
    },
    unmount() {
      cells.forEach(cell => cell.cleanup?.());
    },
  };
}
function fixture(respond) {
  const calls = [];
  const messages = [];
  const context = {
    state: {
      searchInput: 'legacy',
      filterType: 1,
      models: [],
      checkedLeaves: [],
      error: '',
    },
    modelRequest: { current: null },
    actions: {},
  };
  for (const field of [
    'Models',
    'ShelfOffModels',
    'CategoryList',
    'Loading',
    'Error',
    'CreateModal',
    'DeleteModal',
    'CurrentEditModel',
  ]) {
    context.actions[`set${field}`] = value => {
      context.state = {
        ...context.state,
        [field[0].toLowerCase() + field.slice(1)]: value,
      };
    };
  }
  const service = load('services/model.ts', {
    '@/utils/http': {
      post: async (url, params, config) => {
        calls.push({ url, params, config });
        return respond(params, config);
      },
    },
  });
  const deps = {
    '@/services/model': service,
    '../context/model-context': { useModelContext: () => context },
    '@/types/model': load('types/model.ts'),
    antd: { message: { error: text => messages.push(text) } },
    '@/utils/http-error': load('utils/http-error.ts'),
  };
  const hook = (file, name) => {
    const h = harness();
    const module = load(`pages/model-management/hooks/${file}.ts`, {
      ...deps,
      react: h.hooks,
    });
    return {
      render: (type = 2) => h.render(() => module[name](type)),
      unmount: h.unmount,
    };
  };
  return {
    context,
    calls,
    messages,
    service,
    initializer: () => hook('use-model-initializer', 'useModelInitializer'),
    operations: () => hook('use-model-operations', 'useModelOperations'),
  };
}

test('loads all 205 models using valid pages and preserving type/filter/name', async () => {
  const all = models(205);
  const f = fixture(params => pageData(all, params));
  const filters = { type: 2, filter: 1, name: 'legacy' };
  const result = f.service.getAllModels(filters);
  filters.name = 'changed while loading';
  assert.deepEqual(await result, all);
  assert.deepEqual(
    f.calls.map(c => c.params),
    [1, 2, 3].map(page => ({
      type: 2,
      filter: 1,
      name: 'legacy',
      page,
      pageSize: 100,
    }))
  );
  assert.ok(f.calls.every(c => c.url === '/api/model/list'));
});

test('empty and exact-page lists terminate without extra requests', async () => {
  for (const count of [0, 100, 200]) {
    const all = models(count);
    const f = fixture(params => pageData(all, params));
    assert.deepEqual(await f.service.getAllModels({ type: 1, filter: 0 }), all);
    assert.equal(f.calls.length, Math.max(1, count / 100));
  }
});

test('later-page failure rejects rather than returning a partial list', async () => {
  const failure = new Error('page two unavailable');
  const f = fixture(params => {
    if (params.page === 2) throw failure;
    return pageData(models(201), params);
  });
  await assert.rejects(
    f.service.getAllModels({ type: 2, filter: 0 }),
    error => error === failure
  );
  assert.equal(f.calls.length, 2);
});

test('missing or incomplete pages cannot appear successful', async () => {
  for (const invalid of [
    undefined,
    { ...pageData(models(205), { page: 2, pageSize: 100 }), records: [] },
  ]) {
    const f = fixture(params =>
      params.page === 1 ? pageData(models(205), params) : invalid
    );
    await assert.rejects(
      f.service.getAllModels({ type: 2, filter: 0 }),
      /分页响应不完整/
    );
  }
});

test('initialization and save/delete refresh entrances all load complete lists', async () => {
  const all = models(205);
  const f = fixture(params => pageData(all, params));
  f.initializer().render();
  await settle();
  assert.deepEqual(f.context.state.models, all);
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(c => c.params.name === '' && c.params.filter === 1));
  const operations = f.operations().render();
  for (const refresh of [
    operations.refreshModels,
    operations.handleModelSaveSuccess,
    operations.handleModelDeleteSuccess,
  ]) {
    f.calls.length = 0;
    f.context.state.error = 'previous failure';
    await refresh();
    await settle();
    assert.deepEqual(f.context.state.models, all);
    assert.equal(f.calls.length, 3);
    assert.ok(f.calls.every(c => c.params.type === 2 && c.params.filter === 1));
    assert.equal(f.context.state.loading, false);
    assert.equal(f.context.state.error, '');
  }
});

test('failed refresh retains last complete list and reports local/network error', async () => {
  const f = fixture(params => {
    if (params.page === 2) throw new Error('network unavailable');
    return pageData(models(205), params);
  });
  const previous = models(2);
  f.context.state.models = previous;
  await f.operations().render().refreshModels();
  assert.equal(f.context.state.models, previous);
  assert.deepEqual(f.messages, ['network unavailable']);
  assert.equal(f.context.state.loading, false);
  assert.equal(f.context.state.error, 'network unavailable');
});

test('failed initialization retains the complete list without publishing page one or duplicating HTTP feedback', async () => {
  const f = fixture(params => {
    if (params.page === 2)
      throw { code: 502, message: 'already reported by interceptor' };
    return pageData(models(205), params);
  });
  const previous = models(2);
  f.context.state.models = previous;
  f.initializer().render();
  await settle();
  assert.equal(f.context.state.models, previous);
  assert.equal(f.context.state.error, '模型列表加载失败');
  assert.deepEqual(f.messages, []);
  assert.equal(f.context.state.loading, false);
});

test('refresh cancels older initializer and prevents late pages from replacing current results', async () => {
  const pending = deferred();
  let requested = 0;
  const current = models(3);
  const f = fixture(params =>
    ++requested === 1 ? pending.promise : pageData(current, params)
  );
  f.initializer().render();
  const signal = f.calls[0].config.signal;
  await f.operations().render().refreshModels();
  assert.equal(signal.aborted, true);
  pending.resolve(pageData(models(205), { page: 1, pageSize: 100 }));
  await settle();
  assert.deepEqual(f.context.state.models, current);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.messages, []);
});

test('filter changes and unmount cancel pending pages without stale state updates', async () => {
  for (const entry of ['initializer', 'operations']) {
    const pending = deferred();
    const f = fixture(() => pending.promise);
    const h = f[entry]();
    const first = h.render();
    if (first) void first.refreshModels();
    const signal = f.calls[0].config.signal;
    f.context.state = { ...f.context.state, filterType: 0 };
    h.render();
    assert.equal(signal.aborted, true);
    h.unmount();
    pending.resolve(pageData(models(205), { page: 1, pageSize: 100 }));
    await settle();
    assert.deepEqual(f.context.state.models, []);
    assert.equal(f.calls.length, entry === 'initializer' ? 2 : 1);
    assert.deepEqual(f.messages, []);
  }
});

test('late card refresh from an old state object cannot cancel the new filter initializer', async () => {
  const pending = deferred();
  const current = models(3);
  const f = fixture(params =>
    params.filter === 2 ? pending.promise : pageData(models(1), params)
  );
  const initializer = f.initializer();
  const operationHook = f.operations();
  initializer.render();
  const oldRefresh = operationHook.render().refreshModels;
  await settle();

  f.context.state = { ...f.context.state, filterType: 2 };
  initializer.render();
  const currentRefresh = operationHook.render().refreshModels;
  const currentSignal = f.calls.at(-1).config.signal;
  const callsBeforeLateCallback = f.calls.length;
  await oldRefresh();
  assert.equal(f.calls.length, callsBeforeLateCallback);
  assert.equal(currentSignal.aborted, false);
  assert.equal(f.context.state.loading, true);
  pending.resolve(pageData(current, { page: 1, pageSize: 100 }));
  await settle();
  assert.deepEqual(f.context.state.models, current);
  assert.equal(f.context.state.filterType, 2);

  await currentRefresh();
  assert.equal(f.calls.at(-1).params.filter, 2);
  assert.equal(f.calls.length, callsBeforeLateCallback + 1);
  assert.deepEqual(f.context.state.models, current);
});

test('a late callback after unmount does not restart loading or requests', async () => {
  const f = fixture(params => pageData(models(1), params));
  const h = f.operations();
  const operations = h.render();
  await operations.refreshModels();
  h.unmount();
  const previousState = f.context.state;
  const previousCalls = f.calls.length;
  await operations.refreshModels();
  assert.equal(f.calls.length, previousCalls);
  assert.equal(f.context.state, previousState);
  assert.equal(f.context.state.loading, false);
});
