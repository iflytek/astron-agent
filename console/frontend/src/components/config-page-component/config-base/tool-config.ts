export type ToolConfig = Record<string, boolean>;

const BUILT_IN_TOOL_KEYS = new Set([
  'web_search',
  'ifly_search',
  'current_time',
]);

const NEW_WORKBENCH_TOOL_OVERRIDES: ToolConfig = {
  text_to_image: false,
  codeinterpreter: false,
};

export const getEffectiveToolConfig = (
  toolConfig: ToolConfig | undefined,
  isNewWorkbench: boolean
): ToolConfig => {
  const baseConfig = normalizeToolConfig(toolConfig);
  if (!isNewWorkbench) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...NEW_WORKBENCH_TOOL_OVERRIDES,
  };
};

export const serializeOpenedTool = (
  toolConfig: ToolConfig | undefined
): string => {
  const normalized = normalizeToolConfig(toolConfig);
  return Object.keys(normalized)
    .filter(key => normalized[key])
    .join(',');
};

const normalizeToolConfig = (
  toolConfig: ToolConfig | undefined
): ToolConfig => {
  const normalized = { ...(toolConfig ?? {}) };
  BUILT_IN_TOOL_KEYS.forEach(toolKey => delete normalized[toolKey]);
  return normalized;
};
