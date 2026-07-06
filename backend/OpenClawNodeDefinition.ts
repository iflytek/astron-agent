import { NodeDefinition, NodeExecutionResult } from '@astron-agent/core';

export class OpenClawNode implements NodeDefinition {
  type = 'openclaw';
  label = 'OpenClaw Skill';
  description = '调用 OpenClaw 技能并处理输入/输出';

  configSchema = {
    properties: {
      skillId: { type: 'string', title: '技能 ID' },
      inputParams: { type: 'object', title: '输入参数' },
      outputMapping: { type: 'object', title: '输出映射' },
      preConditions: { type: 'array', items: { type: 'string' }, title: '前置条件' },
      postConditions: { type: 'array', items: { type: 'string' }, title: '后置条件' },
    },
    required: ['skillId'],
  };

  async execute(config: any, context: any): Promise<NodeExecutionResult> {
    // 实际调用 OpenClaw API
    const result = await mockOpenClawCall(config.skillId, config.inputParams);
    return { output: result, next: ['success'] };
  }
}

async function mockOpenClawCall(skillId: string, params: any) {
  // 模拟执行
  return { success: true, data: { reply: '这是来自 OpenClaw 的回复' } };
}
