import { useEffect, useState, type ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import NoticeModal from '@/components/sidebar/notice-modal';
import styles from './index.module.scss';

interface SpaceOption {
  id: number | string;
  name: string;
  enterpriseId?: number | string | null;
  avatarUrl?: string;
}

const links = [
  ['/space/agent', '独立 Agent'],
  ['/space/workflows', '工作流'],
  ['/resource/automation', '定时自动化'],
  ['/resource/knowledge', '知识库'],
  ['/management/model', '模型管理'],
  ['/resource/plugin', '工具管理'],
  ['/store/plugin', '工具市场'],
  ['/resource/rpa', 'RPA'],
  ['/resource/mcp', 'MCP 服务'],
  ['/resource/database', '数据库'],
  ['/resource/skill', 'Skill 文件'],
  ['/resource/sandbox', '沙箱配置'],
  ['/management/platform-account', '平台账号'],
];

export default function ResourceNavigation(): ReactElement {
  const { spaceId, enterpriseId, setSpaceStore } = useSpaceStore();
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [teams, setTeams] = useState<SpaceOption[]>([]);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState(false);

  useEffect((): (() => void) => {
    let ignore = false;
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
    return () => {
      ignore = true;
    };
  }, []);

  const selectSpace = (value: string): void => {
    const selected = spaces.find(item => String(item.id) === value);
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
    // Remount resource editors so no pending form can be saved into another scope.
    window.location.assign('/resource/knowledge');
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

  return (
    <aside className={styles.navigation}>
      <a className={styles.brand} href="/resource/knowledge">
        Astron Agent
      </a>
      <label className={styles.scope}>
        团队
        <select
          value={String(enterpriseId || '')}
          onChange={event => selectTeam(event.target.value)}
        >
          <option value="">个人</option>
          {teams.map(team => (
            <option key={team.id} value={String(team.id)}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.scope}>
        当前空间
        <select
          value={String(spaceId || (enterpriseId ? 'select-space' : ''))}
          onChange={event => selectSpace(event.target.value)}
        >
          {enterpriseId && !spaceId && (
            <option value="select-space" disabled>
              请选择空间
            </option>
          )}
          <option value="">我的个人资源</option>
          {spaces.map(space => (
            <option key={space.id} value={String(space.id)}>
              {space.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <nav aria-label="资源管理">
        {links.map(([path, label]) => (
          <NavLink
            key={path}
            to={path || '/'}
            className={({ isActive }) => (isActive ? styles.active : '')}
          >
            {label}
          </NavLink>
        ))}
        <NavLink to="/space">空间管理</NavLink>
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
      </nav>
      <div className={styles.footer}>
        <button type="button" onClick={() => setNotices(true)}>
          通知与邀请
        </button>
        <a href="/account">我的账号</a>
      </div>
      <NoticeModal open={notices} onClose={() => setNotices(false)} />
    </aside>
  );
}
