export const ChatClawTemplate = {
  name: 'ChatClaw',
  description: 'Template for a chat application with OpenClaw skills',
  nodes: [
    {
      id: 'trigger',
      type: 'input',
      position: { x: 250, y: 0 },
      data: { label: 'User Message' }
    },
    {
      id: 'planner',
      type: 'aiPlanner',
      position: { x: 250, y: 150 },
      data: { label: 'AI Assistant Plan' }
    },
    {
      id: 'openclaw',
      type: 'openClaw',
      position: { x: 250, y: 300 },
      data: {
        skillName: 'default',
        parameters: {},
        preConditions: [],
        postConditions: []
      }
    },
    {
      id: 'respond',
      type: 'output',
      position: { x: 250, y: 450 },
      data: { label: 'AI Assistant Reply' }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger', target: 'planner' },
    { id: 'e2-3', source: 'planner', target: 'openclaw' },
    { id: 'e3-4', source: 'openclaw', target: 'respond' }
  ]
};