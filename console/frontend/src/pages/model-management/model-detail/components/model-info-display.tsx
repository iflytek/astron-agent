import { useTranslation } from 'react-i18next';
import {
  ModelInfo,
  LLMSource,
  ShelfStatus,
  ModelType,
  ModelCreateType,
} from '@/types/model';
import React from 'react';
import i18next from 'i18next';
import { getModelProviderLabel } from '../../utils/provider';

interface ModelInfoDisplayProps {
  modelDetail: ModelInfo | null;
  modelIcon: string | null;
  modelCategoryTags: string[];
  modelScenarioTags: string[];
  bottomTexts: string[];
  llmSource: string | null;
}

// 辅助函数
const getShelfStatusStyle = (shelfStatus?: number): string => {
  if (shelfStatus === ShelfStatus.WAIT_OFF_SHELF) return '#F74E43';
  if (shelfStatus === ShelfStatus.OFF_SHELF) return '#7F7F7F';
  return 'transparent';
};

const getShelfStatusText = (shelfStatus?: number): string => {
  if (shelfStatus === ShelfStatus.WAIT_OFF_SHELF)
    return i18next.t('model.toBeOffShelf');
  if (shelfStatus === ShelfStatus.OFF_SHELF) return i18next.t('model.offShelf');
  return '';
};

const renderModelIcon = (
  modelDetail: ModelInfo | null,
  modelIcon: string | null
): React.JSX.Element => {
  if (modelDetail?.llmSource === LLMSource.CUSTOM) {
    return (
      <span
        className="w-[72px] h-[72px] flex items-center justify-center rounded-lg"
        style={{
          background: modelDetail.color
            ? modelDetail.color
            : `url(${modelDetail.icon}) no-repeat center / cover`,
        }}
      >
        {modelDetail.color && (
          <img src={modelDetail.icon} className="w-[48px] h-[48px]" alt="" />
        )}
      </span>
    );
  }

  return (
    <div className="w-[72px] h-[72px] flex justify-center items-center rounded-lg flex-shrink-0 border border-[#E2E8FF]">
      <img
        src={modelDetail?.icon || modelIcon || ''}
        alt=""
        className="w-[72px] h-[72px]"
      />
    </div>
  );
};

const renderTags = (
  tags: string[],
  bgColor: string,
  textStyle?: React.CSSProperties
): React.JSX.Element => {
  return (
    <>
      {tags
        .filter(name => name !== i18next.t('model.other'))
        .map(name => (
          <span
            key={name}
            className={`px-1.5 py-0.5 text-xs rounded-sm ${bgColor} opacity-60`}
            style={textStyle}
          >
            {name}
          </span>
        ))}
    </>
  );
};

const ModelInfoDisplay: React.FC<ModelInfoDisplayProps> = ({
  modelDetail,
  modelIcon,
  modelCategoryTags,
  modelScenarioTags,
  bottomTexts,
}) => {
  const { t } = useTranslation();
  const providerLabel =
    modelDetail?.llmSource === LLMSource.CUSTOM
      ? getModelProviderLabel(modelDetail?.provider)
      : null;

  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-[26px]">
          {renderModelIcon(modelDetail, modelIcon)}
          <div className="flex flex-col justify-between h-[72px]">
            <div className="flex items-center space-x-2 mt-3">
              <span className="font-semibold text-gray-900 truncate">
                {modelDetail?.name}
              </span>
              {modelDetail?.type === ModelCreateType.LOCAL && (
                <span className="font-normal text-[#FF9602] text-[12px] truncate">
                  本地选择模型
                </span>
              )}
              {modelDetail?.shelfStatus !== undefined && (
                <span
                  className="shrink-0 px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap"
                  style={{
                    backgroundColor: getShelfStatusStyle(
                      modelDetail.shelfStatus
                    ),
                  }}
                >
                  {getShelfStatusText(modelDetail.shelfStatus)}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 flex flex-wrap gap-x-2 gap-2">
              {providerLabel && (
                <span className="px-1.5 py-0.5 text-xs rounded-sm bg-[#E4EAFF] opacity-60">
                  {providerLabel}
                </span>
              )}
              {renderTags(modelCategoryTags, 'bg-[#E4EAFF]', {
                color: '#000000',
              })}
              {renderTags(modelScenarioTags, 'bg-[#E8E8EA]', {
                color: '#000000',
              })}
            </p>
          </div>
        </div>
        {modelDetail?.updateTime && (
          <div className="flex items-center gap-2.5 text-desc">
            <div>
              {t('model.updatedAt')} {modelDetail?.updateTime}
            </div>
          </div>
        )}
      </div>
      <div className="text-desc mt-3 text-sm">{modelDetail?.desc}</div>
      <div className="text-desc mt-3 text-sm">
        {bottomTexts?.join('\u00A0\u00A0\u00A0\u00A0\u00A0')}
      </div>
    </>
  );
};

export default ModelInfoDisplay;
