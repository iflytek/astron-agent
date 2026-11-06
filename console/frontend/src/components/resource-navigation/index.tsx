import { useEffect, useState, type ReactElement } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Select } from 'antd';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import useUserStore from '@/store/user-store';
import NoticeModal from '@/components/sidebar/notice-modal';
import SidebarLogo from '@/components/sidebar/sidebar-logo';
import IconEntry from '@/components/sidebar/icon-entry';
import { getMessageCountApi } from '@/services/notification';
import { createMenuList } from '@/constants';
import collapseIcon from '@/assets/imgs/sidebar/collapseGray.svg';
import workflowIcon from '@/assets/imgs/sidebar/icon_nav_flow_normal.png';
import workflowActiveIcon from '@/assets/imgs/sidebar/icon_nav_flow_normal_active.png';
import avatar from '@/assets/imgs/sidebar/avator.png';
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
  const [showResources, setShowResources] = useState(
    pathname.startsWith('/resource/')
  );
  const [showManagement, setShowManagement] = useState(false);
  const resourceActive = pathname.startsWith('/resource/');
  const groups = createMenuList();

  useEffect(() => {
    if (pathname.startsWith('/resource/')) setShowResources(true);
  }, [pathname]);

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

  const renderLink = (item: {
    path: string;
    subTitle: string;
    icon: string;
    iconAct: string;
  }): ReactElement => (
    <NavLink
      key={item.path}
      to={item.path}
      title={item.subTitle}
      className={({ isActive }) =>
        `${styles.item} ${isActive ? styles.active : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <img src={isActive ? item.iconAct : item.icon} alt="" />
          {!collapsed && <span>{item.subTitle}</span>}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`${styles.navigation} ${collapsed ? styles.collapsed : ''}`}
    >
      <button
        type="button"
        className={styles.collapse}
        aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(value => !value)}
      >
        <img src={collapseIcon} alt="" />
      </button>
      <div className={styles.brand}>
        <SidebarLogo isCollapsed={collapsed} />
      </div>
      <div className={styles.scroll}>
        <nav aria-label="市场">
          {groups[0]?.tabs.map(item =>
            renderLink({
              ...item,
              path: item.path === '/home' ? '/store/agent' : item.path,
            })
          )}
        </nav>
        {!collapsed && (
          <div className={styles.scope}>
            <label htmlFor="navigation-team">团队</label>
            <Select
              id="navigation-team"
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
            <label htmlFor="navigation-space">当前空间</label>
            <Select
              id="navigation-space"
              aria-label="当前空间"
              placeholder="请选择空间"
              value={spaceId ? String(spaceId) : enterpriseId ? undefined : ''}
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
        )}
        {error && !collapsed && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <nav aria-label="工作空间" className={styles.workspace}>
          {groups[1]?.tabs.map(item =>
            item.activeTab === 'resource' ? (
              <div key={item.path}>
                <button
                  type="button"
                  title={item.subTitle}
                  className={`${styles.item} ${resourceActive ? styles.active : ''}`}
                  aria-expanded={showResources}
                  onClick={() => {
                    setCollapsed(false);
                    setShowResources(value => !value);
                  }}
                >
                  <img src={resourceActive ? item.iconAct : item.icon} alt="" />
                  {!collapsed && (
                    <>
                      <span>{item.subTitle}</span>
                      <span aria-hidden="true">⌄</span>
                    </>
                  )}
                </button>
                {!collapsed && showResources && (
                  <div className={styles.submenu}>
                    {resources.map(([path, label]) => (
                      <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                          isActive ? styles.active : ''
                        }
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.activeTab === 'agent' ? (
              <div key={item.path}>
                {renderLink(item)}
                {renderLink({
                  path: '/space/workflows',
                  subTitle: '工作流',
                  icon: workflowIcon,
                  iconAct: workflowActiveIcon,
                })}
              </div>
            ) : (
              renderLink(item)
            )
          )}
          <button
            type="button"
            title="空间与团队"
            className={styles.item}
            aria-expanded={showManagement}
            onClick={() => {
              setCollapsed(false);
              setShowManagement(value => !value);
            }}
          >
            <img src={avatar} alt="" />
            {!collapsed && (
              <>
                <span>空间与团队</span>
                <span aria-hidden="true">⌄</span>
              </>
            )}
          </button>
          {!collapsed && showManagement && (
            <div className={styles.submenu}>
              <NavLink to="/space" end>
                空间管理
              </NavLink>
              <NavLink to="/space/invitations">邀请</NavLink>
              <NavLink
                to={
                  enterpriseId
                    ? `/enterprise/${enterpriseId}/space`
                    : '/team/create/2'
                }
              >
                团队管理
              </NavLink>
              <NavLink to="/team/create/2">新建团队</NavLink>
            </div>
          )}
        </nav>
      </div>
      <div className={styles.footer}>
        <IconEntry
          isCollapsed={collapsed}
          onMessageClick={() => setNotices(true)}
          unreadCount={unreadCount}
        />
        <Link to="/account" className={styles.account} title="我的账号">
          <img src={user.avatar || avatar} alt="" />
          {!collapsed && (
            <>
              <span>{user.nickname || user.username || '我的账号'}</span>
              <span aria-hidden="true">⌄</span>
            </>
          )}
        </Link>
      </div>
      <NoticeModal
        open={notices}
        onClose={() => setNotices(false)}
        onMessageRead={() => {
          void getMessageCountApi()
            .then(setUnreadCount)
            .catch(() => undefined);
        }}
      />
    </aside>
  );
}
