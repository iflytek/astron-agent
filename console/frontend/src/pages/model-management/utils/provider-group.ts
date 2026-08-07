import { ModelInfo, ModelProviderType } from '@/types/model';

/**
 * 将模型提供商映射到实际厂商
 */
export function mapProviderToVendor(provider?: string | null): string {
  if (!provider) return ModelProviderType.OPENAI;

  // OpenAI兼容的厂商
  const openaiCompatibleProviders = [
    ModelProviderType.OPENAI,
    ModelProviderType.CHATGPT,
    ModelProviderType.DEEPSEEK,
    ModelProviderType.MINIMAX,
    ModelProviderType.ZHIPU,
    ModelProviderType.QWEN,
    ModelProviderType.MOONSHOT,
    ModelProviderType.DOUBAO,
  ];

  if (openaiCompatibleProviders.includes(provider as ModelProviderType)) {
    return ModelProviderType.OPENAI;
  }

  // Anthropic厂商
  if (provider === ModelProviderType.ANTHROPIC) {
    return ModelProviderType.ANTHROPIC;
  }

  // Google厂商
  if (provider === ModelProviderType.GOOGLE) {
    return ModelProviderType.GOOGLE;
  }

  // 默认返回OpenAI兼容厂商
  return ModelProviderType.OPENAI;
}

/**
 * 获取实际厂商的显示名称
 */
export function getVendorDisplayName(vendor: string): string {
  switch (vendor) {
    case ModelProviderType.ANTHROPIC:
      return 'Anthropic'; // Claude
    case ModelProviderType.GOOGLE:
      return 'Google'; // Gemini
    case ModelProviderType.OPENAI:
    default:
      return 'OpenAI'; // ChatGPT, MiniMax, Zhipu AI, Qwen, etc.
  }
}

/**
 * 获取用于添加模型的厂商选项
 */
export function getSimpleVendorOptions(): Array<{
  label: string;
  value: string;
}> {
  return [
    { label: 'OpenAI', value: ModelProviderType.OPENAI },
    { label: 'Anthropic', value: ModelProviderType.ANTHROPIC },
    { label: 'Google', value: ModelProviderType.GOOGLE },
  ];
}

/**
 * 获取所有可用的实际厂商选项（用于筛选）
 */
export function getVendorOptions(): Array<{ label: string; value: string }> {
  return [
    { label: 'OpenAI', value: ModelProviderType.OPENAI },
    { label: 'Anthropic', value: ModelProviderType.ANTHROPIC },
    { label: 'Google', value: ModelProviderType.GOOGLE },
  ];
}

/**
 * 获取所有可用的具体提供商选项（用于官方模型页面）
 */
export function getSpecificProviderOptions(): Array<{
  label: string;
  value: string;
}> {
  return [
    { label: 'ChatGPT (OpenAI)', value: ModelProviderType.CHATGPT },
    { label: 'Claude (Anthropic)', value: ModelProviderType.ANTHROPIC },
    { label: 'Gemini (Google)', value: ModelProviderType.GOOGLE },
    { label: 'MiniMax', value: ModelProviderType.MINIMAX },
    { label: 'Zhipu AI', value: ModelProviderType.ZHIPU },
    { label: 'Qwen (Alibaba)', value: ModelProviderType.QWEN },
    { label: 'Moonshot', value: ModelProviderType.MOONSHOT },
    { label: 'Doubao (ByteDance)', value: ModelProviderType.DOUBAO },
    { label: 'DeepSeek', value: ModelProviderType.DEEPSEEK },
  ];
}

/**
 * 获取模型所属的实际厂商
 */
export function getModelVendor(model: ModelInfo): string {
  return mapProviderToVendor(model.provider);
}
