import type { AgentRun } from '@/services/agents';

export type RunEvent = { type: string; data: Record<string, unknown> };

/** Events append to the actual attempt; failure never erases already received output. */
export function reduceRun(run: AgentRun, event: RunEvent): AgentRun {
  const data = event.data;
  if (event.type === 'run')
    return { ...run, id: String(data.id), status: 'running' };
  if (event.type === 'delta')
    return {
      ...run,
      answer:
        run.answer + (typeof data.content === 'string' ? data.content : ''),
      reasoning:
        (run.reasoning || '') +
        (typeof data.reasoningContent === 'string'
          ? data.reasoningContent
          : ''),
    };
  if (event.type === 'end')
    return {
      ...run,
      id: data.id ? String(data.id) : run.id,
      status: ['completed', 'failed', 'cancelled', 'interrupted'].includes(
        String(data.status)
      )
        ? (data.status as AgentRun['status'])
        : 'interrupted',
    };
  if (event.type === 'error')
    return { ...run, status: 'failed', events: [...(run.events || []), event] };
  if (event.type === 'tool' || event.type === 'knowledge')
    return { ...run, events: [...(run.events || []), event] };
  return run;
}

export function interruptRun(run: AgentRun, message: string): AgentRun {
  if (run.status !== 'running') return run;
  return {
    ...run,
    status: 'interrupted',
    events: [...(run.events || []), { type: 'error', data: { message } }],
  };
}

export const statusText: Record<AgentRun['status'], string> = {
  running: '生成中',
  completed: '已完成',
  failed: '执行失败',
  cancelled: '已停止',
  interrupted: '连接中断',
};
