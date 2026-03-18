import { useState, useMemo, useCallback, JSX, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Switch, message, Button } from 'antd';
import JSEncrypt from 'jsencrypt';

import { DeleteModal, CreateModal } from './modal-component';
import StatusTag from './status-tag';
import { EllipsisIcon } from '@/components/svg-icons/model';
import {
  enabledModelAPI,
  getModelDetail,
  modelCreate,
  createOrUpdateLocalModel,
  modelRsaPublicKey,
} from '@/services/model';
import {
  ModelInfo,
  CategoryNode,
  LLMSource,
  ShelfStatus,
  LocalModelStatus,
  ModelCreateType,
} from '@/types/model';
import { ResponseBusinessError } from '@/types/global';
import i18next from 'i18next';
import styles from './model-card.module.scss';
import classNames from 'classnames';
import { getModelProviderLabel } from '../utils/provider';

// 加密API密钥工具函数
const encryptApiKey = (publicKey: string, apiKey: string): string => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);
  const encrypted = encrypt.encrypt(apiKey);
  if (!encrypted) {
    throw new Error('API密钥加密失败');
  }
  return encrypted;
};

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
      const publicKey = await modelRsaPublicKey();
      const encryptedApiKey = encryptApiKey(
        publicKey,
        modelDetail.apiKey || ''
      );

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
        apiKey: encryptedApiKey,
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
    message.error(errorMessage);
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

// 检查模型状态
function checkLocalModelStatus(model: ModelInfo): boolean {
  return [LocalModelStatus.FAILED, LocalModelStatus.PENDING].includes(
    model.status
  );
}

// 获取发布状态样式和文本
function getPublishStatusInfo(status: LocalModelStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case LocalModelStatus.RUNNING:
      return {
        text: i18next.t('model.publishRunning'),
        className: 'bg-[#dfffce] text-[#3DC253]',
      };
    case LocalModelStatus.PENDING:
      return {
        text: i18next.t('model.publishPending'),
        className: 'bg-[#FFF4E5] text-[#EBA300]',
      };
    case LocalModelStatus.FAILED:
      return {
        text: i18next.t('model.publishFailed'),
        className: 'bg-[#FEEDEC] text-[#F74E43]',
      };
    default:
      return {
        text: '',
        className: '',
      };
  }
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
  return (
    <div className="flex items-start justify-between mb-3">
      <div className={`flex items-center ${styles.modelCardHeader}`}>
        {model?.llmSource === LLMSource.CUSTOM ? (
          <span
            className="w-12 h-12 flex items-center justify-center rounded-lg flex-shrink-0 mr-3"
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
          <div className="w-[48px] h-[48px] flex justify-center items-center rounded-lg flex-shrink-0 border border-[#E2E8FF] mr-3">
            <img src={model.icon} alt="" className="w-[48px] h-[48px]" />
          </div>
        )}
        <div>
          <span className={styles.modelCardTitle}>{model.name}</span>
          {/* {model.llmSource === LLMSource.CUSTOM &&
            ((): JSX.Element | null => {
              const statusInfo = getPublishStatusInfo(model.status);
              return statusInfo.text ? (
                <span
                  className={`${statusInfo.className} rounded-[12px] px-2 py-1 inline-block text-[12px] text-center ml-2`}
                >
                  {statusInfo.text}
                </span>
              ) : null;
            })()} */}
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
          size="default"
          checked={enabled}
          disabled={[
            LocalModelStatus.FAILED,
            LocalModelStatus.PENDING,
          ].includes(model.status)}
          className={`${
            model.enabled
              ? '[&_.ant-switch-inner]:bg-[#6356EA]'
              : '[&_.ant-switch-inner]:bg-gray-400'
          }
            ${styles.modelSwitch}`}
          onChange={(checked, e) => {
            e.stopPropagation();
            setEnabled(checked);
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
                message.error(error.message);
              });
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
  menuVisible,
  setMenuVisible,
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
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
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
        {model.llmSource === LLMSource.CUSTOM && (
          <div className="relative">
            <Button
              className={styles.modelEllipsis}
              type="text"
              size="small"
              icon={<EllipsisIcon />}
              onClick={e => {
                e.stopPropagation();
                setMenuVisible(!menuVisible);
              }}
            />
            {menuVisible && (
              <div
                className="absolute top-full right-0 mt-1 w-24 bg-white border rounded shadow z-10"
                onMouseLeave={() => setMenuVisible(false)}
              >
                <button
                  className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100`}
                  onClick={e => {
                    e.stopPropagation();
                    setModelId(model.id);
                    setCreateModal(true);
                    setMenuVisible(false);
                  }}
                >
                  {t('model.editAction')}
                </button>
                <button
                  className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-600`}
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteModal(true);
                    setMenuVisible(false);
                  }}
                >
                  {t('model.deleteAction')}
                </button>
                {model.status === LocalModelStatus.FAILED && (
                  <button
                    className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm text-[#6356ea]"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuVisible(false);
                      republishModel(model, getModels);
                    }}
                  >
                    {t('model.republish')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
  const [menuVisible, setMenuVisible] = useState(false);

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
    <div
      className={`p-5 duration-200 flex flex-col h-full cursor-pointer h-[188px] ${styles.modelCard}`}
      onClick={handleUse}
    >
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

      <ModelCardFooter
        bottomTexts={bottomTexts}
        model={model}
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
        setModelId={setModelId}
        setCreateModal={setCreateModal}
        setDeleteModal={setDeleteModal}
        createModal={createModal}
        deleteModal={deleteModal}
        modelId={modelId}
        categoryTree={categoryTree}
        getModels={getModels}
      />
    </div>
  );
}

export default ModelCard;
