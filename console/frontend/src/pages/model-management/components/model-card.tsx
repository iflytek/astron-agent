import { shouldShowRequestError } from '@/utils/http-error';
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  JSX,
  Fragment,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Switch, message, Button } from 'antd';

import { DeleteModal, CreateModal } from './modal-component';
import StatusTag from './status-tag';
import {
  enabledModelAPI,
  getModelDetail,
  modelCreate,
  createOrUpdateLocalModel,
} from '@/services/model';
import {
  ModelInfo,
  CategoryNode,
  LLMSource,
  LocalModelStatus,
  ModelCreateType,
} from '@/types/model';
import { ResponseBusinessError } from '@/types/global';
import i18next from 'i18next';
import styles from './model-card.module.scss';
import classNames from 'classnames';
import { getModelProviderLabel } from '../utils/provider';
// 重新发布模型函数
const republishModel = async (
  model: ModelInfo,
  getModels: () => void
): Promise<void> => {
  try {
    // 获取模型详细信息
    const modelDetail = await getModelDetail({
      modelId: model.id,
      llmSource: model.llmSource,
    });

    if (model.type === ModelCreateType.LOCAL) {
      // 本地模型重新发布
      const localModelParams = {
        id: model.id,
        modelName: modelDetail.name,
        domain: modelDetail.domain,
        description: modelDetail.desc,
        icon: modelDetail.icon,
        color: modelDetail.color || '',
        acceleratorCount: modelDetail.acceleratorCount || 1,
        modelPath: modelDetail.domain, // 使用domain作为modelPath
        modelCategoryReq: {}, // 根据需要构建分类信息
      };

      await createOrUpdateLocalModel(localModelParams);
    } else {
      // 第三方模型重新发布
      // 解析配置参数
      let config = [];
      if (modelDetail.config && typeof modelDetail.config === 'string') {
        try {
          config = JSON.parse(modelDetail.config);
        } catch (e) {
          console.warn('解析模型配置失败:', e);
        }
      }

      const submitParams = {
        id: model.id,
        endpoint: modelDetail.url,
        apiKey: modelDetail.apiKey || '',
        apiKeyMasked: false, // 因为重新发布，不需要掩码
        modelName: modelDetail.name,
        description: modelDetail.desc,
        provider: modelDetail.provider,
        domain: modelDetail.domain,
        tag: modelDetail.tag || [],
        icon: modelDetail.icon,
        config,
        modelCategoryReq: {}, // 根据需要构建分类信息
      };

      await modelCreate(submitParams);
    }

    message.success(i18next.t('model.republishSuccess'));
    getModels(); // 刷新模型列表
  } catch (error) {
    console.error('重新发布失败:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : i18next.t('model.republishFailed');
    shouldShowRequestError(error) && message.error(errorMessage);
  }
};

function collectNames(nodes: CategoryNode[] = []): string[] {
  const res: string[] = [];
  function dfs(list: CategoryNode[]): void {
    list.forEach(item => {
      res.push(item.name);
      if (item.children?.length) {
        dfs(item.children);
      }
    });
  }
  dfs(nodes);
  return res;
}

// 模型卡片头部组件
function ModelCardHeader({
  model,
  modelCategoryTags,
  modelScenarioTags,
  providerLabel,
  getModels,
}: {
  model: ModelInfo;
  modelCategoryTags: string[];
  modelScenarioTags: string[];
  providerLabel: string;
  getModels: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(model.enabled);
  const [updating, setUpdating] = useState(false);
  useEffect(() => setEnabled(model.enabled), [model.enabled]);
  return (
    <div className={styles.identity}>
      <div className={`flex items-center ${styles.modelCardHeader}`}>
        {model?.llmSource === LLMSource.CUSTOM ? (
          <span
            className={styles.icon}
            style={{
              background: model.color
                ? model.color
                : `url(${model.icon}) no-repeat center / cover`,
            }}
          >
            {model.color && (
              <img src={model.icon} className="w-[28px] h-[28px]" alt="" />
            )}
          </span>
        ) : (
          <div className={styles.icon}>
            <img src={model.icon} alt="" className="w-9 h-9" />
          </div>
        )}
        <div className={styles.identityText}>
          <span className={styles.modelCardTitle}>{model.name}</span>
          <StatusTag status={model.shelfStatus} />
          <p className="text-sm text-gray-500 flex flex-wrap gap-x-2 gap-2 mt-2">
            <span className={classNames(styles.modelTag, styles.category)}>
              {providerLabel}
            </span>
            {modelCategoryTags
              .filter(name => name !== t('model.other'))
              .map(name => (
                <span
                  key={name}
                  className={classNames(styles.modelTag, styles.category)}
                >
                  {name}
                </span>
              ))}
            {modelScenarioTags
              .filter(name => name !== t('model.other'))
              .map(name => (
                <span
                  key={name}
                  className={styles.modelTag}
                  style={{ color: '#000000' }}
                >
                  {name}
                </span>
              ))}
          </p>
        </div>
      </div>
      {model.llmSource === LLMSource.CUSTOM && (
        <Switch
          aria-label={`启用模型 ${model.name}`}
          loading={updating}
          size="small"
          checked={enabled}
          disabled={[
            LocalModelStatus.FAILED,
            LocalModelStatus.PENDING,
          ].includes(model.status)}
          onChange={(checked, e) => {
            e.stopPropagation();
            setEnabled(checked);
            setUpdating(true);
            enabledModelAPI(model.id, model.llmSource, checked ? 'on' : 'off')
              .then(() => {
                message.success(
                  checked
                    ? t('model.modelEnableSuccess')
                    : t('model.modelDisableSuccess')
                );
                getModels();
              })
              .catch((error: ResponseBusinessError) => {
                setEnabled(model.enabled);
                shouldShowRequestError(error) && message.error(error.message);
              })
              .finally(() => setUpdating(false));
          }}
        />
      )}
    </div>
  );
}

// 模型卡片底部组件
function ModelCardFooter({
  bottomTexts,
  model,
  setModelId,
  setCreateModal,
  setDeleteModal,
  createModal,
  deleteModal,
  modelId,
  categoryTree,
  getModels,
}: {
  bottomTexts: (string | false | undefined)[];
  model: ModelInfo;
  setModelId: (id: number | undefined) => void;
  setCreateModal: (show: boolean) => void;
  setDeleteModal: (show: boolean) => void;
  createModal: boolean;
  deleteModal: boolean;
  modelId: number | undefined;
  categoryTree?: CategoryNode[];
  getModels: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-between items-center mt-auto pt-3">
        <span
          className={styles.modelInfo}
          title={bottomTexts.join(' \u00A0\u00A0|\u00A0\u00A0 ')}
        >
          {bottomTexts.map((t, index) => (
            <Fragment key={index}>
              <span>{t}</span>
              {index < bottomTexts.length - 1 && (
                <span className={styles.modelInfoDivider}></span>
              )}
            </Fragment>
          ))}
          {/* {bottomTexts.join(' \u00A0\u00A0|\u00A0\u00A0 ')} */}
        </span>
      </div>
      {model.llmSource === LLMSource.CUSTOM && (
        <div className={styles.actions}>
          <Button
            type="link"
            onClick={() => {
              setModelId(model.id);
              setCreateModal(true);
            }}
          >
            {t('model.editAction')}
          </Button>
          {model.status === LocalModelStatus.FAILED && (
            <Button
              type="link"
              onClick={() => void republishModel(model, getModels)}
            >
              {t('model.republish')}
            </Button>
          )}
          <Button type="text" danger onClick={() => setDeleteModal(true)}>
            {t('model.deleteAction')}
          </Button>
        </div>
      )}
      {createModal && (
        <CreateModal
          setCreateModal={setCreateModal}
          getModels={getModels}
          modelId={modelId?.toString() || ''}
          categoryTree={categoryTree}
        />
      )}
      {deleteModal && (
        <DeleteModal
          msg={t('model.deleteWarning')}
          setDeleteModal={setDeleteModal}
          currentModel={model}
          getModels={getModels}
        />
      )}
    </>
  );
}

interface ModelCardProps {
  model: ModelInfo;
  filterType?: number;
  categoryTree?: CategoryNode[];
  getModels: () => void;
  showShelfOnly: boolean;
}
// 卡片组件
function ModelCard({
  model,
  categoryTree,
  getModels,
}: ModelCardProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [createModal, setCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const [modelId, setModelId] = useState<number | undefined>();

  // 提取标签逻辑
  const getTags = useCallback(
    (keys: string[]): string[] => {
      const tags: string[] = [];
      keys.forEach(key => {
        const node = model.categoryTree?.find(
          (n: CategoryNode) => n.key === key
        );
        if (node) {
          tags.push(...collectNames(node.children));
        }
      });
      return tags.filter((v, i, arr) => arr.indexOf(v) === i);
    },
    [model.categoryTree]
  );

  const modelCategoryTags = useMemo(
    () => getTags(['modelCategory']),
    [getTags]
  );
  const modelScenarioTags = useMemo(
    () => getTags(['modelScenario']),
    [getTags]
  );
  const modelProvider = useMemo(() => getTags(['modelProvider']), [getTags]);
  const providerLabel = useMemo(() => {
    return model.provider
      ? getModelProviderLabel(model.provider)
      : getModelProviderLabel(modelProvider?.[0]);
  }, [model.provider, modelProvider]);
  const languageSupport = useMemo(
    () => getTags(['languageSupport']),
    [getTags]
  );
  const contextLengthTag = useMemo(
    () => getTags(['contextLengthTag']),
    [getTags]
  );

  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const bottomTexts = [
    model.type === ModelCreateType.LOCAL && t('model.localUploadModel'),
    model.type === ModelCreateType.THIRD_PARTY && t('model.thirdPartyModel'),
    providerLabel,
    languageSupport?.[0] && `${t('model.language')}${languageSupport[0]}`,
    contextLengthTag?.[0] &&
      `${t('model.contextLengthLabel')}${contextLengthTag[0]}`,
    model.updateTime &&
      `${formatDate(new Date(model.updateTime))} ${t('model.updated')}`,
  ].filter(Boolean);

  const handleUse = (): void => {
    navigate(
      `/management/model/detail/${model.id}?llmSource=${model.llmSource}&modelIcon=${model.icon}`,
      { state: { model, bottomTexts } }
    );
  };

  return (
    <article className={styles.modelCard}>
      <ModelCardHeader
        model={model}
        modelCategoryTags={modelCategoryTags}
        modelScenarioTags={modelScenarioTags}
        providerLabel={providerLabel}
        getModels={getModels}
      />

      {/* 描述 */}
      <p
        className={styles.modelDesc}
        title={model.desc} // 原生浏览器提示
      >
        {model.desc}
      </p>

      <Button type="link" className={styles.detailButton} onClick={handleUse}>
        查看详情
      </Button>
      <ModelCardFooter
        bottomTexts={bottomTexts}
        model={model}
        setModelId={setModelId}
        setCreateModal={setCreateModal}
        setDeleteModal={setDeleteModal}
        createModal={createModal}
        deleteModal={deleteModal}
        modelId={modelId}
        categoryTree={categoryTree}
        getModels={getModels}
      />
    </article>
  );
}

export default ModelCard;
