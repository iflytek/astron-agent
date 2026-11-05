import { useEffect, useState, type ReactElement } from 'react';
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
  useEffect(() => {
    let active = true;
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
      });
    return () => {
      active = false;
    };
  }, [botId, page, versionPage]);
  return (
    <section className="agents-panel">
      <h2>使用分析与版本</h2>
      {error && (
        <p role="alert" className="agents-error">
          {error}
        </p>
      )}
      {summary && (
        <>
          <p>
            会话 {summary.totalChats} · 用户 {summary.totalUsers} · 新记录完成{' '}
            {summary.completedChats} · 失败 {summary.failedChats}
          </p>
          <p>
            已记录 Token：{summary.totalTokens}
            {!summary.usageComplete && '（部分运行未返回用量）'}
          </p>
        </>
      )}
      <h3>最近七天</h3>
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
      <h3>运行记录</h3>
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
      <h3>发布快照</h3>
      <ul>
        {versions.map(version => (
          <li key={version.id}>
            版本 {version.versionId} · {version.createdTime}
          </li>
        ))}
      </ul>
      <div className="agents-actions">
        <button
          disabled={versionPage === 1}
          onClick={() => setVersionPage(value => value - 1)}
        >
          上一页版本
        </button>
        <span>{versionPage}</span>
        <button
          disabled={versionPage * 20 >= versionTotal}
          onClick={() => setVersionPage(value => value + 1)}
        >
          下一页版本
        </button>
      </div>
    </section>
  );
}
