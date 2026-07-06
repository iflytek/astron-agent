import { WorkflowTemplate } from '../types';

export const chatClawTemplate: WorkflowTemplate = {
  id: 'chat-claw-default',
  name: 'ChatClaw Application',
  description: 'Trigger -> Plan -> Execute OpenClaw -> Reply',
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: { label: 'User Message', triggerType: 'message' },
    },
    {
      id: 'planner',
      type: 'llm',
      position: { x: 300, y: 100 },
      data: { label: 'AI Assistant Planner', model: 'gpt-4', prompt: '...' },
    },
    {
      id: 'openclaw',
      type: 'openclaw',
      position: { x: 500, y: 100 },
      data: { skillName: '', inputParams: {} },
    },
    {
      id: 'reply',
      type: 'llm',
      position: { x: 700, y: 100 },
      data: { label: 'AI Assistant Reply', model: 'gpt-4', prompt: '...' },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'planner' },
    { id: 'e2', source: 'planner', target: 'openclaw' },
    { id: 'e3', source: 'openclaw', target: 'reply' },
  ],
};