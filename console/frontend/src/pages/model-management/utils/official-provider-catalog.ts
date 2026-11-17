import { ModelProviderType } from '@/types/model';
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

const openai = { endpoint: 'https://api.openai.com/v1', icon: chatgptIcon };

// The configuration directory and saved-model branding share these identities.
export const officialProviderCatalog: Record<
  ModelProviderType,
  { endpoint: string; icon: string }
> = {
  [ModelProviderType.CHATGPT]: openai,
  [ModelProviderType.OPENAI]: openai,
  [ModelProviderType.ANTHROPIC]: {
    endpoint: 'https://api.anthropic.com',
    icon: anthropicIcon,
  },
  [ModelProviderType.GOOGLE]: {
    endpoint: 'https://generativelanguage.googleapis.com',
    icon: googleIcon,
  },
  [ModelProviderType.MINIMAX]: {
    endpoint: 'https://api.minimaxi.com/v1',
    icon: minimaxIcon,
  },
  [ModelProviderType.ZHIPU]: {
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    icon: zhipuIcon,
  },
  [ModelProviderType.QWEN]: {
    endpoint:
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    icon: qwenIcon,
  },
  [ModelProviderType.MOONSHOT]: {
    endpoint: 'https://api.moonshot.cn/v1',
    icon: moonshotIcon,
  },
  [ModelProviderType.DOUBAO]: {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    icon: doubaoIcon,
  },
  [ModelProviderType.DEEPSEEK]: {
    endpoint: 'https://api.deepseek.com/v1',
    icon: deepseekIcon,
  },
};

const officialHostIcons = new Map(
  Object.values(officialProviderCatalog).map(({ endpoint, icon }) => [
    new URL(endpoint).hostname,
    icon,
  ])
);

// Explicit regional hosts; never match arbitrary subdomains or provider-like text.
// https://www.alibabacloud.com/help/en/model-studio/base-url
// https://github.com/MiniMax-AI/MiniMax-MCP
// https://platform.kimi.ai/docs/get-your-api-key
// https://docs.z.ai/api-reference/llm/chat-completion
// https://docs.byteplus.com/en/docs/modelark/text-generation
const regionalHosts: [string, string][] = [
  ['dashscope-intl.aliyuncs.com', qwenIcon],
  ['dashscope-us.aliyuncs.com', qwenIcon],
  ['cn-hongkong.dashscope.aliyuncs.com', qwenIcon],
  ['api.minimax.io', minimaxIcon],
  ['api.moonshot.ai', moonshotIcon],
  ['api.z.ai', zhipuIcon],
  ['ark.ap-southeast.bytepluses.com', doubaoIcon],
  // Existing project endpoints: platform-account-management, docker .env and CONFIGURATION.md.
  ['spark-api-open.xf-yun.com', sparkIcon],
  ['spark-api.xf-yun.com', sparkIcon],
  ['spark-openapi.cn-huabei-1.xf-yun.com', sparkIcon],
  ['maas-api.cn-huabei-1.xf-yun.com', sparkIcon],
];
for (const [host, icon] of regionalHosts) officialHostIcons.set(host, icon);

export function getOfficialEndpointAvatar(
  endpoint?: string | null
): string | undefined {
  if (!endpoint) return undefined;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return officialHostIcons.get(url.hostname);
  } catch {
    return undefined;
  }
}
