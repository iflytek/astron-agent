import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Spin } from 'antd';
import styles from './index.module.scss';
import http from '@/utils/http';
import { errorText } from '@/pages/agents/errors';

interface Summary {
  totalChats: number;
  totalUsers: number;
  totalTokens: number;
  usageComplete: boolean;
  completedChats: number;
  failedChats: number;
}
interface Day {
  date: string;
  totalChats: number;
  totalUsers: number;
  totalTokens: number;
}
interface Trace {
  id: string;
  status: string;
  createdTime: string;
  versionId: number | null;
}
interface Version {
  id: number;
  versionId: number;
  createdTime: string;
}

export default function Analytics({ botId }: { botId: number }): ReactElement {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [versionPage, setVersionPage] = useState(1);
  const [versionTotal, setVersionTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const base = `/publish/bots/${botId}`;
    void Promise.all([
      http.get<unknown, Summary>(`${base}/summary`),
      http.get<unknown, { data: Day[] }>(`${base}/timeseries`, {
        params: { days: 7 },
      }),
      http.get<unknown, { records: Trace[]; total: number }>(`${base}/trace`, {
        params: { page, size: 20 },
      }),
      http.get<unknown, { records: Version[]; total: number }>(
        `${base}/versions`,
        { params: { page: versionPage, size: 20 } }
      ),
    ])
      .then(([overview, series, runs, snapshots]) => {
        if (!active) return;
        setSummary(overview);
        setDays(series.data);
        setTraces(runs.records);
        setTotal(runs.total);
        setVersions(snapshots.records);
        setVersionTotal(snapshots.total);
        setError('');
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
  }, [botId, page, versionPage, revision]);
  return (
    <section>
      <h2>使用分析与版本</h2>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {loading && (
        <div role="status">
          <Spin /> 正在读取分析与版本…
        </div>
      )}
      {!loading && !error && (
        <>
          {summary && (
            <>
              <p>
                会话 {summary.totalChats} · 用户 {summary.totalUsers} ·
                新记录完成 {summary.completedChats} · 失败 {summary.failedChats}
              </p>
              <p>
                已记录 Token：{summary.totalTokens}
                {!summary.usageComplete && '（部分运行未返回用量）'}
              </p>
            </>
          )}
          <h3>最近七天</h3>
          {!days.length && <p>暂无用量记录。</p>}
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>会话</th>
                  <th>用户</th>
                  <th>已记录 Token</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{day.totalChats}</td>
                    <td>{day.totalUsers}</td>
                    <td>{day.totalTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>运行记录</h3>
          {!traces.length && <p>暂无运行记录。</p>}
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>运行</th>
                  <th>版本</th>
                  <th>状态</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {traces.map(run => (
                  <tr key={run.id}>
                    <td>{run.id}</td>
                    <td>{run.versionId ?? '草稿'}</td>
                    <td>{run.status}</td>
                    <td>{run.createdTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <Button
              disabled={page === 1}
              onClick={() => setPage(value => value - 1)}
            >
              上一页
            </Button>
            <span>{page}</span>
            <Button
              disabled={page * 20 >= total}
              onClick={() => setPage(value => value + 1)}
            >
              下一页
            </Button>
          </div>
          <h3>发布快照</h3>
          {!versions.length && <p>暂无发布快照。</p>}
          <ul className={styles.versionList}>
            {versions.map(version => (
              <li key={version.id}>
                版本 {version.versionId} · {version.createdTime}
              </li>
            ))}
          </ul>
          <div className={styles.pagination}>
            <Button
              disabled={versionPage === 1}
              onClick={() => setVersionPage(value => value - 1)}
            >
              上一页版本
            </Button>
            <span>{versionPage}</span>
            <Button
              disabled={versionPage * 20 >= versionTotal}
              onClick={() => setVersionPage(value => value + 1)}
            >
              下一页版本
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
