import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Empty, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import http from '@/utils/http';

interface WorkflowStatistics {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  interrupted: number;
  paused: number;
  running: number;
  totalTokens: number;
  averageDurationMs: number;
}

export default function WorkflowAnalysis({
  flowId,
}: {
  flowId: string;
}): ReactElement {
  const [stats, setStats] = useState<WorkflowStatistics>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setStats(undefined);
    void http
      .get<unknown, WorkflowStatistics>('/workflow/statistics', {
        params: { flowId },
      })
      .then(result => {
        if (!ignore) setStats(result);
      })
      .catch(() => {
        if (!ignore) setError('运行统计加载失败，请重试。');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [flowId, revision]);
  return (
    <section className="workflow-insight" aria-label="工作流运行分析">
      <div className="workflow-dialog-toolbar">
        <p>查看工作流的整体运行情况与资源用量。</p>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setRevision(value => value + 1)}
        >
          刷新
        </Button>
      </div>
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
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        stats &&
        (stats.total ? (
          <>
            <div className="workflow-analysis-summary">
              <div>
                <span>全部运行</span>
                <strong>{stats.total.toLocaleString()}</strong>
              </div>
              <div>
                <span>成功率</span>
                <strong>
                  {((stats.completed / stats.total) * 100).toFixed(1)}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>平均用时</span>
                <strong>
                  {(stats.averageDurationMs / 1000).toFixed(2)}
                  <small>秒</small>
                </strong>
              </div>
            </div>
            <h3>运行状态</h3>
            <dl className="workflow-analysis-states">
              {(
                [
                  ['已完成', 'completed'],
                  ['失败', 'failed'],
                  ['运行中', 'running'],
                  ['已停止', 'cancelled'],
                  ['已中断', 'interrupted'],
                  ['等待恢复', 'paused'],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{stats[key].toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <div className="workflow-analysis-usage">
              <span>累计 Token 用量</span>
              <strong>{stats.totalTokens.toLocaleString()}</strong>
            </div>
          </>
        ) : (
          <Empty description="还没有运行记录。完成一次测试运行后，即可在这里查看统计。" />
        ))
      )}
    </section>
  );
}
