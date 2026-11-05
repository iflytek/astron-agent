import { useEffect, useState, type ReactElement } from 'react';
import { Button, Statistic, Alert } from 'antd';
import { useParams } from 'react-router-dom';
import FlowHeader from '../components/flow-header';
import { getFlowDetailAPI } from '@/services/flow';
import http from '@/utils/http';
import type { FlowType } from '@/components/workflow/types';

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
export default function WorkflowAnalysis(): ReactElement {
  const { id } = useParams();
  const [flow, setFlow] = useState<FlowType>();
  const [stats, setStats] = useState<WorkflowStatistics>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let ignore = false;
    if (id)
      void getFlowDetailAPI(id)
        .then(async value => {
          const result = await http.get<unknown, WorkflowStatistics>(
            '/workflow/statistics',
            { params: { flowId: value.flowId } }
          );
          if (!ignore) {
            setFlow(value);
            setStats(result);
            setError('');
          }
        })
        .catch(() => {
          if (!ignore) setError('无法读取运行统计');
        });
    return () => {
      ignore = true;
    };
  }, [id, revision]);
  return (
    <div className="h-full overflow-auto">
      <FlowHeader currentFlow={flow} />
      <main className="p-8">
        <div className="flex justify-between mb-6">
          <h1 className="text-xl font-semibold">运行统计</h1>
          <Button onClick={() => setRevision(value => value + 1)}>刷新</Button>
        </div>
        {error && <Alert type="error" message={error} />}
        {stats && (
          <div className="grid grid-cols-3 gap-6">
            {(
              [
                ['全部运行', 'total'],
                ['已完成', 'completed'],
                ['失败', 'failed'],
                ['已取消', 'cancelled'],
                ['中断', 'interrupted'],
                ['等待恢复', 'paused'],
                ['运行中', 'running'],
                ['Token 用量', 'totalTokens'],
                ['平均用时（毫秒）', 'averageDurationMs'],
              ] as const
            ).map(([title, key]) => (
              <div className="bg-white rounded-xl p-6" key={key}>
                <Statistic title={title} value={stats[key]} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
