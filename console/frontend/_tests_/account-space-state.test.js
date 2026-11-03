import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const src = new URL('../src/', import.meta.url).pathname;
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function fixture() {
  const storage = new Map();
  const sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const profiles = [];
  const spaces = [];
  const enterprises = [];
  const visits = [];
  const cache = new Map();
  const deps = {
    '@/services/login': {
      getUserInfoMe: () => {
        const d = deferred();
        profiles.push(d);
        return d.promise;
      },
    },
    '@/services/space': {
      getSpaceDetail: () => {
        const d = deferred();
        spaces.push(d);
        return d.promise;
      },
      visitSpace: async id => {
        visits.push(id);
      },
    },
    '@/services/enterprise': {
      getEnterpriseDetail: () => {
        const d = deferred();
        enterprises.push(d);
        return d.promise;
      },
    },
    '@/locales/localeConfig': { localeConfig: {} },
    'react-i18next': { useTranslation: () => ({ t: value => value }) },
    antd: {
      message: { error() {} },
      Select: Object.assign(() => null, { Option: () => null }),
      Spin: () => React.createElement('i', null, 'loading'),
      Button: ({ disabled, children }) =>
        React.createElement('button', { disabled }, children),
      Tooltip: ({ children }) => children,
    },
  };
  function load(relative, overrides = {}) {
    let filename = relative.startsWith('/')
      ? relative
      : path.join(src, relative);
    if (!existsSync(filename) || !statSync(filename).isFile())
      filename = ['.ts', '.tsx', '/index.ts', '/index.tsx']
        .map(ext => filename + ext)
        .find(existsSync);
    if (!filename) throw new Error(`Module not found: ${relative}`);
    if (cache.has(filename) && !Object.keys(overrides).length)
      return cache.get(filename);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const module = { exports: {} };
    if (!Object.keys(overrides).length) cache.set(filename, module.exports);
    const imports = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (Object.hasOwn(deps, id)) return deps[id];
      if (id.endsWith('.scss')) return {};
      if (id.startsWith('@/')) return load(id.slice(2));
      if (id.startsWith('.'))
        return load(path.resolve(path.dirname(filename), id));
      return require(id);
    };
    new Function('require', 'module', 'exports', 'sessionStorage', compiled)(
      imports,
      module,
      module.exports,
      sessionStorage
    );
    if (!Object.keys(overrides).length) cache.set(filename, module.exports);
    return module.exports;
  }
  // Real Zustand store actions/reducers; the selector adapter lets the hook harness
  // explicitly rerender after each controlled async response without a DOM runtime.
  const space = load('store/space-store.ts').default;
  const user = load('store/user-store.tsx').default;
  const enterprise = load('store/enterprise-store.ts').default;
  const adapter = store =>
    Object.assign(
      selector => (selector ? selector(store.getState()) : store.getState()),
      store
    );
  deps['@/store/user-store'] = adapter(user);
  deps['@/store/space-store'] = adapter(space);
  deps['@/store/enterprise-store'] = adapter(enterprise);
  const reset = load('utils/account-state.ts').resetAccountState;
  const types = load('types/permission.ts');
  return {
    load,
    user,
    space,
    enterprise,
    profiles,
    spaces,
    enterprises,
    visits,
    sessionStorage,
    reset,
    ...types,
  };
}

function hookHarness() {
  let cursor = 0;
  const cells = [];
  let effects = [];
  const changed = (a, b) => !a || a.some((item, i) => !Object.is(item, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      cells[i] ??= {
        value: typeof initial === 'function' ? initial() : initial,
      };
      return [
        cells[i].value,
        next => {
          cells[i].value =
            typeof next === 'function' ? next(cells[i].value) : next;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      cells[i] ??= { current: initial };
      return cells[i];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (changed(cells[i]?.deps, deps)) cells[i] = { deps, fn };
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
  };
  return {
    hooks,
    render(fn) {
      cursor = 0;
      effects = [];
      const result = fn();
      effects.forEach(effect => effect());
      return result;
    },
    unmount() {
      cells.forEach(cell => cell.cleanup?.());
    },
  };
}

const detail = (id, role = 1) => ({
  id,
  name: `Space ${id}`,
  userRole: role,
  enterpriseId: '4',
});
function selectRole(f, uid, role) {
  f.user.setState({ user: { uid } });
  f.space
    .getState()
    .setSpaceStore({ spaceId: '18', enterpriseId: '4', spaceType: 'team' });
  f.user.getState().setUserRole(f.SpaceType.ENTERPRISE, role, '18', '4');
}

test('late profile refresh preserves the current UID role; an older profile cannot revive a logged-out account', async () => {
  const f = fixture();
  selectRole(f, 'owner-uid', f.RoleType.SUPER_ADMIN);
  const refresh = f.user.getState().getUserInfo();
  f.profiles[0].resolve({ uid: 'owner-uid', nickname: 'updated' });
  await refresh;
  assert.equal(
    f.user.getState().getUserRole().roleType,
    f.RoleType.SUPER_ADMIN
  );
  assert.equal(f.user.getState().user.nickname, 'updated');
  const oldRequest = f.user.getState().getUserInfo();
  f.reset();
  const newRequest = f.user.getState().getUserInfo();
  f.profiles[2].resolve({ uid: 'peer-uid' });
  await newRequest;
  f.profiles[1].resolve({ uid: 'owner-uid' });
  await oldRequest;
  assert.equal(f.user.getState().user.uid, 'peer-uid');
  assert.equal(f.user.getState().getUserRole(), null);
});

test('account reset clears in-memory and persisted space/team selection and cached team data', () => {
  const f = fixture();
  selectRole(f, 'peer-uid', f.RoleType.MEMBER);
  f.enterprise.getState().setEnterpriseInfo({ id: '4', name: 'old team' });
  f.sessionStorage.setItem('postLoginRedirect', '/space/space-detail/18');
  f.reset();
  assert.equal(f.user.getState().user.uid, undefined);
  assert.equal(f.space.getState().spaceId, '');
  assert.equal(f.space.getState().enterpriseId, '');
  assert.equal(f.enterprise.getState().info.id, '');
  const saved = JSON.parse(f.sessionStorage.getItem('space-storage')).state;
  assert.equal(saved.spaceId, '');
  assert.equal(saved.enterpriseId, '');
  assert.equal(
    f.sessionStorage.getItem('postLoginRedirect'),
    '/space/space-detail/18'
  );
});

test('direct URL/refresh waits for UID then loads owner role, and rechecks when the same URL switches to a member', async () => {
  const f = fixture();
  const h = hookHarness();
  const { useSpaceInfo } = f.load(
    'pages/space/space-detail/use-space-info.ts',
    { react: h.hooks }
  );
  const render = () => h.render(() => useSpaceInfo('18'));
  assert.equal(render().loading, true);
  assert.equal(f.spaces.length, 0);
  f.user.setState({ user: { uid: 'owner-uid' } });
  render();
  f.spaces[0].resolve(detail('18'));
  await settle();
  assert.equal(render().spaceInfo.userRole, 1);
  assert.equal(
    f.user.getState().getUserRole().roleType,
    f.RoleType.SUPER_ADMIN
  );
  f.reset();
  f.user.setState({ user: { uid: 'peer-uid' } });
  assert.equal(render().spaceInfo, null);
  assert.equal(f.user.getState().getUserRole(), null);
  f.spaces[1].resolve(detail('18', 3));
  await settle();
  assert.equal(render().spaceInfo.userRole, 3);
  assert.equal(f.user.getState().getUserRole().roleType, f.RoleType.MEMBER);
});

test('late details from an old account or URL cannot replace the active space or its role', async () => {
  const f = fixture();
  const h = hookHarness();
  const { useSpaceInfo } = f.load(
    'pages/space/space-detail/use-space-info.ts',
    { react: h.hooks }
  );
  f.user.setState({ user: { uid: 'old-owner' } });
  h.render(() => useSpaceInfo('18'));
  f.reset();
  f.user.setState({ user: { uid: 'new-member' } });
  h.render(() => useSpaceInfo('19'));
  f.spaces[1].resolve(detail('19', 3));
  await settle();
  f.spaces[0].resolve(detail('18', 1));
  await settle();
  assert.equal(h.render(() => useSpaceInfo('19')).spaceInfo.id, '19');
  assert.equal(f.space.getState().spaceId, '19');
  assert.equal(f.user.getState().getUserRole().roleType, f.RoleType.MEMBER);
  assert.deepEqual(f.visits, ['19']);
  h.render(() => useSpaceInfo('20'));
  f.space.getState().setSpaceStore({ spaceId: '21' });
  f.spaces[2].resolve(detail('20'));
  await settle();
  assert.equal(f.space.getState().spaceId, '21');
  assert.equal(f.user.getState().getUserRole(), null);
});

test('owner buttons/tabs survive profile refresh, member controls stay restricted, and scope mismatch fails closed', async () => {
  const f = fixture();
  const SpaceButton = f.load(
    'components/button-group/space-button.tsx'
  ).default;
  const SpaceTab = f.load('components/space/space-tab/index.tsx').default;
  const config = {
    key: 'remove',
    text: 'Remove',
    permission: {
      module: f.ModuleType.SPACE,
      operation: f.OperationType.REMOVE_MEMBERS,
    },
  };
  const options = [
    {
      key: 'invite',
      label: 'Invitations',
      permission: {
        module: f.ModuleType.SPACE,
        operation: f.OperationType.INVITATION_MANAGE,
      },
    },
  ];
  const button = () =>
    renderToStaticMarkup(React.createElement(SpaceButton, { config }));
  const tabs = () =>
    renderToStaticMarkup(React.createElement(SpaceTab, { options }));
  selectRole(f, 'owner-uid', f.RoleType.SUPER_ADMIN);
  const refresh = f.user.getState().getUserInfo();
  f.profiles[0].resolve({ uid: 'owner-uid' });
  await refresh;
  assert.doesNotMatch(button(), /disabled/);
  assert.match(tabs(), /Invitations/);
  selectRole(f, 'member-uid', f.RoleType.MEMBER);
  assert.match(button(), /disabled/);
  assert.equal(tabs(), '');
  selectRole(f, 'owner-uid', f.RoleType.SUPER_ADMIN);
  f.space.getState().setSpaceStore({ spaceId: '19' });
  assert.match(button(), /disabled/);
  assert.equal(tabs(), '');
});

test('permission resource checks follow string UIDs after account changes', () => {
  const f = fixture();
  const { usePermissions } = f.load('hooks/use-permissions.ts');
  let permission;
  function Probe() {
    permission = usePermissions();
    return null;
  }
  const render = () => renderToStaticMarkup(React.createElement(Probe));
  render();
  assert.equal(permission, null);
  selectRole(f, 'owner-a', f.RoleType.SUPER_ADMIN);
  render();
  assert.equal(
    permission.checks.canDeleteResource(f.ModuleType.SPACE, 'owner-a'),
    true
  );
  selectRole(f, 'owner-b', f.RoleType.SUPER_ADMIN);
  render();
  assert.equal(
    permission.checks.canDeleteResource(f.ModuleType.SPACE, 'owner-a'),
    false
  );
  assert.equal(
    permission.checks.canDeleteResource(f.ModuleType.SPACE, 'owner-b'),
    true
  );
});

test('enterprise detail is also bound to UID and route, ignoring old team responses', async () => {
  const f = fixture();
  const h = hookHarness();
  let enterpriseId = '4';
  const Index = f.load('pages/space/enterprise/index.tsx', {
    react: { ...React, ...h.hooks },
    'react-router-dom': {
      useParams: () => ({ enterpriseId }),
      Routes: () => null,
      Route: () => null,
      Navigate: () => null,
    },
    './base-layout': () => null,
    './page-components/space-manage': () => null,
    './page-components/member-manage': () => null,
    './page-components/team-settings': () => null,
  }).default;
  h.render(Index);
  assert.equal(f.enterprises.length, 0);
  f.user.setState({ user: { uid: 'old-owner' } });
  h.render(Index);
  f.reset();
  f.user.setState({ user: { uid: 'new-member' } });
  enterpriseId = '5';
  h.render(Index);
  f.enterprises[1].resolve({ id: '5', role: 3 });
  await settle();
  f.enterprises[0].resolve({ id: '4', role: 1 });
  await settle();
  assert.equal(h.render(Index).type, 'div');
  assert.equal(f.enterprise.getState().info.id, '5');
  assert.equal(f.user.getState().getUserRole().roleType, f.RoleType.MEMBER);
  f.reset();
  f.user.setState({ user: { uid: 'returning-owner' } });
  assert.notEqual(h.render(Index).type, 'div');
  f.enterprises[2].resolve({ id: '5', role: 1 });
  await settle();
  assert.equal(h.render(Index).type, 'div');
  assert.equal(
    f.user.getState().getUserRole().roleType,
    f.RoleType.SUPER_ADMIN
  );
});

test('member removal controls use current string UID and the backend role hierarchy', () => {
  const f = fixture();
  let tableProps;
  const MemberManagement = f.load(
    'pages/space/space-detail/components/member-management/index.tsx',
    {
      '@/pages/space/hooks/use-space-i18n': {
        useSpaceI18n: () => ({ roleTextMap: {}, memberRoleOptions: [] }),
      },
      '@/components/space/space-table': props => {
        tableProps = props;
        return null;
      },
      '@ant-design/icons': {},
    }
  ).default;
  const allowed = (uid, role) =>
    tableProps.actionColumn
      .getActionButtons({ uid, role })[0]
      .permission.customCheck();
  const render = () =>
    renderToStaticMarkup(
      React.createElement(MemberManagement, { spaceId: '18' })
    );
  selectRole(f, 'owner-uid', f.RoleType.SUPER_ADMIN);
  render();
  assert.equal(allowed('peer-uid', 3), true);
  assert.equal(allowed('admin-uid', 2), true);
  assert.equal(allowed('owner-uid', 1), false);
  selectRole(f, 'admin-uid', f.RoleType.ADMIN);
  render();
  assert.equal(allowed('peer-uid', 3), true);
  assert.equal(allowed('other-admin', 2), false);
  assert.equal(allowed('owner-uid', 1), false);
  selectRole(f, 'peer-uid', f.RoleType.MEMBER);
  render();
  assert.equal(allowed('another-peer', 3), false);
});
