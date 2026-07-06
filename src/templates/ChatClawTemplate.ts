export const chatClawTemplate = {
  name: 'ChatClaw',
  description: 'Standard ChatClaw workflow: trigger -> plan -> execute -> reply',
  nodes: [
    {
      id: 'trigger',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'User Message' }
    },
    {
      id: 'ai-plan',
      type: 'ai-assistant',
      position: { x: 300, y: 200 },
      data: { action: 'plan' }
    },
    {
      id: 'openclaw',
      type: 'openclaw',
      position: { x: 500, y: 200 },
      data: {
        skillId: '',
        inputParams: {},
        outputParams: []
      }
    },
    {
      id: 'ai-reply',
      type: 'ai-assistant',
      position: { x: 700, y: 200 },
      data: { action: 'reply' }
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 900, y: 200 },
      data: { label: 'ChatClaw Reply' }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'ai-plan' },
    { id: 'e2', source: 'ai-plan', target: 'openclaw' },
    { id: 'e3', source: 'openclaw', target: 'ai-reply' },
    { id: 'e4', source: 'ai-reply', target: 'output' }
  ]
};