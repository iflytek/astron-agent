import React, { useMemo, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import ModelManagementHeader from '../components/model-management-header';
import CategoryAside from '../components/category-aside';
import { CreateModal } from '../components/modal-component';
import { ModelProvider, useModelContext } from '../context/model-context';
import { useModelFilters } from '../hooks/use-model-filters';
import { ModelProviderType } from '@/types/model';
import { getModelProviderLabel } from '../utils/provider';
import chatgptIcon from '@/assets/imgs/modelManage/providers/custom/chatgpt.svg';
import anthropicIcon from '@/assets/imgs/modelManage/providers/custom/anthropic.svg';
import deepseekIcon from '@/assets/imgs/modelManage/providers/custom/deepseek.svg';
import googleIcon from '@/assets/imgs/modelManage/providers/custom/google.svg';
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
  accentClass: string;
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

const ProviderLogoBadge: React.FC<{ provider: ModelProviderType }> = ({
  provider,
}) => {
  return (
    <div className="rounded-2xl border border-[#E7EBF4] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(31,35,41,0.06)]">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] border border-[#EEF1F7] bg-white">
        <ProviderLogoGlyph provider={provider} />
      </div>
    </div>
  );
};

const OfficialModelContent: React.FC = () => {
  const { t } = useTranslation();
  const { state, actions } = useModelContext();
  const filters = useModelFilters();
  const [selectedCard, setSelectedCard] = useState<OfficialProviderCard | null>(
    null
  );

  const providerCards = useMemo<OfficialProviderCard[]>(
    () => [
      {
        provider: ModelProviderType.CHATGPT,
        title: 'ChatGPT',
        subtitle: 'GPT-4o / GPT-4.1',
        description: t('model.providerCardChatGPTDesc'),
        accentClass: 'from-[#EFFAF4] via-[#F8FDF9] to-white',
        endpoint: 'https://api.openai.com/v1',
      },
      {
        provider: ModelProviderType.ANTHROPIC,
        title: 'Claude',
        subtitle: 'Sonnet / Opus',
        description: t('model.providerCardAnthropicDesc'),
        accentClass: 'from-[#FDF3E8] via-[#FFF8F2] to-white',
        endpoint: 'https://api.anthropic.com',
      },
      {
        provider: ModelProviderType.GOOGLE,
        title: 'Gemini',
        subtitle: '2.5 Flash / 2.5 Pro',
        description: t('model.providerCardGoogleDesc'),
        accentClass: 'from-[#EAF4FF] via-[#F5F9FF] to-white',
        endpoint: 'https://generativelanguage.googleapis.com',
      },
      {
        provider: ModelProviderType.MINIMAX,
        title: 'MiniMax',
        subtitle: 'MiniMax-Text-01',
        description: t('model.providerCardMiniMaxDesc'),
        accentClass: 'from-[#FFF3E8] via-[#FFF8F2] to-white',
        endpoint: 'https://api.minimaxi.com/v1',
      },
      {
        provider: ModelProviderType.ZHIPU,
        title: 'Zhipu AI',
        subtitle: 'GLM-4.5 / GLM-4-Flash',
        description: t('model.providerCardZhipuDesc'),
        accentClass: 'from-[#F0F5FF] via-[#F7FAFF] to-white',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      },
      {
        provider: ModelProviderType.QWEN,
        title: 'Qwen',
        subtitle: 'Qwen-Max / Qwen-Plus',
        description: t('model.providerCardQwenDesc'),
        accentClass: 'from-[#F3F6FF] via-[#FAFBFF] to-white',
        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      },
      {
        provider: ModelProviderType.MOONSHOT,
        title: 'Moonshot',
        subtitle: 'moonshot-v1',
        description: t('model.providerCardMoonshotDesc'),
        accentClass: 'from-[#F8F1FF] via-[#FCF8FF] to-white',
        endpoint: 'https://api.moonshot.cn/v1',
      },
      {
        provider: ModelProviderType.DOUBAO,
        title: 'Doubao',
        subtitle: 'Doubao-Pro / Doubao-Lite',
        description: t('model.providerCardDoubaoDesc'),
        accentClass: 'from-[#EEF8FF] via-[#F8FCFF] to-white',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      },
      {
        provider: ModelProviderType.DEEPSEEK,
        title: 'DeepSeek',
        subtitle: 'V3 / R1',
        description: t('model.providerCardDeepSeekDesc'),
        accentClass: 'from-[#EEF2FF] via-[#F7F8FF] to-white',
        endpoint: 'https://api.deepseek.com/v1',
      },
    ],
    [t]
  );

  const visibleCards = useMemo(() => {
    const keyword = state.searchInput.trim().toLowerCase();

    return providerCards.filter(card => {
      const matchedProvider =
        !state.providerFilter || state.providerFilter === card.provider;
      const matchedKeyword =
        !keyword ||
        card.title.toLowerCase().includes(keyword) ||
        card.subtitle.toLowerCase().includes(keyword) ||
        card.description.toLowerCase().includes(keyword) ||
        getModelProviderLabel(card.provider).toLowerCase().includes(keyword);

      return matchedProvider && matchedKeyword;
    });
  }, [providerCards, state.providerFilter, state.searchInput]);

  const handleOpenProviderModal = (card: OfficialProviderCard): void => {
    actions.setCurrentEditModel(undefined);
    setSelectedCard(card);
  };

  return (
    <div className="w-full h-screen flex flex-col page-container-inner-UI">
      <div className="flex-none mb-5">
        <ModelManagementHeader
          activeTab="officialModel"
          shelfOffModel={[]}
          searchInput={state.searchInput}
          setSearchInput={filters.handleSearchInputChange}
          setShowShelfOnly={() => undefined}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full flex gap-6 lg:gap-2">
          <aside className="w-full lg:w-[224px] max-w-[224px] min-w-[180px] flex-shrink-0 rounded-[18px] bg-[#FFFFFF] overflow-y-auto hide-scrollbar shadow-sm">
            <CategoryAside
              tree={[]}
              providerFilter={state.providerFilter}
              providerOptions={[
                {
                  label: t('model.providerChatGPT'),
                  value: ModelProviderType.CHATGPT,
                },
                {
                  label: t('model.providerDeepSeek'),
                  value: ModelProviderType.DEEPSEEK,
                },
                {
                  label: t('model.providerAnthropic'),
                  value: ModelProviderType.ANTHROPIC,
                },
                {
                  label: t('model.providerGoogle'),
                  value: ModelProviderType.GOOGLE,
                },
                {
                  label: t('model.providerMiniMax'),
                  value: ModelProviderType.MINIMAX,
                },
                {
                  label: t('model.providerZhipu'),
                  value: ModelProviderType.ZHIPU,
                },
                {
                  label: t('model.providerQwen'),
                  value: ModelProviderType.QWEN,
                },
                {
                  label: t('model.providerMoonshot'),
                  value: ModelProviderType.MOONSHOT,
                },
                {
                  label: t('model.providerDoubao'),
                  value: ModelProviderType.DOUBAO,
                },
              ]}
              onProviderChange={filters.handleProviderFilterChange}
              showContextLength={false}
              showModelStatus={false}
            />
          </aside>

          <main className="flex-1 rounded-lg overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="rounded-[24px] bg-white min-h-full p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-[18px] font-semibold text-[#222529] leading-7">
                  {t('model.officialProviderIntro')}
                </h2>
                <p className="mt-2 text-sm text-[#7D8493] leading-6">
                  选择供应商后，填写对应模型名称、接口地址、API 密钥和参数配置。
                </p>
              </div>

              {visibleCards.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {visibleCards.map(card => (
                    <section
                      key={card.provider}
                      className={`relative overflow-hidden rounded-[24px] border border-[#E8EBF4] bg-gradient-to-br ${card.accentClass} p-6 shadow-[0_10px_30px_rgba(31,35,41,0.05)]`}
                    >
                      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/50 blur-2xl" />
                      <div className="relative flex h-full flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#6356EA]">
                              {getModelProviderLabel(card.provider)}
                            </div>
                            <h3 className="mt-4 text-[28px] leading-9 font-semibold text-[#1F2329]">
                              {card.title}
                            </h3>
                            <p className="mt-2 text-sm text-[#5C6475]">
                              {card.subtitle}
                            </p>
                          </div>
                          <ProviderLogoBadge provider={card.provider} />
                        </div>

                        <p className="relative mt-6 flex-1 text-sm leading-6 text-[#4F566B]">
                          {card.description}
                        </p>

                        <div className="mt-6 flex items-center justify-between gap-3">
                          <div className="text-xs text-[#7D8493]">
                            支持填写自定义 URL、密钥、模型名和参数项
                          </div>
                          <Button
                            type="primary"
                            className="px-5"
                            onClick={() => handleOpenProviderModal(card)}
                          >
                            {t('model.configureProvider')}
                          </Button>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-[#DCE2F0] bg-[#FAFBFF] text-sm text-[#7D8493]">
                  未找到匹配的官方供应商，请调整搜索词或左侧筛选条件。
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {selectedCard && (
        <CreateModal
          setCreateModal={() => setSelectedCard(null)}
          initialProvider={selectedCard.provider}
          initialEndpoint={selectedCard.endpoint}
          lockProvider={true}
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
