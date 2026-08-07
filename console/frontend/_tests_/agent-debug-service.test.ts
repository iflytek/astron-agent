import {
  buildDebugSessionTitle,
  type AgentDebugSession,
} from '../src/services/agent-debug';

const session: AgentDebugSession = {
  id: 'debug-1',
  botId: 1001,
  title: '  ',
  createdAt: '2026-06-04T10:00:00.000Z',
  updatedAt: '2026-06-04T10:01:00.000Z',
};

if (buildDebugSessionTitle(session) !== '未命名调试会话') {
  throw new Error('empty debug session title should use fallback text');
}
