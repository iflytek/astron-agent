import { LLMSource, type ModelInfo, type CategoryNode } from '@/types/model';
import personalModelIcon from '@/assets/imgs/modelManage/personal-model-card-icon.svg';
import chatgptIcon from '@/assets/imgs/modelManage/providers/custom/chatgpt.svg';
import anthropicIcon from '@/assets/imgs/modelManage/providers/custom/anthropic.svg';
import googleIcon from '@/assets/imgs/modelManage/providers/custom/google.svg';
import deepseekIcon from '@/assets/imgs/modelManage/providers/custom/deepseek.svg';
import minimaxIcon from '@/assets/imgs/modelManage/providers/custom/minimax.svg';
import zhipuIcon from '@/assets/imgs/modelManage/providers/custom/zhipu.svg';
import qwenIcon from '@/assets/imgs/modelManage/providers/custom/qwen.svg';
import moonshotIcon from '@/assets/imgs/modelManage/providers/custom/moonshot.svg';
import doubaoIcon from '@/assets/imgs/modelManage/providers/custom/doubao.svg';
import sparkIcon from '@/assets/imgs/common/spark.png';
import { getOfficialEndpointAvatar } from './official-provider-catalog';

export const defaultModelAvatar = personalModelIcon;

const officialBrands: [RegExp, string][] = [
  [/deepseek|深度求索/i, deepseekIcon],
  [/anthropic|claude/i, anthropicIcon],
  [/google|gemini/i, googleIcon],
  [/minimax|abab/i, minimaxIcon],
  [/zhipu|chatglm|\bglm\b|智谱/i, zhipuIcon],
  [/qwen|通义|千问/i, qwenIcon],
  [/moonshot|kimi|月之暗面/i, moonshotIcon],
  [/doubao|豆包/i, doubaoIcon],
  [/spark|星火|讯飞|4\.0ultra/i, sparkIcon],
  [/openai|chatgpt|\bgpt[-\s]|\bo[134](?:-|\b)/i, chatgptIcon],
];

function categoryBrand(nodes: CategoryNode[] = []): string {
  return nodes
    .flatMap(node => [node.key, node.name, categoryBrand(node.children)])
    .join(' ');
}

/** Saved Model rows use their actual endpoint; protocol/name cannot establish brand. */
export function getModelAvatar(model: ModelInfo | null): string {
  if (!model) return personalModelIcon;
  if (model.llmSource === LLMSource.CUSTOM) {
    return getOfficialEndpointAvatar(model.url) || personalModelIcon;
  }
  if (model.icon) return model.icon;
  const endpointAvatar = getOfficialEndpointAvatar(model.url);
  if (endpointAvatar) return endpointAvatar;
  const vendor = categoryBrand(
    model.categoryTree?.filter(node => node.key === 'modelProvider')
  );
  const identity = [vendor, model.provider, model.name, model.domain].join(' ');
  return (
    officialBrands.find(([pattern]) => pattern.test(identity))?.[1] ||
    personalModelIcon
  );
}
