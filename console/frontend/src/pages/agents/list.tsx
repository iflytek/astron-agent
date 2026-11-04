import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSpaceStore from '@/store/space-store';
import {
  createAgent,
  deleteAgent,
  favoriteAgent,
  listAgents,
  type AgentDefinition,
} from '@/services/agents';
import './style.css';

import { errorText } from './errors';

export default function AgentList() {
  const { spaceId, enterpriseId } = useSpaceStore();
  const navigate = useNavigate();
  const [items, setItems] = useState<AgentDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setItems([]);
    setLoading(true);
    listAgents({ search, favorite, page, pageSize: 20 })
      .then(data => {
        if (active) {
          setItems(data.records);
          setTotal(data.total);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [spaceId, enterpriseId, page, search, favorite, revision]);
  const action = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <h1>独立 Agent</h1>
          <p>配置指令与资源，调试并开始对话。</p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          创建 Agent
        </button>
      </header>
      <div className="agents-toolbar">
        <input
          aria-label="搜索 Agent"
          placeholder="搜索名称"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="inline">
          <input
            type="checkbox"
            checked={favorite}
            onChange={event => {
              setFavorite(event.target.checked);
              setPage(1);
            }}
          />
          只看收藏
        </label>
        <span>{total} 个 Agent</span>
        <button onClick={() => setRevision(value => value + 1)}>刷新</button>
      </div>
      {error && (
        <div role="alert" className="agents-error">
          {error}
        </div>
      )}
      {creating && (
        <form
          className="agents-panel"
          onSubmit={e => {
            e.preventDefault();
            void action(async () => {
              const row = await createAgent({
                botName: name,
                botDesc: description,
                prompt: '',
                supportContext: true,
                supportUpload: true,
              });
              navigate(`/space/config/${row.id}/base`);
            });
          }}
        >
          <h2>创建提示词 Agent</h2>
          <label>
            名称
            <input
              required
              maxLength={48}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
          <label>
            描述
            <textarea
              maxLength={255}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>
          <div className="agents-actions">
            <button type="submit" className="primary" disabled={busy}>
              创建并配置
            </button>
            <button type="button" onClick={() => setCreating(false)}>
              取消
            </button>
          </div>
        </form>
      )}
      <div className="agents-grid">
        {items.map(agent => (
          <article className="agents-card" key={agent.id}>
            <div className="agents-card-heading">
              <h2>{agent.botName}</h2>
              <button
                aria-label={
                  agent.favorite
                    ? `取消收藏 ${agent.botName}`
                    : `收藏 ${agent.botName}`
                }
                disabled={busy}
                onClick={() =>
                  void action(() => favoriteAgent(agent.id, !agent.favorite))
                }
              >
                {agent.favorite ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>
            <p>{agent.botDesc || '尚未填写描述'}</p>
            <div className="agents-actions">
              <Link
                className="button primary"
                to={`/space/bot/${agent.id}/chat`}
              >
                聊天
              </Link>
              <Link className="button" to={`/space/config/${agent.id}/base`}>
                编辑与调试
              </Link>
              <button
                className="danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`删除“${agent.botName}”？`))
                    void action(() => deleteAgent(agent.id));
                }}
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </div>
      {loading && <p role="status">正在读取 Agent…</p>}
      {!loading && !items.length && !error && (
        <p className="agents-empty">
          {favorite
            ? '暂无收藏的 Agent。'
            : '暂无 Agent，创建后即可选择已有模型进行调试。'}
        </p>
      )}
      <div className="agents-actions">
        <button
          disabled={page === 1}
          onClick={() => setPage(value => value - 1)}
        >
          上一页
        </button>
        <span>第 {page} 页</span>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage(value => value + 1)}
        >
          下一页
        </button>
      </div>
    </main>
  );
}
