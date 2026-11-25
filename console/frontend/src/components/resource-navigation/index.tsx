import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Badge, Drawer, Select } from 'antd';
import {
  BellOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import useUserStore from '@/store/user-store';
import eventBus from '@/utils/event-bus';
import NoticeModal from '@/components/sidebar/notice-modal';
import { getMessageCountApi } from '@/services/notification';
import logo from '@/assets/imgs/sidebar/agentLog.svg';
import buildModule from './icons/primary/build.svg';
import resourcesModule from './icons/primary/resources.svg';
import publishModule from './icons/primary/publish.svg';
import modelsModule from './icons/primary/models.svg';
import marketModule from './icons/primary/market.svg';
import adminModule from './icons/primary/admin.svg';
import agent from './icons/builder/agent.svg';
import workflow from './icons/builder/workflow.svg';
import resourceManagement from './icons/builder/resource-management.svg';
import workspaceModels from './icons/builder/workspace-model-management.svg';
import providerModels from './icons/models/provider-model-management.svg';
import appPublish from './icons/publish/app-publish.svg';
import releaseApps from './icons/publish/release-app-management.svg';
import agentMarket from './icons/market/agent-market.svg';
import toolMarket from './icons/market/tool-market.svg';
import spaceManagement from './icons/admin/space-management.svg';
import invitations from './icons/admin/invite.svg';
import teamManagement from './icons/admin/team-management.svg';
import newTeam from './icons/admin/new-team.svg';
import adminApps from './icons/admin/admin-app-management.svg';
import platformAccount from './icons/admin/platform-account.svg';
import defaultAvatar from './icons/footer/user-avatar.svg';
import developerDocs from './icons/footer/developer-docs.svg';
import styles from './index.module.scss';

interface SpaceOption {
  id: number | string;
  name: string;
  enterpriseId?: number | string | null;
  avatarUrl?: string;
}

const resources = [
  ['/resource/knowledge', '知识库'],
  ['/resource/plugin', '工具管理'],
  ['/resource/mcp', 'MCP 服务'],
  ['/resource/rpa', 'RPA'],
  ['/resource/database', '数据库'],
  ['/resource/skill', 'Skill 文件'],
  ['/resource/sandbox', '沙箱配置'],
  ['/resource/automation', '定时自动化'],
] as const;

export default function ResourceNavigation(): ReactElement {
  const { spaceId, enterpriseId, setSpaceStore } = useSpaceStore();
  const user = useUserStore(state => state.user);
  const { pathname } = useLocation();
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const avatar =
    user.avatar && user.avatar !== failedAvatar ? user.avatar : defaultAvatar;
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [teams, setTeams] = useState<SpaceOption[]>([]);
  const [error, setError] = useState('');
  const [scopeRevision, setScopeRevision] = useState(0);
  const [notices, setNotices] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const refresh = () => setScopeRevision(value => value + 1);
    eventBus.on('spaceList', refresh);
    return () => {
      eventBus.off('spaceList', refresh);
    };
  }, []);

  useEffect(() => {
    setSpaces([]);
    setTeams([]);
    setUnreadCount(0);
  }, [user.uid]);

  useEffect((): (() => void) => {
    let ignore = false;
    setError('');
    if (!user.uid)
      return () => {
        ignore = true;
      };
    void Promise.allSettled([
      http.get<unknown, SpaceOption[]>('/space/accessible-list'),
      http.get<unknown, SpaceOption[]>('/enterprise/join-list'),
    ]).then(([spaceResult, teamResult]) => {
      if (ignore) return;
      const selected = useSpaceStore.getState();
      if (spaceResult.status === 'fulfilled') {
        setSpaces(spaceResult.value);
        const available = spaceResult.value.some(
          item =>
            String(item.id) === String(selected.spaceId) &&
            String(item.enterpriseId || '') ===
              String(selected.enterpriseId || '')
        );
        if (selected.spaceId && !available) {
          selected.setSpaceStore({
            spaceId: '',
            spaceName: '',
            spaceAvatar: '',
          });
          useUserStore.getState().clearUserRole();
        }
      }
      if (teamResult.status === 'fulfilled') {
        setTeams(teamResult.value);
        if (
          selected.enterpriseId &&
          !teamResult.value.some(
            item => String(item.id) === String(selected.enterpriseId)
          )
        ) {
          selected.resetSpace();
          useUserStore.getState().clearUserRole();
        }
      }
      if (
        spaceResult.status === 'rejected' ||
        teamResult.status === 'rejected'
      ) {
        setError('无法更新空间或团队列表。');
      }
    });
    void getMessageCountApi()
      .then(count => {
        if (!ignore) setUnreadCount(count);
      })
      .catch(() => {
        if (!ignore) setUnreadCount(0);
      });
    return () => {
      ignore = true;
    };
  }, [user.uid, scopeRevision]);

  const selectSpace = (value: string): void => {
    const selected = spaces.find(item => String(item.id) === value);
    if (value && !selected) return;
    setSpaceStore({
      spaceId: selected ? String(selected.id) : '',
      spaceName: selected?.name || '',
      enterpriseName: selected?.enterpriseId
        ? teams.find(team => String(team.id) === String(selected.enterpriseId))
            ?.name || ''
        : '',
      enterpriseId: selected?.enterpriseId ? String(selected.enterpriseId) : '',
      spaceType: selected?.enterpriseId ? 'team' : 'personal',
      spaceAvatar: selected?.avatarUrl || '',
    });
    // Remount editors: pending changes must never move into a different scope.
    window.location.assign('/space/agent');
  };

  const selectTeam = (value: string): void => {
    if (!value) {
      selectSpace('');
      return;
    }
    const team = teams.find(item => String(item.id) === value);
    if (!team) return;
    setSpaceStore({
      spaceId: '',
      spaceName: '',
      spaceAvatar: '',
      enterpriseId: value,
      enterpriseName: team.name,
      spaceType: 'team',
    });
    window.location.assign(`/enterprise/${value}/space`);
  };

  const section = pathname.startsWith('/resource/')
    ? 'resources'
    : pathname.startsWith('/store/') || pathname === '/home'
      ? 'market'
      : pathname.startsWith('/management/model')
        ? 'models'
        : pathname.startsWith('/management/release')
          ? 'publishing'
          : pathname.startsWith('/management/') ||
              pathname.startsWith('/enterprise/') ||
              pathname === '/space' ||
              pathname.startsWith('/space/invitations') ||
              pathname.startsWith('/space/space-detail/') ||
              pathname.startsWith('/team/')
            ? 'management'
            : 'build';
  const modules = [
    {
      id: 'build',
      label: '构建',
      path: '/space/agent',
      icon: buildModule,
    },
    {
      id: 'resources',
      label: '资源',
      path: '/resource/knowledge',
      icon: resourcesModule,
    },
    {
      id: 'publishing',
      label: '发布',
      path: '/management/release',
      icon: publishModule,
    },
    {
      id: 'models',
      label: '模型',
      path: '/management/model',
      icon: modelsModule,
    },
    {
      id: 'market',
      label: '市场',
      path: '/store/agent',
      icon: marketModule,
    },
    {
      id: 'management',
      label: '管理',
      path: '/space',
      icon: adminModule,
    },
  ];
  const managementLinks = [
    ['/space', '空间管理', spaceManagement],
    ['/space/invitations', '邀请', invitations],
    [
      enterpriseId ? `/enterprise/${enterpriseId}/space` : '/team/create/2',
      '团队管理',
      teamManagement,
    ],
    ['/team/create/2', '新建团队', newTeam],
    ['/management/app', '应用管理', adminApps],
    ['/management/platform-account', '平台账户', platformAccount],
  ] as const;
  const link = (path: string, label: string, icon?: string): ReactElement => {
    const content = (
      <>
        {icon && <img className={styles.itemIcon} src={icon} alt="" />}
        <span>{label}</span>
      </>
    );
    if (path === '/space' && pathname.startsWith('/space/space-detail/')) {
      return (
        <Link
          key={path}
          to={path}
          aria-current="location"
          className={`${styles.item} ${styles.active}`}
        >
          {content}
        </Link>
      );
    }
    return (
      <NavLink
        key={`${path}-${label}`}
        to={path}
        end={path === '/space'}
        className={({ isActive }) =>
          `${styles.item} ${isActive ? styles.active : ''}`
        }
      >
        {content}
      </NavLink>
    );
  };
  const navigation = (mobile = false): ReactElement => (
    <div
      className={`${styles.navigation} ${!mobile && collapsed ? styles.collapsed : ''}`}
    >
      <aside className={styles.rail} aria-label="全局导航">
        <Link
          to="/space/agent"
          className={styles.logo}
          aria-label="Astron Agent 首页"
        >
          <img src={logo} alt="" />
        </Link>
        <nav className={styles.modules} aria-label="主模块">
          {modules.map(module => (
            <Link
              onClick={mobile ? (): void => setMobileOpen(false) : undefined}
              key={module.id}
              to={module.path}
              aria-current={section === module.id ? 'true' : undefined}
              className={`${styles.module} ${section === module.id ? styles.selected : ''}`}
            >
              <img src={module.icon} alt="" width="24" height="24" />
              <span>{module.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.railBottom}>
          {!mobile && (
            <button
              type="button"
              className={styles.railButton}
              aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
              aria-expanded={!collapsed}
              aria-controls={
                collapsed ? undefined : 'desktop-context-navigation'
              }
              onClick={() => setCollapsed(value => !value)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          )}
          <button
            type="button"
            className={styles.railButton}
            aria-label={`消息${unreadCount ? `，${unreadCount} 条未读` : ''}`}
            onClick={() => setNotices(true)}
          >
            <Badge dot={unreadCount > 0}>
              <BellOutlined />
            </Badge>
          </button>
          <Link
            to="/account"
            className={styles.account}
            title={user.nickname || user.username || '我的账号'}
            aria-label="我的账号"
          >
            <img
              src={avatar}
              alt=""
              onError={() => setFailedAvatar(user.avatar)}
            />
          </Link>
        </div>
      </aside>
      {(mobile || !collapsed) && (
        <aside
          id={mobile ? undefined : 'desktop-context-navigation'}
          className={styles.context}
          aria-label="空间导航"
        >
          <Link to="/space/agent" className={styles.wordmark}>
            Astron Agent
          </Link>
          <div className={styles.scroll}>
            <div className={styles.scope}>
              <label htmlFor={mobile ? 'mobile-team' : 'navigation-team'}>
                团队
              </label>
              <Select
                id={mobile ? 'mobile-team' : 'navigation-team'}
                aria-label="团队"
                value={String(enterpriseId || '')}
                onChange={selectTeam}
                options={[
                  { value: '', label: '个人' },
                  ...teams.map(team => ({
                    value: String(team.id),
                    label: team.name,
                  })),
                ]}
              />
              <label htmlFor={mobile ? 'mobile-space' : 'navigation-space'}>
                当前空间
              </label>
              <Select
                id={mobile ? 'mobile-space' : 'navigation-space'}
                aria-label="当前空间"
                placeholder="请选择空间"
                value={
                  spaceId ? String(spaceId) : enterpriseId ? undefined : ''
                }
                onChange={selectSpace}
                options={[
                  ...(!enterpriseId
                    ? [{ value: '', label: '我的个人资源' }]
                    : []),
                  ...spaces
                    .filter(
                      space =>
                        String(space.enterpriseId || '') ===
                        String(enterpriseId || '')
                    )
                    .map(space => ({
                      value: String(space.id),
                      label: space.name,
                    })),
                ]}
              />
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}{' '}
                <button
                  type="button"
                  onClick={() => setScopeRevision(value => value + 1)}
                >
                  重试
                </button>
              </p>
            )}
            <nav
              onClick={event => {
                if (mobile && (event.target as HTMLElement).closest('a'))
                  setMobileOpen(false);
              }}
              aria-label={modules.find(module => module.id === section)?.label}
              className={styles.contextNav}
            >
              {section === 'build' && (
                <>
                  <p className={styles.groupLabel}>应用构建</p>
                  {link('/space/agent', 'Agent', agent)}
                  {link('/space/workflows', '工作流', workflow)}
                  <div className={styles.divider} />
                  <p className={styles.groupLabel}>空间资源</p>
                  {link('/resource/knowledge', '资源管理', resourceManagement)}
                  {link('/management/model', '模型管理', workspaceModels)}
                </>
              )}
              {section === 'resources' && (
                <>
                  <p className={styles.groupLabel}>资源管理</p>
                  {resources.map(([path, label]) => link(path, label))}
                </>
              )}
              {section === 'market' && (
                <>
                  <p className={styles.groupLabel}>发现与复用</p>
                  {link('/store/agent', 'Agent 市场', agentMarket)}
                  {link('/store/plugin', '工具市场', toolMarket)}
                </>
              )}
              {section === 'publishing' && (
                <>
                  <p className={styles.groupLabel}>发布管理</p>
                  {link('/management/release', '应用发布', appPublish)}
                  {link('/management/app', '应用管理', releaseApps)}
                </>
              )}
              {section === 'models' && (
                <>
                  <p className={styles.groupLabel}>模型管理</p>
                  {link('/management/model', '模型管理', providerModels)}
                </>
              )}
              {section === 'management' && (
                <>
                  <p className={styles.groupLabel}>空间与团队</p>
                  {managementLinks.map(([path, label, icon]) =>
                    link(path, label, icon)
                  )}
                </>
              )}
            </nav>
          </div>
          <a
            className={styles.documentation}
            href="https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html"
            target="_blank"
            rel="noreferrer"
          >
            <img className={styles.itemIcon} src={developerDocs} alt="" />
            开发文档
          </a>
        </aside>
      )}
    </div>
  );
  return (
    <>
      <div className={styles.desktop}>{navigation()}</div>
      <div className={styles.mobileBar}>
        <button
          type="button"
          ref={mobileTrigger}
          aria-label="打开导航"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          onClick={() => setMobileOpen(true)}
        >
          <MenuOutlined />
        </button>
        <Link to="/space/agent" className={styles.mobileBrand}>
          <img src={logo} alt="" />
          Astron Agent
        </Link>
        <Link
          to="/account"
          className={styles.mobileAccount}
          aria-label="我的账号"
        >
          <img
            src={avatar}
            alt=""
            onError={() => setFailedAvatar(user.avatar)}
          />
        </Link>
      </div>
      <Drawer
        title={<span id="mobile-navigation-title">工作空间</span>}
        aria-labelledby="mobile-navigation-title"
        placement="left"
        width="min(292px, 100%)"
        open={mobileOpen}
        onClose={() => {
          setMobileOpen(false);
          mobileTrigger.current?.focus({ preventScroll: true });
        }}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        {mobileOpen && navigation(true)}
      </Drawer>
      <NoticeModal
        open={notices}
        onClose={() => setNotices(false)}
        onMessageRead={() => {
          void getMessageCountApi()
            .then(setUnreadCount)
            .catch(() => undefined);
        }}
      />
    </>
  );
}
