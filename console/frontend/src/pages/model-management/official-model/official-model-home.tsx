import React, { useMemo, useState } from 'react';
import { Button, Empty, Select } from 'antd';
import styles from '../model-workspace.module.scss';
import { useTranslation } from 'react-i18next';
import ModelManagementHeader from '../components/model-management-header';
import { CreateModal } from '../components/modal-component';
import { ModelProvider, useModelContext } from '../context/model-context';
import { ModelProviderType } from '@/types/model';
import { getModelProviderLabel } from '../utils/provider';
import { getSpecificProviderOptions } from '../utils/provider-group';
import chatgptIcon from '@/assets/imgs/modelManage/providers/custom/chatgpt.svg';
import anthropicIcon from '@/assets/imgs/modelManage/providers/custom/anthropic.svg';
import googleIcon from '@/assets/imgs/modelManage/providers/custom/google.svg';
import deepseekIcon from '@/assets/imgs/modelManage/providers/custom/deepseek.svg';
import minimaxIcon from '@/assets/imgs/modelManage/providers/custom/minimax.svg';
import zhipuIcon from '@/assets/imgs/modelManage/providers/custom/zhipu.svg';
import qwenIcon from '@/assets/imgs/modelManage/providers/custom/qwen.svg';
import moonshotIcon from '@/assets/imgs/modelManage/providers/custom/moonshot.svg';
import doubaoIcon from '@/assets/imgs/modelManage/providers/custom/doubao.svg';

interface OfficialProviderCard {
  provider: ModelProviderType;
  title: string;
  subtitle: string;
  description: string;
  endpoint: string;
}

const ProviderLogoGlyph: React.FC<{ provider: ModelProviderType }> = ({
  provider,
}) => {
  const imageLogoMap: Record<ModelProviderType, string> = {
    [ModelProviderType.CHATGPT]: chatgptIcon,
    [ModelProviderType.OPENAI]: chatgptIcon,
    [ModelProviderType.ANTHROPIC]: anthropicIcon,
    [ModelProviderType.DEEPSEEK]: deepseekIcon,
    [ModelProviderType.GOOGLE]: googleIcon,
    [ModelProviderType.MINIMAX]: minimaxIcon,
    [ModelProviderType.ZHIPU]: zhipuIcon,
    [ModelProviderType.QWEN]: qwenIcon,
    [ModelProviderType.MOONSHOT]: moonshotIcon,
    [ModelProviderType.DOUBAO]: doubaoIcon,
  };

  return (
    <img
      src={imageLogoMap[provider]}
      alt={getModelProviderLabel(provider)}
      className="h-8 w-8 object-contain"
    />
  );
};

const OfficialModelContent: React.FC = () => {
  const { t } = useTranslation();
  const { actions } = useModelContext();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<OfficialProviderCard | null>(
    null
  );

  const handleProviderChange = (provider?: string): void => {
    setSelectedProvider(provider || '');
  };

  const providerCards = useMemo<OfficialProviderCard[]>(
    () => [
      {
        provider: ModelProviderType.CHATGPT,
        title: 'ChatGPT',
        subtitle: 'GPT-4o / GPT-4.1',
        description: t('model.providerCardChatGPTDesc'),
        endpoint: 'https://api.openai.com/v1',
      },
      {
        provider: ModelProviderType.ANTHROPIC,
        title: 'Claude',
        subtitle: 'Sonnet / Opus',
        description: t('model.providerCardAnthropicDesc'),
        endpoint: 'https://api.anthropic.com',
      },
      {
        provider: ModelProviderType.GOOGLE,
        title: 'Gemini',
        subtitle: '2.5 Flash / 2.5 Pro',
        description: t('model.providerCardGoogleDesc'),
        endpoint: 'https://generativelanguage.googleapis.com',
      },
      {
        provider: ModelProviderType.MINIMAX,
        title: 'MiniMax',
        subtitle: 'MiniMax-M3 / MiniMax-M2.7',
        description: t('model.providerCardMiniMaxDesc'),
        endpoint: 'https://api.minimaxi.com/v1',
      },
      {
        provider: ModelProviderType.ZHIPU,
        title: 'Zhipu AI',
        subtitle: 'GLM-4.5 / GLM-4-Flash',
        description: t('model.providerCardZhipuDesc'),
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      },
      {
        provider: ModelProviderType.QWEN,
        title: 'Qwen',
        subtitle: 'Qwen-Max / Qwen-Plus',
        description: t('model.providerCardQwenDesc'),
        endpoint:
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      },
      {
        provider: ModelProviderType.MOONSHOT,
        title: 'Moonshot',
        subtitle: 'moonshot-v1',
        description: t('model.providerCardMoonshotDesc'),
        endpoint: 'https://api.moonshot.cn/v1',
      },
      {
        provider: ModelProviderType.DOUBAO,
        title: 'Doubao',
        subtitle: 'Doubao-Pro / Doubao-Lite',
        description: t('model.providerCardDoubaoDesc'),
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      },
      {
        provider: ModelProviderType.DEEPSEEK,
        title: 'DeepSeek',
        subtitle: 'V3 / R1',
        description: t('model.providerCardDeepSeekDesc'),
        endpoint: 'https://api.deepseek.com/v1',
      },
    ],
    [t]
  );

  const handleOpenProviderModal = (card: OfficialProviderCard): void => {
    actions.setCurrentEditModel(undefined);
    setSelectedCard(card);
  };

  const visibleCards = useMemo(() => {
    const keyword = searchInput.trim().toLowerCase();

    return providerCards.filter(card => {
      // 这里我们检查的是具体的模型提供商
      const matchedProvider =
        !selectedProvider || selectedProvider === card.provider;
      const matchedKeyword =
        !keyword ||
        card.title.toLowerCase().includes(keyword) ||
        card.subtitle.toLowerCase().includes(keyword) ||
        card.description.toLowerCase().includes(keyword) ||
        getModelProviderLabel(card.provider).toLowerCase().includes(keyword);

      return matchedProvider && matchedKeyword;
    });
  }, [providerCards, selectedProvider, searchInput]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <ModelManagementHeader
          activeTab="officialModel"
          shelfOffModel={[]}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          setShowShelfOnly={() => undefined}
        />
        <div className={styles.toolbar}>
          <div>
            <h2 className="text-base font-semibold">
              {t('model.officialProviderIntro')}
            </h2>
            <p className={styles.hint}>
              选择供应商后，填写模型名称、接口地址、API 密钥和参数配置。
            </p>
          </div>
          <Select
            className={styles.providerFilter}
            aria-label="筛选模型供应商"
            value={selectedProvider || undefined}
            placeholder="全部供应商"
            allowClear
            options={getSpecificProviderOptions()}
            onChange={handleProviderChange}
          />
        </div>
        <div className={styles.feedback}>
          {visibleCards.length > 0 ? (
            <div className={styles.grid}>
              {visibleCards.map(card => (
                <section key={card.provider} className={styles.provider}>
                  <div className={styles.providerIdentity}>
                    <ProviderLogoGlyph provider={card.provider} />
                    <div>
                      <h2>{card.title}</h2>
                      <small>{card.subtitle}</small>
                    </div>
                  </div>
                  <p>{card.description}</p>
                  <div className={styles.providerFooter}>
                    <Button
                      type="link"
                      onClick={() => handleOpenProviderModal(card)}
                    >
                      {t('model.configureProvider')}
                    </Button>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Empty description="未找到匹配的供应商，请调整搜索或筛选条件。">
              <Button
                onClick={() => {
                  setSearchInput('');
                  setSelectedProvider('');
                }}
              >
                清除搜索与筛选
              </Button>
            </Empty>
          )}
        </div>
      </div>

      {selectedCard && (
        <CreateModal
          setCreateModal={() => setSelectedCard(null)}
          initialProvider={selectedCard.provider}
          initialEndpoint={selectedCard.endpoint}
          lockProvider={false}
          hideLocalModel={true}
          showCategoryForm={false}
        />
      )}
    </div>
  );
};

function OfficialModel(): React.JSX.Element {
  return (
    <ModelProvider>
      <OfficialModelContent />
    </ModelProvider>
  );
}

export default OfficialModel;
