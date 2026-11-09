import { useEffect, useState, type ReactElement } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Badge, Drawer, Select } from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  DatabaseOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import useUserStore from '@/store/user-store';
import NoticeModal from '@/components/sidebar/notice-modal';
import { getMessageCountApi } from '@/services/notification';
import logo from '@/assets/imgs/sidebar/agentLog.svg';
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
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [teams, setTeams] = useState<SpaceOption[]>([]);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect((): (() => void) => {
    let ignore = false;
    setSpaces([]);
    setTeams([]);
    setError('');
    if (!user.uid)
      return () => {
        ignore = true;
      };
    http
      .get<unknown, SpaceOption[]>('/space/accessible-list')
      .then(items => {
        if (!ignore) setSpaces(items);
      })
      .catch(() => {
        if (!ignore) setError('无法读取空间列表，请刷新重试。');
      });
    http
      .get<unknown, SpaceOption[]>('/enterprise/join-list')
      .then(items => {
        if (!ignore) setTeams(items);
      })
      .catch(() => {
        if (!ignore) setError('无法读取团队列表，请刷新重试。');
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
  }, [user.uid]);

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
      icon: <RobotOutlined />,
    },
    {
      id: 'resources',
      label: '资源',
      path: '/resource/knowledge',
      icon: <FolderOutlined />,
    },
    {
      id: 'publishing',
      label: '发布',
      path: '/management/release',
      icon: <UploadOutlined />,
    },
    {
      id: 'models',
      label: '模型',
      path: '/management/model',
      icon: <DatabaseOutlined />,
    },
    {
      id: 'market',
      label: '市场',
      path: '/store/agent',
      icon: <AppstoreOutlined />,
    },
    {
      id: 'management',
      label: '管理',
      path: '/space',
      icon: <SettingOutlined />,
    },
  ];
  const managementLinks: Array<[string, string]> = [
    ['/space', '空间管理'],
    ['/space/invitations', '邀请'],
    [
      enterpriseId ? `/enterprise/${enterpriseId}/space` : '/team/create/2',
      '团队管理',
    ],
    ['/team/create/2', '新建团队'],
    ['/management/app', '应用管理'],
    ['/management/platform-account', '平台账户'],
  ];
  const link = (
    path: string,
    label: string,
    icon?: ReactElement
  ): ReactElement => (
    <NavLink
      key={`${path}-${label}`}
      to={path}
      end={path === '/space'}
      className={({ isActive }) =>
        `${styles.item} ${isActive || (path === '/space' && pathname.startsWith('/space/space-detail/')) ? styles.active : ''}`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
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
        <nav className={styles.modules}>
          {modules.map(module => (
            <Link
              key={module.id}
              to={module.path}
              title={module.label}
              aria-current={section === module.id ? 'page' : undefined}
              className={`${styles.module} ${section === module.id ? styles.selected : ''}`}
            >
              {module.icon}
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
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <span>
                {(user.nickname || user.username || '我').slice(0, 1)}
              </span>
            )}
          </Link>
        </div>
      </aside>
      {(mobile || !collapsed) && (
        <aside className={styles.context} aria-label="空间导航">
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
                {error}
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
                  {link('/space/agent', 'Agent', <RobotOutlined />)}
                  {link('/space/workflows', '工作流', <ApartmentOutlined />)}
                  <div className={styles.divider} />
                  <p className={styles.groupLabel}>空间资源</p>
                  {link('/resource/knowledge', '资源管理', <FolderOutlined />)}
                  {link('/management/model', '模型管理', <DatabaseOutlined />)}
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
                  {link('/store/agent', 'Agent 市场', <RobotOutlined />)}
                  {link('/store/plugin', '工具市场', <AppstoreOutlined />)}
                </>
              )}
              {section === 'publishing' && (
                <>
                  <p className={styles.groupLabel}>发布管理</p>
                  {link('/management/release', '应用发布', <UploadOutlined />)}
                  {link('/management/app', '应用管理', <AppstoreOutlined />)}
                </>
              )}
              {section === 'models' && (
                <>
                  <p className={styles.groupLabel}>模型管理</p>
                  {link('/management/model', '模型管理', <DatabaseOutlined />)}
                </>
              )}
              {section === 'management' && (
                <>
                  <p className={styles.groupLabel}>空间与团队</p>
                  {managementLinks.map(([path, label]) =>
                    link(path, label, <TeamOutlined />)
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
            <BookOutlined />
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
          aria-label="打开导航"
          onClick={() => setMobileOpen(true)}
        >
          <MenuOutlined />
        </button>
        <Link to="/space/agent">Astron Agent</Link>
        <Link to="/account" aria-label="我的账号">
          <SettingOutlined />
        </Link>
      </div>
      <Drawer
        title="工作空间"
        placement="left"
        width={292}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
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
