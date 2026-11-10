import { useTranslation } from 'react-i18next';
import React from 'react';
import styles from '../../model-workspace.module.scss';
import ModelParamsTable from '../../components/model-params-table';
import {
  ModelInfo,
  ModelConfigParam,
  LLMSource,
  ModelCreateType,
} from '@/types/model';
import { getModelProviderLabel } from '../../utils/provider';

interface ModelConfigSectionProps {
  modelDetail: ModelInfo | null;
  llmSource: string | null;
  modelParams: ModelConfigParam[];
  setModelParams: (params: ModelConfigParam[]) => void;
  checkNameConventions: (value: string) => boolean;
  maskKey: (key?: string) => string;
}

const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({
  modelDetail,
  modelParams,
  setModelParams,
  checkNameConventions,
  maskKey,
}) => {
  const { t } = useTranslation();

  if (modelDetail?.llmSource !== LLMSource.CUSTOM) {
    return null;
  }

  return (
    <>
      <section className={styles.section}>
        <h2>连接配置</h2>
        <dl className={styles.definition}>
          <dt>Model</dt>
          <dd>{modelDetail.domain}</dd>
          {modelDetail.type === ModelCreateType.THIRD_PARTY && (
            <>
              <dt>{t('model.providerLabel')}</dt>
              <dd>{getModelProviderLabel(modelDetail.provider)}</dd>
              <dt>{t('model.interfaceAddress')}</dt>
              <dd>{modelDetail.url}</dd>
              <dt>{t('model.apiKey')}</dt>
              <dd>{maskKey(modelDetail.apiKey || '')}</dd>
            </>
          )}
          {modelDetail.type === ModelCreateType.LOCAL && (
            <>
              <dt>{t('model.acceleratorCount')}</dt>
              <dd>{modelDetail.acceleratorCount}</dd>
            </>
          )}
        </dl>
      </section>
      <section className={styles.section}>
        <h2>{t('model.modelParameters')}</h2>
        <ModelParamsTable
          modelParams={modelParams}
          setModelParams={setModelParams}
          checkNameConventions={checkNameConventions}
          detail
        />
      </section>
    </>
  );
};
export default ModelConfigSection;
