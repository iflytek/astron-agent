export const chatClawTemplate = {
  name: 'ChatClaw Application',
  description: 'A pre-built workflow for a conversational agent that uses OpenClaw skills.',
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 250, y: 0 },
      data: { label: 'User Message Trigger' },
    },
    {
      id: 'planner',
      type: 'llm',
      position: { x: 250, y: 150 },
      data: { label: 'AI Assistant Planner', model: 'gpt-4', prompt: 'Plan the next action based on user input.' },
    },
    {
      id: 'openclaw',
      type: 'openclaw',
      position: { x: 250, y: 300 },
      data: {
        label: 'OpenClaw Execution',
        skillId: '',
        inputParams: {},
        outputParams: {},
        preConditions: [],
        postConditions: [],
      },
    },
    {
      id: 'response',
      type: 'llm',
      position: { x: 250, y: 450 },
      data: { label: 'AI Assistant Reply', model: 'gpt-4', prompt: 'Generate a response based on the OpenClaw result.' },
    },
  ],
  edges: [
    { id: 'e-trigger-planner', source: 'trigger', target: 'planner' },
    { id: 'e-planner-openclaw', source: 'planner', target: 'openclaw' },
    { id: 'e-openclaw-response', source: 'openclaw', target: 'response' },
  ],
};