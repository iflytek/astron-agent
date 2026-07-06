const chatClawTemplate = {
  name: 'ChatClaw',
  description: 'OpenClaw-powered chat application with trigger-plan-execute-reply flow.',
  nodes: [
    {
      id: '1',
      type: 'input',
      position: { x: 250, y: 25 },
      data: { label: 'User Message' },
    },
    {
      id: '2',
      type: 'default',
      position: { x: 250, y: 150 },
      data: { label: 'AI Planner' },
    },
    {
      id: '3',
      type: 'openClaw',
      position: { x: 250, y: 275 },
      data: {
        label: 'OpenClaw Action',
        config: {
          skillName: '',
          inputParams: '{}',
          outputParams: '{}',
        },
      },
    },
    {
      id: '4',
      type: 'default',
      position: { x: 250, y: 400 },
      data: { label: 'Execution Result' },
    },
    {
      id: '5',
      type: 'output',
      position: { x: 250, y: 525 },
      data: { label: 'AI Reply' },
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
    { id: 'e4-5', source: '4', target: '5', animated: true },
  ],
};

export default chatClawTemplate;
