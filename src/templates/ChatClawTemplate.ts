export const chatClawTemplate = {
  name: 'ChatClaw 应用模板',
  description: '开箱即用的“触发-规划-执行-回复”闭环编排流程',
  nodes: [
    {
      id: 'trigger',
      type: 'triggerNode',
      position: { x: 100, y: 200 },
      data: { label: '用户消息触发' },
    },
    {
      id: 'planner',
      type: 'llmNode',
      position: { x: 300, y: 200 },
      data: { label: 'AI 助手规划', config: { model: 'gpt-4', promptTemplate: '根据用户消息决定调用哪个 OpenClaw Skill' } },
    },
    {
      id: 'openclaw',
      type: 'openClawNode',
      position: { x: 500, y: 200 },
      data: { label: '调用 OpenClaw', config: { skillUrl: '', inputMapping: '{}', outputMapping: '{}' } },
    },
    {
      id: 'responder',
      type: 'llmNode',
      position: { x: 700, y: 200 },
      data: { label: 'AI 助手回复', config: { model: 'gpt-4', promptTemplate: '基于 OpenClaw 结果生成自然语言回答' } },
    },
    {
      id: 'end',
      type: 'endNode',
      position: { x: 900, y: 200 },
      data: { label: '结束' },
    },
  ],
  edges: [
    { id: 'e-trigger-planner', source: 'trigger', target: 'planner' },
    { id: 'e-planner-openclaw', source: 'planner', target: 'openclaw' },
    { id: 'e-openclaw-responder', source: 'openclaw', target: 'responder' },
    { id: 'e-responder-end', source: 'responder', target: 'end' },
  ],
};

export default chatClawTemplate;