import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const deferred = () => {
  let resolve;
  const promise = new Promise(yes => {
    resolve = yes;
  });
  return { promise, resolve };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const slots = [],
    effects = [],
    requests = [],
    navigations = [],
    messages = [];
  let cursor = 0,
    changes = 0;
  const react = {
    useState(value) {
      const key = cursor++;
      if (!(key in slots)) slots[key] = value;
      return [
        slots[key],
        value => {
          slots[key] = typeof value === 'function' ? value(slots[key]) : value;
        },
      ];
    },
    useRef(value) {
      const key = cursor++;
      return (slots[key] ||= { current: value });
    },
    useEffect(effect, deps) {
      const key = cursor++;
      const old = slots[key];
      if (!old || deps.some((value, index) => value !== old.deps[index])) {
        old?.cleanup?.();
        const record = { deps };
        slots[key] = record;
        effects.push(() => {
          record.cleanup = effect();
        });
      }
    },
  };
  const http = {};
  for (const method of ['post', 'delete'])
    http[method] = (...args) => {
      const request = deferred();
      requests.push({ method, args, ...request });
      return request.promise;
    };
  const deps = {
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    antd: {
      Button: 'button',
      Modal: 'modal',
      Input: 'input',
      Space: 'space',
      Alert: 'alert',
      message: { success: value => messages.push(value) },
    },
    '@/utils/http': { default: http },
    '@/pages/agents/errors': { errorText: error => error.message },
  };
  const source = readFileSync(
    new URL('../src/components/channels/wechat-binding.tsx', import.meta.url),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', 'window', compiled)(
    id => {
      assert.ok(Object.hasOwn(deps, id), `Unexpected dependency ${id}`);
      return deps[id];
    },
    exports,
    { location: { assign: value => navigations.push(value) } }
  );
  function render(botId = 1) {
    cursor = 0;
    const tree = exports.default({
      botId,
      onChanged: () => {
        changes++;
      },
    });
    effects.splice(0).forEach(effect => effect());
    return tree;
  }
  const find = (node, match) => {
    if (!node || typeof node !== 'object') return undefined;
    if (match(node)) return node;
    return [node.props?.children]
      .flat(Infinity)
      .map(child => find(child, match))
      .find(Boolean);
  };
  function prepare() {
    let tree = render();
    find(tree, node => node.type === 'input').props.onChange({
      target: { value: 'wx-qa' },
    });
    tree = render();
    return tree;
  }
  return {
    render,
    prepare,
    requests,
    navigations,
    messages,
    get changes() {
      return changes;
    },
    button: (tree, label) =>
      find(
        tree,
        node => node.type === 'button' && node.props.children === label
      ),
    modal: tree => find(tree, node => node.type === 'modal'),
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

test('closing or unmounting a pending authorization prevents late navigation and duplicate requests', async () => {
  for (const invalidate of ['close', 'unmount', 'change-object']) {
    const f = fixture(),
      tree = f.prepare();
    const click = f.button(tree, '前往微信授权').props.onClick;
    click();
    click();
    assert.equal(f.requests.length, 1);
    if (invalidate === 'close') f.modal(tree).props.onCancel();
    else if (invalidate === 'unmount') f.unmount();
    else f.render(2);
    f.requests[0].resolve({
      authUrl: 'https://mp.weixin.qq.com/authorized-qa',
    });
    await tick();
    assert.deepEqual(f.navigations, []);
  }
});

test('authorization navigates once only to the allowed WeChat origin', async () => {
  for (const [url, expected] of [
    ['https://mp.weixin.qq.com/qa', 1],
    ['https://example.com/qa', 0],
  ]) {
    const f = fixture(),
      tree = f.prepare();
    f.button(tree, '前往微信授权').props.onClick();
    f.requests[0].resolve({ authUrl: url });
    await tick();
    assert.equal(f.navigations.length, expected);
  }
});

test('successful revocation refreshes channel state even after dialog close, but never after unmount', async () => {
  for (const end of ['open', 'close', 'unmount']) {
    const f = fixture(),
      tree = f.prepare();
    const click = f.button(tree, '撤销发布').props.onClick;
    click();
    click();
    assert.equal(f.requests.length, 1);
    if (end === 'close') f.modal(tree).props.onCancel();
    if (end === 'unmount') f.unmount();
    f.requests[0].resolve({});
    await tick();
    assert.equal(f.changes, end === 'unmount' ? 0 : 1);
    assert.equal(f.messages.length, end === 'open' ? 1 : 0);
  }
});
