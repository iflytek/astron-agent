import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LockOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import logo from '@/assets/imgs/sidebar/agentLog.svg';
import defaultAvatar from '@/components/resource-navigation/icons/footer/user-avatar.svg';
import { accountRequest, AccountRequestError } from '@/utils/session';
import { resetAccountState } from '@/utils/account-state';
import type { User } from '@/store/user-store';
import styles from './index.module.scss';

type Mode = 'login' | 'register' | 'reset' | 'account';
type Action = 'credentials' | 'profile' | 'password' | 'logout';
type Feedback = { action: Action; error?: string; notice?: string };

const titles: Record<Mode, string> = {
  login: '登录工作空间',
  register: '创建账号',
  reset: '设置新密码',
  account: '我的账号',
};

const descriptions: Record<Mode, string> = {
  login: '登录后，在同一工作空间构建、调试和发布。',
  register: '创建账号，开始使用 Astron Agent。',
  reset: '使用管理员提供的重设链接设置密码。',
  account: '管理个人资料与登录安全。',
};

const loginDestination = (): string => {
  const destination = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');
  return destination?.startsWith('/') &&
    !destination.startsWith('//') &&
    !destination.includes('\\') &&
    !/^\/(?:account|login|register|reset-password)(?:[/?#]|$)/.test(destination)
    ? destination
    : '/space/agent';
};

export default function AccountAccess({ mode }: { mode: Mode }): ReactElement {
  const [busy, setBusy] = useState<Action>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState<User>();
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const [avatarFile, setAvatarFile] = useState<File>();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [loading, setLoading] = useState(mode === 'account');
  const [revision, setRevision] = useState(0);
  const [resetParams] = useState(
    () => new URLSearchParams(window.location.hash.slice(1))
  );

  useEffect((): (() => void) | undefined => {
    if (mode === 'reset') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (mode !== 'account') return;
    let ignore = false;
    setLoading(true);
    setLoadError('');
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
          setLoadError(
            reason instanceof Error ? reason.message : '无法读取账号资料'
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [mode, revision]);

  useEffect((): (() => void) | undefined => {
    if (!avatarFile) {
      setAvatarPreview(undefined);
      return;
    }
    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  const run = async (
    action: Action,
    request: () => Promise<void>
  ): Promise<void> => {
    setBusy(action);
    setFeedback(undefined);
    try {
      await request();
    } catch (reason) {
      setFeedback({
        action,
        error:
          reason instanceof Error ? reason.message : '操作失败，请稍后重试',
      });
    } finally {
      setBusy(undefined);
    }
  };

  const submitCredentials = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run('credentials', async () => {
      if (mode === 'reset') {
        await accountRequest('/auth/reset-password', {
          ...data,
          uid: resetParams.get('uid'),
          token: resetParams.get('token'),
        });
        setFeedback({
          action: 'credentials',
          notice: '密码已设置，请使用用户名和新密码登录。',
        });
      } else {
        await accountRequest(`/auth/${mode}`, data);
        resetAccountState();
        window.location.replace(loginDestination());
      }
    });
  };

  const clearAvatarSelection = (): void => {
    if (avatarInput.current) avatarInput.current.value = '';
    setAvatarFile(undefined);
  };

  const submitProfile = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!avatarFile) data.delete('avatar');
    await run('profile', async () => {
      if (avatarFile && avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('请选择不超过 5 MB 的图片');
      }
      setUser(await accountRequest<User>('/user-info/update', data));
      clearAvatarSelection();
      setFailedAvatar(undefined);
      setFeedback({ action: 'profile', notice: '资料已保存。' });
    });
  };

  const submitPassword = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await run('password', async () => {
      await accountRequest('/auth/change-password', data);
      form.reset();
      setFeedback({
        action: 'password',
        notice: '密码已修改，其他登录会话已失效。',
      });
    });
  };

  const renderFeedback = (action: Action): ReactElement | null => {
    if (feedback?.action !== action) return null;
    return feedback.error ? (
      <p className={styles.error} role="alert">
        {feedback.error}
      </p>
    ) : (
      <p className={styles.notice} role="status">
        {feedback.notice}
      </p>
    );
  };

  const brand = (
    <a className={styles.brand} href="/">
      <img src={logo} alt="" width="28" height="28" />
      Astron Agent
    </a>
  );

  if (mode === 'account') {
    const avatar =
      user?.avatar && user.avatar !== failedAvatar
        ? user.avatar
        : defaultAvatar;
    return (
      <main className={styles.page}>
        <div className={styles.accountLayout}>
          <header className={styles.accountHeader}>{brand}</header>
          <div className={styles.accountHeading}>
            <div>
              <h1>{titles.account}</h1>
              <p className={styles.intro}>{descriptions.account}</p>
            </div>
            <a className={styles.outlineButton} href="/space/agent">
              <ArrowLeftOutlined aria-hidden="true" />
              进入控制台
            </a>
          </div>
          {loading && (
            <p role="status" className={styles.loading}>
              正在加载账号资料…
            </p>
          )}
          {loadError && (
            <div className={styles.error}>
              <p role="alert">{loadError}</p>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setRevision(value => value + 1)}
              >
                重新加载
              </button>
            </div>
          )}
          {user && (
            <div className={styles.accountSurface}>
              <div className={styles.identity}>
                <img
                  src={avatarPreview || avatar}
                  alt=""
                  width="54"
                  height="54"
                  onError={() => {
                    if (avatarPreview) setAvatarPreview(undefined);
                    else setFailedAvatar(user.avatar);
                  }}
                />
                <div className={styles.identityText}>
                  <strong>{user.nickname || user.username}</strong>
                  <span>登录账号 · {user.username}</span>
                </div>
              </div>
              <div className={styles.accountForms}>
                <section aria-labelledby="account-profile">
                  <h2 id="account-profile">
                    <UserOutlined aria-hidden="true" />
                    个人资料
                  </h2>
                  <form key={user.uid} onSubmit={submitProfile}>
                    <label>
                      昵称
                      <input
                        name="nickname"
                        defaultValue={user.nickname}
                        maxLength={255}
                      />
                    </label>
                    <div className={styles.avatarField}>
                      <span className={styles.fieldLabel}>头像</span>
                      <div className={styles.avatarFile}>
                        <input
                          ref={avatarInput}
                          name="avatar"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          disabled={!!busy}
                          onChange={event =>
                            setAvatarFile(event.currentTarget.files?.[0])
                          }
                        />
                        <button
                          type="button"
                          className={styles.outlineButton}
                          aria-describedby="account-avatar-guide"
                          disabled={!!busy}
                          onClick={() => avatarInput.current?.click()}
                        >
                          选择头像
                        </button>
                        {avatarFile && (
                          <>
                            <span
                              className={styles.avatarFilename}
                              title={avatarFile.name}
                            >
                              {avatarFile.name}
                            </span>
                            <button
                              type="button"
                              className={styles.outlineButton}
                              disabled={!!busy}
                              onClick={clearAvatarSelection}
                            >
                              取消选择
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={styles.hint} id="account-avatar-guide">
                      PNG、JPEG 或 WebP，最大 5 MB。
                    </span>
                    <button
                      className={styles.primaryButton}
                      type="submit"
                      disabled={!!busy}
                    >
                      {busy === 'profile' ? '正在保存…' : '保存资料'}
                    </button>
                    {renderFeedback('profile')}
                  </form>
                </section>
                <section aria-labelledby="account-password">
                  <h2 id="account-password">
                    <LockOutlined aria-hidden="true" />
                    修改密码
                  </h2>
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
                        aria-describedby="account-password-guide"
                        required
                      />
                    </label>
                    <div className={styles.hint} id="account-password-guide">
                      至少 12 位，避免常见密码或只使用数字。
                    </div>
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
                    <button
                      className={styles.primaryButton}
                      type="submit"
                      disabled={!!busy}
                    >
                      {busy === 'password' ? '正在修改…' : '修改密码'}
                    </button>
                    {renderFeedback('password')}
                  </form>
                </section>
              </div>
              <footer className={styles.accountFooter}>
                {renderFeedback('logout')}
                <button
                  className={styles.outlineButton}
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    void run('logout', async () => {
                      await accountRequest('/auth/logout', {});
                      resetAccountState();
                      window.location.replace('/login');
                    })
                  }
                >
                  <LogoutOutlined aria-hidden="true" />
                  {busy === 'logout' ? '正在退出…' : '退出登录'}
                </button>
              </footer>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${styles.accessPage}`}>
      <div className={styles.accessLayout}>
        <div className={styles.brandPanel}>
          {brand}
          <div className={styles.art} aria-hidden="true">
            <span className={styles.orbit} />
            <span className={styles.orbitCross} />
            <img src={logo} alt="" width="88" height="88" />
          </div>
        </div>
        <section
          className={styles.accessContent}
          aria-labelledby="access-title"
        >
          <h1 id="access-title">{titles[mode]}</h1>
          <p className={styles.intro}>{descriptions[mode]}</p>
          {renderFeedback('credentials')}
          {!(mode === 'reset' && feedback?.notice) && (
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
                  aria-describedby={
                    mode === 'login' ? undefined : 'access-password-guide'
                  }
                  required
                />
              </label>
              {mode !== 'login' && (
                <span className={styles.hint} id="access-password-guide">
                  至少 12 位，避免常见密码或只使用数字。
                </span>
              )}
              {mode !== 'login' && (
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
              )}
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={!!busy}
              >
                {busy
                  ? '处理中…'
                  : mode === 'login'
                    ? '登录'
                    : mode === 'register'
                      ? '注册'
                      : '设置密码'}
                <ArrowRightOutlined aria-hidden="true" />
              </button>
            </form>
          )}
          <footer className={styles.accessFooter}>
            {mode === 'login' ? (
              <>
                <p>
                  没有账号？ <a href="/register">立即注册</a>
                </p>
                <p className={styles.hint}>
                  忘记密码或首次启用旧账号？请联系管理员获取重设链接。
                </p>
              </>
            ) : (
              <a href="/login">返回登录</a>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}
