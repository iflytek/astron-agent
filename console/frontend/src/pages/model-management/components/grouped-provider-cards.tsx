import React, { useMemo } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { ModelProviderType } from '@/types/model';
import { getModelProviderLabel } from '../utils/provider';
import {
  mapProviderToVendor,
  getVendorDisplayName,
} from '../utils/provider-group';
import chatgptIcon from '@/assets/imgs/modelManage/providers/custom/chatgpt.svg';
import anthropicIcon from '@/assets/imgs/modelManage/providers/custom/anthropic.svg';
import googleIcon from '@/assets/imgs/modelManage/providers/custom/google.svg';

interface ProviderCard {
  provider: ModelProviderType;
  title: string;
  subtitle: string;
  description: string;
  accentClass: string;
  endpoint: string;
}

interface VendorGroupCardProps {
  vendor: string;
  providers: ProviderCard[];
  onOpenProviderModal: (card: ProviderCard) => void;
}

const ProviderLogoGlyph: React.FC<{ provider: ModelProviderType }> = ({
  provider,
}) => {
  const imageLogoMap: Record<ModelProviderType, string> = {
    [ModelProviderType.CHATGPT]: chatgptIcon,
    [ModelProviderType.OPENAI]: chatgptIcon,
    [ModelProviderType.ANTHROPIC]: anthropicIcon,
    [ModelProviderType.DEEPSEEK]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
    [ModelProviderType.GOOGLE]: googleIcon,
    [ModelProviderType.MINIMAX]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
    [ModelProviderType.ZHIPU]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
    [ModelProviderType.QWEN]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
    [ModelProviderType.MOONSHOT]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
    [ModelProviderType.DOUBAO]: chatgptIcon, // 使用ChatGPT图标，因为也是OpenAI兼容
  };

  return (
    <img
      src={imageLogoMap[provider]}
      alt={getModelProviderLabel(provider)}
      className="h-8 w-8 object-contain"
    />
  );
};

const ProviderCardComponent: React.FC<{
  card: ProviderCard;
  onConfigure: () => void;
}> = ({ card, onConfigure }) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {getModelProviderLabel(card.provider)}
          </div>
          <h4 className="mt-2 text-lg font-semibold text-gray-900">
            {card.title}
          </h4>
          <p className="text-sm text-gray-600">{card.subtitle}</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center">
          <ProviderLogoGlyph provider={card.provider} />
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{card.description}</p>

      <Button
        type="primary"
        size="small"
        className="w-full"
        onClick={onConfigure}
      >
        {t('model.configureProvider')}
      </Button>
    </div>
  );
};

const VendorGroupCard: React.FC<VendorGroupCardProps> = ({
  vendor,
  providers,
  onOpenProviderModal,
}) => {
  const { t } = useTranslation();

  const vendorName = getVendorDisplayName(vendor);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{vendorName}</h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((card, index) => (
            <ProviderCardComponent
              key={index}
              card={card}
              onConfigure={() => onOpenProviderModal(card)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface GroupedProviderCardsProps {
  providerCards: ProviderCard[];
  searchInput: string;
  providerFilter: string;
  onOpenProviderModal: (card: ProviderCard) => void;
}

const GroupedProviderCards: React.FC<GroupedProviderCardsProps> = ({
  providerCards,
  searchInput,
  providerFilter,
  onOpenProviderModal,
}) => {
  const { t } = useTranslation();

  // 根据搜索和筛选条件过滤卡片
  const filteredCards = useMemo(() => {
    const keyword = searchInput.trim().toLowerCase();

    return providerCards.filter(card => {
      const cardVendor = mapProviderToVendor(card.provider);
      const matchedProvider = !providerFilter || providerFilter === cardVendor;
      const matchedKeyword =
        !keyword ||
        card.title.toLowerCase().includes(keyword) ||
        card.subtitle.toLowerCase().includes(keyword) ||
        card.description.toLowerCase().includes(keyword) ||
        getModelProviderLabel(card.provider).toLowerCase().includes(keyword);

      return matchedProvider && matchedKeyword;
    });
  }, [providerCards, searchInput, providerFilter]);

  // 按厂商分组卡片
  const groupedCards = useMemo(() => {
    const groups: Record<string, ProviderCard[]> = {};

    filteredCards.forEach(card => {
      const vendor = mapProviderToVendor(card.provider);
      if (!groups[vendor]) {
        groups[vendor] = [];
      }
      groups[vendor].push(card);
    });

    return Object.entries(groups).map(([vendor, cards]) => ({
      vendor,
      cards,
    }));
  }, [filteredCards]);

  if (groupedCards.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        {t('model.searchNoResults')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedCards.map(({ vendor, cards }) => (
        <VendorGroupCard
          key={vendor}
          vendor={vendor}
          providers={cards}
          onOpenProviderModal={onOpenProviderModal}
        />
      ))}
    </div>
  );
};

export default GroupedProviderCards;
