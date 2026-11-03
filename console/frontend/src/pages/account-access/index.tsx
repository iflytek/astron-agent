import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { accountRequest, AccountRequestError } from '@/utils/session';
import { resetAccountState } from '@/utils/account-state';
import type { User } from '@/store/user-store';
import styles from './index.module.scss';

type Mode = 'login' | 'register' | 'reset' | 'account';

const titles: Record<Mode, string> = {
  login: '登录 Astron Agent',
  register: '创建账号',
  reset: '设置新密码',
  account: '我的账号',
};

const loginDestination = (): string => {
  const destination = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');
  return destination?.startsWith('/') &&
    !destination.startsWith('//') &&
    !destination.includes('\\')
    ? destination
    : '/account';
};

export default function AccountAccess({ mode }: { mode: Mode }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<User>();
  const [resetParams] = useState(
    () => new URLSearchParams(window.location.hash.slice(1))
  );

  useEffect(() => {
    if (mode === 'reset') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (mode !== 'account') return;
    let ignore = false;
    accountRequest<User>('/user-info/me')
      .then(value => {
        if (!ignore) setUser(value);
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        if (reason instanceof AccountRequestError && reason.status === 401) {
          resetAccountState();
          window.location.replace('/login');
        } else {
          setError(
            reason instanceof Error ? reason.message : '无法读取账号资料'
          );
        }
      });
    return () => {
      ignore = true;
    };
  }, [mode]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '操作失败，请稍后重试'
      );
    } finally {
      setBusy(false);
    }
  };

  const submitCredentials = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      if (mode === 'reset') {
        await accountRequest('/auth/reset-password', {
          ...data,
          uid: resetParams.get('uid'),
          token: resetParams.get('token'),
        });
        setNotice('密码已设置，请使用用户名和新密码登录。');
      } else {
        await accountRequest(`/auth/${mode}`, data);
        resetAccountState();
        window.location.replace(loginDestination());
      }
    });
  };

  const submitProfile = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      setUser(await accountRequest<User>('/user-info/update', data));
      setNotice('资料已保存');
    });
  };

  const submitPassword = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await run(async () => {
      await accountRequest('/auth/change-password', data);
      form.reset();
      setNotice('密码已修改，其他登录会话已失效。');
    });
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <a className={styles.brand} href="/">
          Astron Agent
        </a>
        <h1>{titles[mode]}</h1>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {mode !== 'account' && !(mode === 'reset' && notice) && (
          <form onSubmit={submitCredentials}>
            {mode !== 'reset' && (
              <label>
                用户名
                <input
                  name="username"
                  autoComplete="username"
                  maxLength={150}
                  required
                />
              </label>
            )}
            <label>
              {mode === 'reset' ? '新密码' : '密码'}
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={mode === 'login' ? 1 : 12}
                maxLength={1024}
                required
              />
            </label>
            {mode !== 'login' && (
              <>
                <p className={styles.hint}>
                  至少 12 位，请避免常见密码或只使用数字。
                </p>
                <label>
                  确认密码
                  <input
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    required
                  />
                </label>
              </>
            )}
            <button type="submit" disabled={busy}>
              {busy
                ? '处理中…'
                : mode === 'login'
                  ? '登录'
                  : mode === 'register'
                    ? '注册'
                    : '设置密码'}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <p className={styles.links}>
            没有账号？<a href="/register">立即注册</a>
            <span>忘记密码或首次启用旧账号，请联系管理员获取重设链接。</span>
          </p>
        )}
        {(mode === 'register' || mode === 'reset') && (
          <p className={styles.links}>
            <a href="/login">返回登录</a>
          </p>
        )}

        {mode === 'account' && user && (
          <>
            <p className={styles.hint}>登录账号：{user.username}</p>
            <form key={user.uid} onSubmit={submitProfile}>
              <label>
                昵称
                <input
                  name="nickname"
                  defaultValue={user.nickname}
                  maxLength={255}
                />
              </label>
              <label>
                头像地址
                <input
                  name="avatar"
                  type="url"
                  defaultValue={user.avatar}
                  maxLength={512}
                  placeholder="https://…"
                />
              </label>
              <button type="submit" disabled={busy}>
                保存资料
              </button>
            </form>
            <h2>修改密码</h2>
            <form onSubmit={submitPassword}>
              <label>
                原密码
                <input
                  name="oldPassword"
                  type="password"
                  autoComplete="current-password"
                  maxLength={1024}
                  required
                />
              </label>
              <label>
                新密码
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                />
              </label>
              <label>
                确认新密码
                <input
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                />
              </label>
              <button type="submit" disabled={busy}>
                修改密码
              </button>
            </form>
            <div className={styles.links}>
              <a href="/home">进入控制台</a>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await accountRequest('/auth/logout', {});
                    resetAccountState();
                    window.location.replace('/login');
                  })
                }
              >
                退出登录
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
