import { MarkerType } from 'reactflow';

export const chatClawTemplate = {
  id: 'chat-claw-template',
  name: 'ChatClaw Application',
  description: 'OpenClaw powered chatbot with planning and execution.',
  nodes: [
    {
      id: 'trigger',
      type: 'input',
      position: { x: 250, y: 0 },
      data: { label: 'User Message Trigger' },
    },
    {
      id: 'planner',
      type: 'aiAgent',
      position: { x: 250, y: 150 },
      data: { label: 'AI Assistant Planning', agentId: 'default-planner' },
    },
    {
      id: 'openclaw',
      type: 'openClaw',
      position: { x: 250, y: 300 },
      data: { label: 'OpenClaw Action', skill: '', params: {}, conditions: { pre: '', post: '' } },
    },
    {
      id: 'responder',
      type: 'aiAgent',
      position: { x: 250, y: 450 },
      data: { label: 'AI Assistant Reply', agentId: 'default-responder' },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 250, y: 600 },
      data: { label: 'Final Response' },
    },
  ],
  edges: [
    { id: 'e-trigger-planner', source: 'trigger', target: 'planner', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-planner-openclaw', source: 'planner', target: 'openclaw', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-openclaw-responder', source: 'openclaw', target: 'responder', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-responder-output', source: 'responder', target: 'output', markerEnd: { type: MarkerType.ArrowClosed } },
  ],
};

export default chatClawTemplate;