import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '@/utils/http';
import { errorText } from '@/pages/agents/errors';
import '@/pages/agents/style.css';
interface Item {
  botId: number;
  botName: string;
  botDesc: string;
  isFavorite: boolean;
}
export default function Market() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    http
      .get<unknown, { records: Item[]; total: number }>(
        '/home-page/agent-square/get-bot-page-by-type',
        { params: { search, page, size: 20 } }
      )
      .then(data => {
        if (active) {
          setItems(data.records);
          setTotal(data.total);
          setError('');
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [search, page, revision]);
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <h1>Agent 市场</h1>
          <p>使用已发布的 Agent 和工作流。</p>
        </div>
        <Link to="/management/release">管理我的发布</Link>
      </header>
      <input
        aria-label="搜索市场"
        placeholder="搜索名称"
        value={search}
        onChange={event => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {error && (
        <p role="alert" className="agents-error">
          {error}
        </p>
      )}
      <div className="agents-grid">
        {items.map(item => (
          <article className="agents-card" key={item.botId}>
            <h2>{item.botName}</h2>
            <p>{item.botDesc}</p>
            <div className="agents-actions">
              <Link className="button primary" to={`/published/${item.botId}`}>
                开始使用
              </Link>
              <button
                onClick={() =>
                  void http
                    .post(
                      `/bot/favorite/${item.isFavorite ? 'delete' : 'create'}`,
                      { botId: item.botId }
                    )
                    .then(() => setRevision(value => value + 1))
                    .catch(reason => setError(errorText(reason)))
                }
              >
                {item.isFavorite ? '取消收藏' : '收藏'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!items.length && <p>暂无符合条件的发布。</p>}
      <div className="agents-actions">
        <button
          disabled={page === 1}
          onClick={() => setPage(value => value - 1)}
        >
          上一页
        </button>
        <span>{page}</span>
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
