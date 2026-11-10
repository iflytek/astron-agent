import { useEffect, useState } from 'react';
import { Alert, Button, Input, Spin } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import http from '@/utils/http';
import { errorText } from '@/pages/agents/errors';
import styles from './index.module.scss';
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
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    http
      .get<unknown, { records: Item[]; total: number }>(
        '/home-page/agent-square/get-bot-page-by-type',
        { params: { search, page, size: 20 } }
      )
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
  }, [search, page, revision]);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Agent 市场</h1>
          <p>发现并使用已发布的 Agent 和工作流。</p>
        </div>
        <Button href="/management/release">管理我的发布</Button>
      </header>
      <div className={styles.toolbar}>
        <Input
          aria-label="搜索市场"
          placeholder="搜索名称"
          allowClear
          style={{ width: 300, maxWidth: '100%' }}
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {actionError && <Alert type="error" showIcon message={actionError} />}
      {error && (
        <Alert
          type="error"
          showIcon
          message="无法读取市场"
          description={error}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {loading ? (
        <div role="status" className={styles.empty}>
          <Spin />
          <p>正在读取市场…</p>
        </div>
      ) : (
        !error && (
          <>
            <div className={styles.grid}>
              {items.map(item => (
                <article className={styles.marketCard} key={item.botId}>
                  <h2>{item.botName}</h2>
                  <p>{item.botDesc || '暂无描述'}</p>
                  <div className={styles.actions}>
                    <Button type="primary" href={`/published/${item.botId}`}>
                      开始使用
                    </Button>
                    <Button
                      icon={item.isFavorite ? <StarFilled /> : <StarOutlined />}
                      aria-pressed={item.isFavorite}
                      loading={busy === item.botId}
                      disabled={busy !== null}
                      onClick={() => {
                        setBusy(item.botId);
                        setActionError('');
                        void http
                          .post(
                            `/bot/favorite/${item.isFavorite ? 'delete' : 'create'}`,
                            { botId: item.botId }
                          )
                          .then(() => setRevision(value => value + 1))
                          .catch(reason => setActionError(errorText(reason)))
                          .finally(() => setBusy(null));
                      }}
                    >
                      {item.isFavorite ? '取消收藏' : '收藏'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {!items.length && (
              <section className={styles.empty}>
                <h2>{search ? '没有匹配的发布' : '市场暂无发布'}</h2>
                <p>
                  {search
                    ? '试试其他名称，或清除搜索条件。'
                    : '发布 Agent 到市场后，即可在这里使用。'}
                </p>
                {search ? (
                  <Button onClick={() => setSearch('')}>清除搜索</Button>
                ) : (
                  <Button href="/management/release">前往发布管理</Button>
                )}
              </section>
            )}
            {total > 0 && (
              <div className={styles.pagination}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(value => value - 1)}
                >
                  上一页
                </Button>
                <span>
                  第 {page} 页 · 共 {total} 个发布
                </span>
                <Button
                  disabled={page * 20 >= total}
                  onClick={() => setPage(value => value + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )
      )}
    </main>
  );
}
