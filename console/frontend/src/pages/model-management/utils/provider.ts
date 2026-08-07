import { ModelInfo, ModelProviderType } from '@/types/model';
import i18next from 'i18next';
import { mapProviderToVendor } from './provider-group';

export const DEFAULT_MODEL_PROVIDER = ModelProviderType.OPENAI;

export function normalizeModelProvider(
  provider?: string | null
): ModelProviderType | string {
  return provider || DEFAULT_MODEL_PROVIDER;
}

export function getModelProviderLabel(provider?: string | null): string {
  const normalizedProvider = normalizeModelProvider(provider);
  if (normalizedProvider === ModelProviderType.MINIMAX) {
    return i18next.t('model.providerMiniMax');
  }
  if (normalizedProvider === ModelProviderType.ZHIPU) {
    return i18next.t('model.providerZhipu');
  }
  if (normalizedProvider === ModelProviderType.QWEN) {
    return i18next.t('model.providerQwen');
  }
  if (normalizedProvider === ModelProviderType.MOONSHOT) {
    return i18next.t('model.providerMoonshot');
  }
  if (normalizedProvider === ModelProviderType.CHATGPT) {
    return i18next.t('model.providerChatGPT');
  }
  if (normalizedProvider === ModelProviderType.DOUBAO) {
    return i18next.t('model.providerDoubao');
  }
  if (normalizedProvider === ModelProviderType.DEEPSEEK) {
    return i18next.t('model.providerDeepSeek');
  }
  if (normalizedProvider === ModelProviderType.ANTHROPIC) {
    return i18next.t('model.providerAnthropic');
  }
  if (normalizedProvider === ModelProviderType.GOOGLE) {
    return i18next.t('model.providerGoogle');
  }

  return i18next.t('model.providerOpenAI');
}

export function getModelProviderFromInfo(model: ModelInfo): string {
  return String(normalizeModelProvider(model.provider));
}

/**
 * 获取模型的厂商分组标识符
 */
export function getModelVendorIdentifier(model: ModelInfo): string {
  return mapProviderToVendor(model.provider);
}

/**
 * 获取厂商分组的显示标签
 */
export function getVendorGroupLabel(vendor: string): string {
  switch (vendor) {
    case ModelProviderType.ANTHROPIC:
      return i18next.t('model.providerAnthropic');
    case ModelProviderType.GOOGLE:
      return i18next.t('model.providerGoogle');
    case ModelProviderType.OPENAI:
    default:
      return i18next.t('model.providerOpenAI'); // 使用"OpenAI兼容"作为统一分组
  }
}
