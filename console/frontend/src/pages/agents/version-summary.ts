import type { AgentDefinition, AgentResourceOptions } from '@/services/agents';

/** Match the Console's prompt_for selection for an immutable snapshot. */
export function versionPrompt(definition: Partial<AgentDefinition>): string {
  return definition.promptType === 1 && definition.promptSections?.length
    ? definition.promptSections
        .map(section => `${section.key}\n${section.value}`)
        .join('\n')
    : definition.prompt || '';
}

/** modelId is the execution reference; legacy model text may be stale. */
export function versionModel(
  definition: Partial<AgentDefinition>,
  models: AgentResourceOptions['models'] = []
): string {
  if (definition.modelId)
    return (
      models.find(model => model.id === definition.modelId)?.name ||
      `模型 #${definition.modelId}`
    );
  return definition.model || '未配置模型';
}
