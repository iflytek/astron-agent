import { useTranslation } from 'react-i18next';
import {
  ModelInfo,
  LLMSource,
  ShelfStatus,
  ModelCreateType,
} from '@/types/model';
import React from 'react';
import styles from '../../model-workspace.module.scss';
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
      <div className={styles.detailIdentity}>
        {renderModelIcon(modelDetail, modelIcon)}
        <div className="min-w-0 flex-1">
          <h1>{modelDetail?.name}</h1>
          <div className={styles.detailTags}>
            {modelDetail?.type === ModelCreateType.LOCAL && (
              <span className={styles.tag}>本地模型</span>
            )}
            {providerLabel && (
              <span className={styles.tag}>{providerLabel}</span>
            )}
            {[...modelCategoryTags, ...modelScenarioTags]
              .filter(name => name !== t('model.other'))
              .map(name => (
                <span key={name} className={styles.tag}>
                  {name}
                </span>
              ))}
            {getShelfStatusText(modelDetail?.shelfStatus) && (
              <span className={styles.tag}>
                {getShelfStatusText(modelDetail?.shelfStatus)}
              </span>
            )}
          </div>
          {modelDetail?.updateTime && (
            <p className={styles.hint}>
              {t('model.updatedAt')} {modelDetail.updateTime}
            </p>
          )}
        </div>
      </div>
      <p className={styles.detailDescription}>{modelDetail?.desc}</p>
      {bottomTexts.length > 0 && (
        <p className={styles.hint}>{bottomTexts.join(' · ')}</p>
      )}
    </>
  );
};

export default ModelInfoDisplay;
