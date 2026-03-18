import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  JSX,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Input,
  Button,
  message,
  Select,
  InputNumber,
  ConfigProvider,
  Switch,
} from 'antd';
import JSEncrypt from 'jsencrypt';
import {
  modelCreate,
  deleteModelAPI,
  modelRsaPublicKey,
  getModelDetail,
  getLocalModelList,
  createOrUpdateLocalModel,
} from '@/services/model';
import MoreIcons from '@/components/more-icons';
import globalStore from '@/store/global-store';
import ModelParamsTable from './model-params-table';
import { v4 as uuid } from 'uuid';
import tipsSvg from '@/assets/svgs/tips.svg';
import close from '@/assets/imgs/common/close.png';
import dialogDel from '@/assets/imgs/common/delete-red.png';
import inputAddIcon from '@/assets/imgs/common/add-blue.png';
import {
  ModelInfo,
  CategoryNode,
  ModelFormData,
  ModelConfigParam,
  ModelCreateParams,
  LLMSource,
  LocalModelFile,
  LocalModelParams,
  ModelCreateType,
  ModelProviderType,
} from '@/types/model';
import i18next from 'i18next';
import down from '@/assets/svgs/down.svg';
import up from '@/assets/svgs/up.svg';
import { ResponseBusinessError } from '@/types/global';
import {
  DEFAULT_MODEL_PROVIDER,
  getModelProviderLabel,
  normalizeModelProvider,
} from '../utils/provider';

const { TextArea } = Input;

// 工具函数
const checkNameConventions = (string: string): boolean => {
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(string);
};

const encryptApiKey = (publicKey: string, apiKey: string): string => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);
  const encrypted = encrypt.encrypt(apiKey);
  if (!encrypted) {
    throw new Error(i18next.t('model.encryptionFailed'));
  }
  return encrypted;
};

const checkParamsTable = (modelParams: ModelConfigParam[]): boolean => {
  let flag = true;
  modelParams.forEach(item => {
    if (!item?.key) {
      item.keyErrMsg = i18next.t('model.pleaseEnterParameterName');
      flag = false;
    } else if (!item?.name) {
      item.nameErrMsg = i18next.t('model.pleaseEnterParameterDescription');
      flag = false;
    } else if (!checkNameConventions(item?.key)) {
      item.keyErrMsg = i18next.t('model.onlyLettersNumbersDashUnderscore');
      flag = false;
    } else {
      item.keyErrMsg = '';
      item.nameErrMsg = '';
    }
  });
  return flag;
};

const hasDuplicateKeys = (
  arr: ModelConfigParam[],
  key: keyof ModelConfigParam = 'key'
): boolean => {
  const seen = new Set();
  return arr.some(obj => {
    if (seen.has(obj[key])) {
      return true;
    }
    seen.add(obj[key]);
    return false;
  });
};

// 验证表单数据
const validateFormData = (modelParams: ModelConfigParam[]): boolean => {
  const flag = checkParamsTable(modelParams);
  if (!flag) {
    message.warning(i18next.t('model.parameterValidationFailed'));
    return false;
  }
  if (hasDuplicateKeys(modelParams)) {
    message.warning(i18next.t('model.parameterNameCannotBeRepeated'));
    return false;
  }
  return true;
};

// 构建基本提交参数
interface BuildSubmitParamsArgs {
  modelInfo: ModelFormData;
  tags: string[];
  botIcon: { name?: string; value?: string };
  botColor: string;
  modelParams: ModelConfigParam[];
  encryptedApiKey: string;
}

const buildSubmitParams = (
  args: BuildSubmitParamsArgs
): ModelCreateParams & {
  endpoint: string;
  apiKey: string;
  description: string;
  icon: string | undefined;
  color: string;
  config: Array<{
    id?: string | number;
    constraintType: 'switch' | 'range';
    default: number | boolean;
    constraintContent: Array<{ name: number | string }>;
    name: string;
    fieldType: 'int' | 'float' | 'boolean';
    initialValue: number | boolean | string;
    key: string;
    required: boolean;
    precision?: number;
  }>;
} => {
  const { modelInfo, tags, botIcon, botColor, modelParams, encryptedApiKey } =
    args;
  return {
    endpoint: modelInfo?.interfaceAddress,
    apiKey: encryptedApiKey,
    modelName: modelInfo?.modelName,
    description: modelInfo?.modelDesc,
    provider: normalizeModelProvider(modelInfo?.provider),
    domain: modelInfo?.domain,
    tag: tags,
    icon: botIcon.value || '',
    color: botColor,
    config: modelParams?.map(item => ({
      id: item?.id,
      constraintType: item?.fieldType === 'boolean' ? 'switch' : 'range',
      default: item?.default,
      constraintContent:
        item?.fieldType === 'boolean'
          ? []
          : [{ name: item?.min || 0 }, { name: item?.max || 0 }],
      name: item?.name,
      fieldType: item?.fieldType,
      initialValue: item?.fieldType === 'boolean' ? false : item?.min || 0,
      key: item?.key,
      required: item?.required,
      precision: item?.precision,
    })),
    isThink: modelInfo?.isThink ?? false,
  };
};

// 构建模型分类请求数据
interface BuildModelCategoryReqArgs {
  modelTypes: number[];
  modelTypeOtherText: string;
  languageSystemId?: number;
  contextLengthSystemId?: number;
  modelScenes?: number[];
  modelSceneOtherText?: string;
  categoryTree?: CategoryNode[];
}

const buildModelCategoryReq = (
  args: BuildModelCategoryReqArgs
): Record<string, unknown> => {
  const {
    modelTypes,
    modelTypeOtherText,
    languageSystemId,
    contextLengthSystemId,
    modelScenes,
    modelSceneOtherText,
    categoryTree,
  } = args;
  const modelCategoryReq: Record<string, unknown> = {};

  const otherCategoryId = categoryTree
    ?.find(t => t.key === 'modelCategory')
    ?.children?.find(c => c.name === '其他')?.id;

  if (modelTypes) {
    modelCategoryReq.categorySystemIds = modelTypes.filter(
      id => id !== otherCategoryId
    );
  }
  if (modelTypeOtherText) {
    modelCategoryReq.categoryCustom = {
      pid: otherCategoryId,
      customName: modelTypeOtherText,
    };
  }
  if (languageSystemId) {
    modelCategoryReq.languageSystemId = languageSystemId;
  }
  if (contextLengthSystemId) {
    modelCategoryReq.contextLengthSystemId = contextLengthSystemId;
  }

  const otherSceneId = categoryTree
    ?.find(t => t.key === 'modelScenario')
    ?.children?.find(c => c.name === '其他')?.id;

  if (modelScenes) {
    modelCategoryReq.sceneSystemIds = modelScenes.filter(
      id => id !== otherSceneId
    );
  }
  if (modelSceneOtherText) {
    modelCategoryReq.sceneCustom = {
      pid: otherSceneId,
      customName: modelSceneOtherText,
    };
  }

  return modelCategoryReq;
};

// 本地模型提交处理
const handleLocalModelSubmit = (params: {
  selectedLocalModel: string;
  modelInfo: ModelFormData;
  botIcon: { name?: string; value?: string };
  botColor: string;
  acceleratorCount: number;
  modelParams: ModelConfigParam[];
  modelTypes: number[];
  modelTypeOtherText: string;
  languageSystemId?: number;
  contextLengthSystemId?: number;
  modelScenes: number[];
  modelSceneOtherText: string;
  categoryTree?: CategoryNode[];
  modelId?: string;
  setLoading: (loading: boolean) => void;
  setCreateModal: (visible: boolean) => void;
  getModels?: () => void;
}): void => {
  const {
    selectedLocalModel,
    modelInfo,
    botIcon,
    botColor,
    acceleratorCount,
    modelParams,
    modelTypes,
    modelTypeOtherText,
    languageSystemId,
    contextLengthSystemId,
    modelScenes,
    modelSceneOtherText,
    categoryTree,
    modelId,
    setLoading,
    setCreateModal,
    getModels,
  } = params;

  // 验证本地模型必填字段
  if (!selectedLocalModel) {
    message.error(i18next.t('model.selectModel'));
    return;
  }

  if (!modelInfo.modelName) {
    message.error(
      i18next.t('model.pleaseEnter') + i18next.t('model.modelName')
    );
    return;
  }

  if (!modelInfo.modelDesc) {
    message.error(
      i18next.t('model.pleaseEnter') + i18next.t('model.modelDescription')
    );
    return;
  }

  if (!validateFormData(modelParams)) return;

  setLoading(true);
  // 构建本地模型参数
  const localModelParams: LocalModelParams = {
    modelName: modelInfo.modelName,
    domain: selectedLocalModel,
    description: modelInfo.modelDesc,
    icon: botIcon.value || '',
    color: botColor,
    acceleratorCount,
    modelPath: selectedLocalModel,
    config: modelParams?.map(item => ({
      id: item?.id,
      constraintType: item?.fieldType === 'boolean' ? 'switch' : 'range',
      default: item?.default,
      constraintContent:
        item?.fieldType === 'boolean'
          ? []
          : [{ name: item?.min || 0 }, { name: item?.max || 0 }],
      name: item?.name,
      fieldType: item?.fieldType,
      initialValue: item?.fieldType === 'boolean' ? false : item?.min || 0,
      key: item?.key,
      required: item?.required,
      precision: item?.precision,
    })),
    modelCategoryReq: buildModelCategoryReq({
      modelTypes,
      modelTypeOtherText,
      languageSystemId,
      contextLengthSystemId,
      modelScenes,
      modelSceneOtherText,
      categoryTree,
    }),
  };

  if (modelId) {
    localModelParams.id = parseInt(modelId);
  }

  createOrUpdateLocalModel(localModelParams)
    .then(() => {
      const successMessageKey = modelId
        ? 'model.localModelUpdateSuccess'
        : 'model.localModelCreateSuccess';
      message.success(i18next.t(successMessageKey));
      setCreateModal(false);
      if (getModels) getModels();
    })
    .catch((error: ResponseBusinessError) => {
      message.error(error.message);
    })
    .finally(() => {
      setLoading(false);
    });
};

// 表单提交处理
const handleSubmitForm = async (params: {
  modelParams: ModelConfigParam[];
  modelInfo: ModelFormData;
  tags: string[];
  botIcon: { name?: string; value?: string };
  botColor: string;
  modelId?: string;
  beforeModelKeys: string;
  modelTypes: number[];
  modelTypeOtherText: string;
  languageSystemId?: number;
  contextLengthSystemId?: number;
  modelScenes: number[];
  modelSceneOtherText: string;
  categoryTree?: CategoryNode[];
  setLoading: (loading: boolean) => void;
  setCreateModal: (visible: boolean) => void;
  getModels?: () => void;
}): Promise<void> => {
  const {
    modelParams,
    modelInfo,
    tags,
    botIcon,
    botColor,
    modelId,
    beforeModelKeys,
    modelTypes,
    modelTypeOtherText,
    languageSystemId,
    contextLengthSystemId,
    modelScenes,
    modelSceneOtherText,
    categoryTree,
    setLoading,
    setCreateModal,
    getModels,
  } = params;
  // 验证表单数据
  if (!validateFormData(modelParams)) return;

  try {
    const data = await modelRsaPublicKey();
    const encryptedApiKey = encryptApiKey(data, modelInfo?.apiKEY);

    // 构建提交参数
    const submitParams = buildSubmitParams({
      modelInfo,
      tags,
      botIcon,
      botColor,
      modelParams,
      encryptedApiKey,
    });

    if (modelId) {
      submitParams.id = parseInt(modelId);
      submitParams.apiKeyMasked = beforeModelKeys !== modelInfo?.apiKEY;
    }

    // 构建分类数据
    submitParams.modelCategoryReq = buildModelCategoryReq({
      modelTypes,
      modelTypeOtherText,
      languageSystemId,
      contextLengthSystemId,
      modelScenes,
      modelSceneOtherText,
      categoryTree,
    });

    setLoading(true);
    await modelCreate(submitParams);
    message.success(i18next.t('model.modelCreateSuccess'));
    setCreateModal(false);
    if (getModels) getModels();
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : i18next.t('model.modelCreateFailed');
    message.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

// 创建模型弹窗属性
interface CreateModalProps {
  setCreateModal: (visible: boolean) => void;
  getModels?: () => void;
  modelId?: string;
  categoryTree?: CategoryNode[];
  setModels?: (models: ModelInfo[]) => void;
  filterType?: number;
  initialProvider?: ModelProviderType | string;
  initialEndpoint?: string;
  lockProvider?: boolean;
  hideLocalModel?: boolean;
  showCategoryForm?: boolean;
}

// 删除模型弹窗属性
interface DeleteModalProps {
  currentModel: ModelInfo;
  setDeleteModal: (visible: boolean) => void;
  getModels?: () => void;
  msg?: string;
}

const SelectLocalModel = ({
  selectedModel,
  onModelChange,
}: {
  selectedModel: string;
  onModelChange: (value: string) => void;
}): JSX.Element => {
  const { t } = useTranslation();
  const [localModelOptions, setLocalModelOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchLocalModels = async (): Promise<void> => {
    try {
      setLoading(true);
      const models = await getLocalModelList();
      const options = models.map((model: LocalModelFile) => ({
        label: model.modelName,
        value: model.modelName,
      }));
      setLocalModelOptions(options);
    } catch (error) {
      message.error(t('model.localModelLoadFailed'));
      setLocalModelOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalModels();
  }, []);

  return (
    <div className="flex flex-col gap-2 font-normal text-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[#F74E43] mr-1">*</span>
          {t('model.selectModel')}：
          <span className="text-[#7f7f7f]">{t('model.selectModelTips')}</span>
          <a
            className="text-[#6356EA]"
            href="https://github.com/iflytek/astron-xmod-shim"
            target="_blank"
          >
            {t('model.referenceDocument')}
          </a>
        </div>
      </div>
      <Select
        placeholder={
          loading
            ? 'Loading...'
            : localModelOptions.length === 0
              ? t('model.noLocalModelsAvailable')
              : t('model.selectModelPlaceholder')
        }
        allowClear
        style={{ width: '100%' }}
        value={selectedModel}
        onChange={onModelChange}
        loading={loading}
        disabled={loading || localModelOptions.length === 0}
        filterOption={(input: string, option?: { label?: string }) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        optionLabelProp="label"
      >
        {localModelOptions?.map((opt: { label: string; value: string }) => (
          <Select.Option key={opt.value} value={opt.value} label={opt.label}>
            {opt.label}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

const PerformanceConfiguration = ({
  acceleratorCount,
  onAcceleratorCountChange,
}: {
  acceleratorCount: number;
  onAcceleratorCountChange: (value: number | null) => void;
}): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 font-normal text-sm">
      <div className="flex items-center">
        <span className="text-[#F74E43] mr-1">*</span>
        {t('model.acceleratorCount')}：
        <img
          src={tipsSvg}
          alt="tips"
          className="w-4 h-4 ml-1 cursor-pointer"
          onClick={() => {
            window.open(
              'https://github.com/iflytek/astron-xmod-shim',
              '_blank'
            );
          }}
        />
      </div>
      <ConfigProvider
        theme={{
          components: {
            InputNumber: {
              handleVisible: true,
              handleBorderColor: 'transparent',
            },
          },
        }}
      >
        {' '}
        <InputNumber
          className="w-[200px]"
          min={0}
          max={8}
          step={1}
          value={acceleratorCount}
          precision={0}
          onChange={onAcceleratorCountChange}
          controls={{
            upIcon: (
              <img
                src={up}
                alt="up"
                className="opacity-30 hover:opacity-100 w-[14px] h-[14px]"
              />
            ),
            downIcon: (
              <img
                src={down}
                alt="down"
                className="opacity-30 hover:opacity-100 w-[14px] h-[14px]"
              />
            ),
          }}
        />
      </ConfigProvider>
    </div>
  );
};

// 模型基本信息表单组件
const ModelBasicForm = ({
  modelInfo,
  setModelInfo,
  botIcon,
  botColor,
  setShowModal,
  modelCreateType,
  lockProvider = false,
}: {
  modelInfo: ModelFormData;
  setModelInfo: (info: ModelFormData) => void;
  botIcon: { name?: string; value?: string };
  botColor: string;
  setShowModal: (show: boolean) => void;
  modelCreateType: ModelCreateType;
  lockProvider?: boolean;
}): JSX.Element => {
  const { t } = useTranslation();
  const currentProvider = normalizeModelProvider(modelInfo?.provider);
  const providerHint =
    currentProvider === ModelProviderType.MINIMAX
      ? t('model.providerHintMiniMax')
      : currentProvider === ModelProviderType.ZHIPU
        ? t('model.providerHintZhipu')
        : currentProvider === ModelProviderType.QWEN
          ? t('model.providerHintQwen')
          : currentProvider === ModelProviderType.MOONSHOT
            ? t('model.providerHintMoonshot')
            : currentProvider === ModelProviderType.CHATGPT
              ? t('model.providerHintChatGPT')
              : currentProvider === ModelProviderType.DOUBAO
                ? t('model.providerHintDoubao')
                : currentProvider === ModelProviderType.DEEPSEEK
      ? t('model.providerHintDeepSeek')
      : currentProvider === ModelProviderType.ANTHROPIC
        ? t('model.providerHintAnthropic')
        : currentProvider === ModelProviderType.GOOGLE
          ? t('model.providerHintGoogle')
          : t('model.providerHintOpenAI');
  const modelPlaceholder =
    currentProvider === ModelProviderType.MINIMAX
      ? t('model.minimaxModelPlaceholder')
      : currentProvider === ModelProviderType.ZHIPU
        ? t('model.zhipuModelPlaceholder')
        : currentProvider === ModelProviderType.QWEN
          ? t('model.qwenModelPlaceholder')
          : currentProvider === ModelProviderType.MOONSHOT
            ? t('model.moonshotModelPlaceholder')
            : currentProvider === ModelProviderType.CHATGPT
              ? t('model.chatgptModelPlaceholder')
              : currentProvider === ModelProviderType.DOUBAO
                ? t('model.doubaoModelPlaceholder')
                : currentProvider === ModelProviderType.DEEPSEEK
      ? t('model.deepseekModelPlaceholder')
      : currentProvider === ModelProviderType.ANTHROPIC
        ? t('model.anthropicModelPlaceholder')
        : currentProvider === ModelProviderType.GOOGLE
          ? t('model.googleModelPlaceholder')
          : t('model.enterModelFieldValue');
  const endpointPlaceholder =
    currentProvider === ModelProviderType.MINIMAX
      ? t('model.minimaxEndpointPlaceholder')
      : currentProvider === ModelProviderType.ZHIPU
        ? t('model.zhipuEndpointPlaceholder')
        : currentProvider === ModelProviderType.QWEN
          ? t('model.qwenEndpointPlaceholder')
          : currentProvider === ModelProviderType.MOONSHOT
            ? t('model.moonshotEndpointPlaceholder')
            : currentProvider === ModelProviderType.CHATGPT
              ? t('model.chatgptEndpointPlaceholder')
              : currentProvider === ModelProviderType.DOUBAO
                ? t('model.doubaoEndpointPlaceholder')
                : currentProvider === ModelProviderType.DEEPSEEK
      ? t('model.deepseekEndpointPlaceholder')
      : currentProvider === ModelProviderType.ANTHROPIC
        ? t('model.anthropicEndpointPlaceholder')
        : currentProvider === ModelProviderType.GOOGLE
          ? t('model.googleEndpointPlaceholder')
          : t('model.interfaceAddressPlaceholder');
  return (
    <>
      {modelCreateType === ModelCreateType.THIRD_PARTY && (
        <div className="flex flex-col gap-2 font-normal text-sm">
          <div className="flex items-center justify-between">
            <div>{t('model.providerLabel')}：</div>
          </div>
          <Select
            value={currentProvider}
            disabled={lockProvider}
            style={{ width: '100%' }}
            options={[
              {
                label: t('model.providerOpenAI'),
                value: ModelProviderType.OPENAI,
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
                label: t('model.providerChatGPT'),
                value: ModelProviderType.CHATGPT,
              },
              {
                label: t('model.providerDoubao'),
                value: ModelProviderType.DOUBAO,
              },
              {
                label: t('model.providerDeepSeek'),
                value: ModelProviderType.DEEPSEEK,
              },
            ]}
            onChange={value =>
              setModelInfo({
                ...modelInfo,
                provider: value,
              })
            }
          />
          <div className="rounded-xl bg-[#F6F7FB] text-[#666] text-xs leading-5 px-3 py-2">
            {providerHint}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]">*</span> {t('model.modelName')}：
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-10 flex justify-center items-center rounded-lg mr-3 cursor-pointer`}
            style={{
              background: botColor
                ? botColor
                : `url(${botIcon?.value || ''}) no-repeat center / cover`,
            }}
            onClick={e => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            {botColor && (
              <img src={botIcon?.value || ''} className="w-6 h-6" alt="" />
            )}
          </div>
          <Input
            placeholder={t('common.inputPlaceholder')}
            className="global-input w-full"
            maxLength={50}
            showCount
            value={modelInfo?.modelName}
            onChange={e =>
              setModelInfo({ ...modelInfo, modelName: e.target.value })
            }
          />
        </div>
      </div>
      {modelCreateType === ModelCreateType.THIRD_PARTY && (
        <>
          <div className="flex flex-col gap-2 font-normal text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#F74E43]">*</span> model：
              </div>
            </div>
            <Input
              maxLength={50}
              showCount
              placeholder={modelPlaceholder}
              className="global-input w-full"
              value={modelInfo?.domain}
              onChange={e =>
                setModelInfo({ ...modelInfo, domain: e.target.value })
              }
            />
          </div>
        </>
      )}
      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]">*</span>{' '}
            {t('model.modelDescription')} ：
          </div>
        </div>
        <div className="relative">
          <TextArea
            placeholder={t('common.inputPlaceholder')}
            className="global-input w-full"
            maxLength={200}
            style={{ height: 90 }}
            value={modelInfo?.modelDesc}
            onChange={e =>
              setModelInfo({ ...modelInfo, modelDesc: e.target.value })
            }
          />
          <div className="absolute bottom-3 right-3 ant-input-limit ">
            {modelInfo?.modelDesc?.length} / 200
          </div>
        </div>
      </div>
      {modelCreateType === ModelCreateType.THIRD_PARTY && (
        <>
          <div className="flex flex-col gap-2 font-normal text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#F74E43]">* </span>{' '}
                {t('model.interfaceAddress')}：
              </div>
            </div>
            <Input
              maxLength={100}
              showCount
              placeholder={endpointPlaceholder}
              className="global-input w-full"
              value={modelInfo?.interfaceAddress}
              onChange={e =>
                setModelInfo({ ...modelInfo, interfaceAddress: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2 font-normal text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#F74E43]">*</span> {t('model.apiKey')}：
              </div>
            </div>
            <Input
              maxLength={255}
              showCount
              placeholder={t('common.inputPlaceholder')}
              className="global-input w-full"
              value={modelInfo?.apiKEY}
              onChange={e =>
                setModelInfo({ ...modelInfo, apiKEY: e.target.value })
              }
            />
          </div>
        </>
      )}
      {/* isThink toggle for enabling thinking capability */}
      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>{t('model.thinkingCapability')}：</div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={modelInfo?.isThink}
            onChange={checked => setModelInfo({ ...modelInfo, isThink: checked })}
          />
          <span className="text-xs text-gray-500">{t('model.enableThinkingCapability')}</span>
        </div>
      </div>
    </>
  );
};

// 模型分类表单组件
interface ModelCategoryFormProps {
  modelTypes: number[];
  handleTypeChange: (next: number[]) => void;
  categoryOptions?: Array<{ label: string; value: number }>;
  hasOtherSelected: boolean;
  modelTypeOtherText: string;
  setModelTypeOtherText: (text: string) => void;
  languageSystemId?: number;
  setLanguageSystemId: (id: number | undefined) => void;
  languageSupportOptions?: Array<{ label: string; value: number }>;
  contextLengthSystemId?: number;
  setContextLengthSystemId: (id: number | undefined) => void;
  contextLengthOptions?: Array<{ label: string; value: number }>;
  modelScenes: number[];
  handleSceneChange: (next: number[]) => void;
  sceneOptions?: Array<{ label: string; value: number }>;
  hasSceneOtherSelected: boolean;
  modelSceneOtherText: string;
  setModelSceneOtherText: (text: string) => void;
}

const ModelCategoryForm = ({
  modelTypes,
  handleTypeChange,
  categoryOptions,
  hasOtherSelected,
  modelTypeOtherText,
  setModelTypeOtherText,
  languageSystemId,
  setLanguageSystemId,
  languageSupportOptions,
  contextLengthSystemId,
  setContextLengthSystemId,
  contextLengthOptions,
  modelScenes,
  handleSceneChange,
  sceneOptions,
  hasSceneOtherSelected,
  modelSceneOtherText,
  setModelSceneOtherText,
}: ModelCategoryFormProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]"></span>
            {t('model.modelType')}：
          </div>
        </div>
        <Select
          mode="multiple"
          placeholder={t('model.pleaseSelectModelType')}
          allowClear
          style={{ width: '100%' }}
          value={modelTypes}
          onChange={handleTypeChange}
          filterOption={(input: string, option?: { label?: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          optionLabelProp="label"
        >
          {categoryOptions?.map((opt: { label: string; value: number }) => (
            <Select.Option key={opt.value} value={opt.value} label={opt.label}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
        {hasOtherSelected && (
          <Input
            className="mt-2"
            placeholder={t('model.pleaseEnterCustomCategory')}
            maxLength={30}
            showCount
            value={modelTypeOtherText}
            onChange={e => setModelTypeOtherText(e.target.value)}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]"></span>
            {t('model.languageSupport')}：
          </div>
        </div>
        <Select
          placeholder={t('model.pleaseSelectLanageSupport')}
          allowClear
          style={{ width: '100%' }}
          value={languageSystemId}
          onChange={val => setLanguageSystemId(val)}
          filterOption={(input: string, option?: { label?: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          optionLabelProp="label"
        >
          {languageSupportOptions?.map(
            (opt: { label: string; value: number }) => (
              <Select.Option
                key={opt.value}
                value={opt.value}
                label={opt.label}
              >
                {opt.label}
              </Select.Option>
            )
          )}
        </Select>
      </div>

      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]"></span>
            {t('model.contextLength')}：
          </div>
        </div>
        <Select
          placeholder={t('model.pleaseSelectContextLenght')}
          allowClear
          style={{ width: '100%' }}
          value={contextLengthSystemId}
          onChange={val => setContextLengthSystemId(val)}
          filterOption={(input: string, option?: { label?: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          optionLabelProp="label"
        >
          {contextLengthOptions?.map(
            (opt: { label: string; value: number }) => (
              <Select.Option
                key={opt.value}
                value={opt.value}
                label={opt.label}
              >
                {opt.label}
              </Select.Option>
            )
          )}
        </Select>
      </div>

      <div className="flex flex-col gap-2 font-normal text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#F74E43]"></span>
            {t('model.modelScene')}：
          </div>
        </div>
        <Select
          mode="multiple"
          placeholder={t('model.pleaseSelectModelScene')}
          allowClear
          style={{ width: '100%' }}
          value={modelScenes}
          onChange={handleSceneChange}
          filterOption={(input: string, option?: { label?: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          optionLabelProp="label"
        >
          {sceneOptions?.map((opt: { label: string; value: number }) => (
            <Select.Option key={opt.value} value={opt.value} label={opt.label}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
        {hasSceneOtherSelected && (
          <Input
            className="mt-2"
            placeholder={t('model.pleaseEnterCustomScene')}
            maxLength={30}
            showCount
            value={modelSceneOtherText}
            onChange={e => setModelSceneOtherText(e.target.value)}
          />
        )}
      </div>
    </>
  );
};

// 模型基本信息 Hook
const useModelForm = (): {
  t: (key: string) => string;
  modelInfo: ModelFormData;
  setModelInfo: (info: ModelFormData) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  beforeModelKeys: React.MutableRefObject<string>;
} => {
  const { t } = useTranslation();
  const [modelInfo, setModelInfo] = useState<ModelFormData>({
    modelName: '',
    modelDesc: '',
    interfaceAddress: '',
    apiKEY: '',
    domain: '',
    provider: DEFAULT_MODEL_PROVIDER,
    isThink: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const beforeModelKeys = useRef<string>('');

  return {
    t,
    modelInfo,
    setModelInfo,
    tags,
    setTags,
    loading,
    setLoading,
    beforeModelKeys,
  };
};

// 头像管理 Hook
const useModelAvatar = (
  modelId?: string
): {
  avatarIcon: Array<{ name?: string; value?: string }>;
  avatarColor: Array<{ name?: string }>;
  botIcon: { name?: string; value?: string };
  setBotIcon: (icon: { name?: string; value?: string }) => void;
  botColor: string;
  setBotColor: (color: string) => void;
} => {
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);
  const [botIcon, setBotIcon] = useState<{ name?: string; value?: string }>({});
  const [botColor, setBotColor] = useState('');

  useEffect(() => {
    getAvatarConfig();
  }, []);
  useEffect(() => {
    !modelId &&
      avatarIcon.length > 0 &&
      avatarIcon[0] &&
      setBotIcon(avatarIcon[0]);
    !modelId &&
      avatarColor.length > 0 &&
      setBotColor(avatarColor[0]?.name || '');
  }, [avatarIcon, avatarColor, modelId]);

  return {
    avatarIcon,
    avatarColor,
    botIcon,
    setBotIcon,
    botColor,
    setBotColor,
  };
};

// 模型参数 Hook
const useModelParams = (
  modalRef: React.RefObject<HTMLDivElement>
): {
  modelParams: ModelConfigParam[];
  setModelParams: (params: ModelConfigParam[]) => void;
  handleAddData: () => void;
} => {
  const { t } = useTranslation();
  const [modelParams, setModelParams] = useState<ModelConfigParam[]>([
    {
      id: uuid(),
      key: 'temperature',
      name: t('model.temperatureDescription'),
      fieldType: 'float',
      precision: 1,
      min: 0,
      max: 2,
      required: false,
      default: 1,
      standard: true,
      constraintType: 'range',
      constraintContent: [],
      initialValue: 1,
    },
  ]);

  const handleAddData = useCallback(() => {
    const newData: ModelConfigParam = {
      id: uuid(),
      key: '',
      name: '',
      fieldType: 'int',
      precision: 0,
      min: 0,
      max: 10,
      required: false,
      default: 0,
      standard: false,
      constraintType: 'range',
      constraintContent: [],
      initialValue: 0,
    };
    setModelParams([...modelParams, newData]);
    window.setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.scrollTo({
          top: modalRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 0);
  }, [modelParams, modalRef]);

  return { modelParams, setModelParams, handleAddData };
};

// 分类管理 Hook
const useModelCategories = (
  categoryTree?: CategoryNode[]
): {
  categoryOptions?: Array<{ label: string; value: number }>;
  languageSupportOptions?: Array<{ label: string; value: number }>;
  contextLengthOptions?: Array<{ label: string; value: number }>;
  sceneOptions?: Array<{ label: string; value: number }>;
  modelTypes: number[];
  setModelTypes: (types: number[]) => void;
  modelTypeOtherText: string;
  setModelTypeOtherText: (text: string) => void;
  languageSystemId?: number;
  setLanguageSystemId: (id: number | undefined) => void;
  contextLengthSystemId?: number;
  setContextLengthSystemId: (id: number | undefined) => void;
  modelScenes: number[];
  setModelScenes: (scenes: number[]) => void;
  modelSceneOtherText: string;
  setModelSceneOtherText: (text: string) => void;
  hasOtherSelected: boolean;
  hasSceneOtherSelected: boolean;
  handleTypeChange: (next: number[]) => void;
  handleSceneChange: (next: number[]) => void;
} => {
  const categoryOptions = categoryTree
    ?.find(t => t.key === 'modelCategory')
    ?.children.map(c => ({ label: c.name, value: c.id }));
  const languageSupportOptions = categoryTree
    ?.find(t => t.key === 'languageSupport')
    ?.children.map(c => ({ label: c.name, value: c.id }));
  const contextLengthOptions = categoryTree
    ?.find(t => t.key === 'contextLengthTag')
    ?.children.map(c => ({ label: c.name, value: c.id }));
  const sceneOptions = categoryTree
    ?.find(t => t.key === 'modelScenario')
    ?.children.map(c => ({ label: c.name, value: c.id }));

  const [modelTypes, setModelTypes] = useState<number[]>([]);
  const [modelTypeOtherText, setModelTypeOtherText] = useState('');
  const [languageSystemId, setLanguageSystemId] = useState<
    number | undefined
  >();
  const [contextLengthSystemId, setContextLengthSystemId] = useState<
    number | undefined
  >();
  const [modelScenes, setModelScenes] = useState<number[]>([]);
  const [modelSceneOtherText, setModelSceneOtherText] = useState('');

  const hasOtherSelected = useMemo(
    () =>
      modelTypes.some(
        v => categoryOptions?.find(o => o.value === v)?.label === '其他'
      ),
    [modelTypes, categoryOptions]
  );

  const hasSceneOtherSelected = useMemo(
    () =>
      modelScenes.some(
        v => sceneOptions?.find(o => o.value === v)?.label === '其他'
      ),
    [modelScenes, sceneOptions]
  );

  const handleTypeChange = (next: number[]): void => {
    setModelTypes(next);
    const stillHasOther = next.some(
      (v: number) => categoryOptions?.find(o => o.value === v)?.label === '其他'
    );
    if (!stillHasOther) setModelTypeOtherText('');
  };

  const handleSceneChange = (next: number[]): void => {
    setModelScenes(next);
    const stillHasOther = next.some(
      (v: number) => sceneOptions?.find(o => o.value === v)?.label === '其他'
    );
    if (!stillHasOther) setModelSceneOtherText('');
  };

  return {
    categoryOptions,
    languageSupportOptions,
    contextLengthOptions,
    sceneOptions,
    modelTypes,
    setModelTypes,
    modelTypeOtherText,
    setModelTypeOtherText,
    languageSystemId,
    setLanguageSystemId,
    contextLengthSystemId,
    setContextLengthSystemId,
    modelScenes,
    setModelScenes,
    modelSceneOtherText,
    setModelSceneOtherText,
    hasOtherSelected,
    hasSceneOtherSelected,
    handleTypeChange,
    handleSceneChange,
  };
};

// 数据提取辅助函数
const extractModelTypes = (categoryTree: CategoryNode[]): number[] =>
  categoryTree
    ?.find(item => item.key === 'modelCategory')
    ?.children.map(child => child.id) || [];

const extractOtherText = (categoryTree: CategoryNode[], key: string): string =>
  categoryTree
    ?.find(item => item.key === key)
    ?.children?.find(item => item.name === '其他')?.children?.[0]?.name || '';

const extractSystemId = (
  categoryTree: CategoryNode[],
  key: string
): number | undefined =>
  categoryTree?.find(item => item.key === key)?.children?.[0]?.id;

const extractModelScenes = (categoryTree: CategoryNode[]): number[] =>
  categoryTree
    ?.find(item => item.key === 'modelScenario')
    ?.children.map(child => child.id) || [];

const updateCategoryStates = (
  data: ModelInfo,
  categoryState: ReturnType<typeof useModelCategories>
): void => {
  categoryState.setModelTypes(extractModelTypes(data.categoryTree || []));
  categoryState.setModelTypeOtherText(
    extractOtherText(data.categoryTree || [], 'modelCategory')
  );
  categoryState.setLanguageSystemId(
    extractSystemId(data.categoryTree || [], 'languageSupport')
  );
  categoryState.setContextLengthSystemId(
    extractSystemId(data.categoryTree || [], 'contextLengthTag')
  );
  categoryState.setModelScenes(extractModelScenes(data.categoryTree || []));
  categoryState.setModelSceneOtherText(
    extractOtherText(data.categoryTree || [], 'modelScenario')
  );
};

const updateBasicInfo = (
  data: ModelInfo,
  formState: ReturnType<typeof useModelForm>,
  avatarState: ReturnType<typeof useModelAvatar>
): void => {
  formState.setModelInfo({
    modelName: data?.name || '',
    modelDesc: data?.desc || '',
    interfaceAddress: data?.url || '',
    apiKEY: data?.apiKey || '',
    domain: data?.domain || '',
    provider: normalizeModelProvider(data?.provider),
    isThink: data?.isThink ?? false,
  });
  formState.beforeModelKeys.current = data?.apiKey || '';
  avatarState.setBotIcon({ name: data?.address || '', value: data?.icon });
  avatarState.setBotColor(data?.color || '');
  formState.setTags(data?.tags || []);
};

const updateModelParams = (
  data: ModelInfo,
  paramsState: ReturnType<typeof useModelParams>
): void => {
  paramsState.setModelParams(
    JSON.parse(data?.config || '[]')?.map((item: ModelConfigParam) => ({
      ...item,
      id: uuid(),
      min: item?.constraintContent?.[0]?.name,
      max: item?.constraintContent?.[1]?.name,
    }))
  );
};

// 组合主 Hook
const useCreateModal = (
  modelId?: string,
  categoryTree?: CategoryNode[],
  initialProvider?: ModelProviderType | string,
  initialEndpoint?: string,
  hideLocalModel = false
): ReturnType<typeof useModelForm> &
  ReturnType<typeof useModelAvatar> &
  ReturnType<typeof useModelParams> &
  ReturnType<typeof useModelCategories> & {
    modalRef: React.RefObject<HTMLDivElement>;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    modelCreateType: ModelCreateType;
    setModelCreateType: (type: ModelCreateType) => void;
    selectedLocalModel: string;
    setSelectedLocalModel: (model: string) => void;
    acceleratorCount: number;
    setAcceleratorCount: (count: number) => void;
  } => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [modelCreateType, setModelCreateType] = useState<ModelCreateType>(
    hideLocalModel ? ModelCreateType.THIRD_PARTY : ModelCreateType.THIRD_PARTY
  );
  const [selectedLocalModel, setSelectedLocalModel] = useState<string>('');
  const [acceleratorCount, setAcceleratorCount] = useState<number>(1);

  const formState = useModelForm();
  const avatarState = useModelAvatar(modelId);
  const paramsState = useModelParams(modalRef);
  const categoryState = useModelCategories(categoryTree);

  // 重置表单数据函数
  const resetFormData = useCallback((): void => {
    // 重置基本信息
    formState.setModelInfo({
      modelName: '',
      modelDesc: '',
      interfaceAddress: initialEndpoint || '',
      apiKEY: '',
      domain: '',
      provider: normalizeModelProvider(initialProvider),
      isThink: false,
    });
    formState.setTags([]);
    formState.beforeModelKeys.current = '';

    // 重置头像和颜色为默认值
    if (avatarState.avatarIcon.length > 0 && avatarState.avatarIcon[0]) {
      avatarState.setBotIcon(avatarState.avatarIcon[0]);
    }
    if (avatarState.avatarColor.length > 0) {
      avatarState.setBotColor(avatarState.avatarColor[0]?.name || '');
    }

    // 重置模型参数为默认值
    const { t } = formState;
    paramsState.setModelParams([
      {
        id: uuid(),
        key: 'temperature',
        name: t('model.temperatureDescription'),
        fieldType: 'float',
        precision: 1,
        min: 0,
        max: 2,
        required: false,
        default: 1,
        standard: true,
        constraintType: 'range',
        constraintContent: [],
        initialValue: 1,
      },
    ]);

    // 重置分类相关状态
    categoryState.setModelTypes([]);
    categoryState.setModelTypeOtherText('');
    categoryState.setLanguageSystemId(undefined);
    categoryState.setContextLengthSystemId(undefined);
    categoryState.setModelScenes([]);
    categoryState.setModelSceneOtherText('');

    // 重置本地模型相关状态
    setSelectedLocalModel('');
    setAcceleratorCount(1);
  }, [
    formState,
    avatarState,
    paramsState,
    categoryState,
    initialProvider,
    initialEndpoint,
  ]);

  // 切换模型类型并重置表单数据
  const handleModelCreateTypeChange = useCallback(
    (type: ModelCreateType): void => {
      setModelCreateType(type);
      // 只在非编辑模式下重置表单数据
      if (!modelId) {
        resetFormData();
      }
    },
    [modelId, resetFormData]
  );

  // 编辑模式数据加载
  useEffect(() => {
    if (!modelId) {
      formState.setModelInfo({
        ...formState.modelInfo,
        interfaceAddress: initialEndpoint || formState.modelInfo.interfaceAddress,
        provider: normalizeModelProvider(initialProvider),
        isThink: formState.modelInfo.isThink ?? false,
      });
    }
  }, [initialProvider, initialEndpoint, modelId]);

  useEffect(() => {
    if (modelId) {
      getModelDetail({
        modelId: parseInt(modelId),
        llmSource: LLMSource.CUSTOM,
      })
        .then(data => {
          updateCategoryStates(data, categoryState);
          updateBasicInfo(data, formState, avatarState);
          updateModelParams(data, paramsState);
          setModelCreateType(data.type);
          if (data.type === ModelCreateType.LOCAL) {
            setSelectedLocalModel(data.domain || '');
          }
        })
        .catch((error: ResponseBusinessError) => {
          message.error(error.message);
        });
    }
  }, [modelId]);

  return {
    modalRef,
    showModal,
    setShowModal,
    modelCreateType,
    setModelCreateType: handleModelCreateTypeChange,
    selectedLocalModel,
    setSelectedLocalModel,
    acceleratorCount,
    setAcceleratorCount,
    ...formState,
    ...avatarState,
    ...paramsState,
    ...categoryState,
  };
};

// 模型参数表格组件
const ModelParametersSection = ({
  handleAddData,
  modelParams,
  setModelParams,
}: {
  handleAddData: () => void;
  modelParams: ModelConfigParam[];
  setModelParams: (params: ModelConfigParam[]) => void;
}): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 font-normal text-sm">
      <div className="w-full flex items-center justify-between">
        <div>{t('model.modelParameters')}：</div>
        <div
          className="flex items-center gap-1.5 text-[#6356EA] cursor-pointer"
          onClick={handleAddData}
        >
          <img src={inputAddIcon} className="w-2.5 h-2.5" alt="" />
          <span>{t('model.add')}</span>
        </div>
      </div>
      <div>
        <ModelParamsTable
          modelParams={modelParams}
          setModelParams={setModelParams}
          checkNameConventions={checkNameConventions}
        />
      </div>
    </div>
  );
};

export function CreateModal({
  setCreateModal,
  getModels,
  modelId,
  categoryTree,
  initialProvider,
  initialEndpoint,
  lockProvider = false,
  hideLocalModel = false,
  showCategoryForm = true,
}: CreateModalProps): JSX.Element {
  const modalState = useCreateModal(
    modelId,
    categoryTree,
    initialProvider,
    initialEndpoint,
    hideLocalModel
  );
  const { t } = useTranslation();
  const isEditMode = !!modelId;
  const currentProvider = normalizeModelProvider(modalState.modelInfo?.provider);
  const modalTitle =
    modalState.modelCreateType === ModelCreateType.THIRD_PARTY
      ? t('model.addProviderModel', {
          provider: getModelProviderLabel(currentProvider),
        })
      : t('model.selectLocalModel');
  const handleOk = (): void => {
    if (modalState.modelCreateType === ModelCreateType.LOCAL) {
      handleLocalModelSubmit({
        selectedLocalModel: modalState.selectedLocalModel,
        modelInfo: modalState.modelInfo,
        botIcon: modalState.botIcon,
        botColor: modalState.botColor,
        acceleratorCount: modalState.acceleratorCount,
        modelParams: modalState.modelParams,
        modelTypes: modalState.modelTypes,
        modelTypeOtherText: modalState.modelTypeOtherText,
        languageSystemId: modalState.languageSystemId,
        contextLengthSystemId: modalState.contextLengthSystemId,
        modelScenes: modalState.modelScenes,
        modelSceneOtherText: modalState.modelSceneOtherText,
        categoryTree,
        modelId,
        setLoading: modalState.setLoading,
        setCreateModal,
        getModels,
      });
    } else {
      handleSubmitForm({
        modelParams: modalState.modelParams,
        modelInfo: modalState.modelInfo,
        tags: modalState.tags,
        botIcon: modalState.botIcon,
        botColor: modalState.botColor,
        modelId,
        beforeModelKeys: modalState.beforeModelKeys.current,
        modelTypes: modalState.modelTypes,
        modelTypeOtherText: modalState.modelTypeOtherText,
        languageSystemId: modalState.languageSystemId,
        contextLengthSystemId: modalState.contextLengthSystemId,
        modelScenes: modalState.modelScenes,
        modelSceneOtherText: modalState.modelSceneOtherText,
        categoryTree,
        setLoading: modalState.setLoading,
        setCreateModal,
        getModels,
      });
    }
  };
  return (
    <div className="mask cursor-default" onClick={e => e.stopPropagation()}>
      {modalState.showModal && (
        <MoreIcons
          icons={modalState.avatarIcon}
          colors={modalState.avatarColor}
          botIcon={modalState.botIcon}
          setBotIcon={modalState.setBotIcon}
          botColor={modalState.botColor}
          setBotColor={modalState.setBotColor}
          setShowModal={modalState.setShowModal}
        />
      )}
      <div
        className="modalContent text-sm"
        style={{ paddingRight: 0, width: 880 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between font-medium pr-6 mb-[16px]">
          <span className="font-semibold text-base text-[#3d3d3d]">
            {modalTitle}
          </span>
          <img
            src={close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={e => {
              e.stopPropagation();
              setCreateModal(false);
            }}
          />
        </div>
        <div
          className="pr-6 flex flex-col gap-6 overflow-auto"
          style={{ maxHeight: '60vh' }}
          ref={modalState.modalRef}
        >
          {!hideLocalModel && (
            <div className="flex">
              <div className="flex items-center bg-[#f6f9ff] rounded-xl h-10 p-1 gap-1">
                <div
                  className={`${
                    modalState.modelCreateType === ModelCreateType.THIRD_PARTY
                      ? 'bg-white text-[#6356EA] shadow'
                      : 'text-[#7f7f7f] hover:text-[#6356EA]'
                  } min-w-[70px] h-8 px-3 rounded-lg text-sm flex items-center justify-center  transition-colors ${isEditMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() =>
                    modalState.setModelCreateType(ModelCreateType.THIRD_PARTY)
                  }
                >
                  {t('model.addThirdPartyModel')}
                </div>
                <div
                  className={`${
                    modalState.modelCreateType === ModelCreateType.LOCAL
                      ? 'bg-white text-[#6356EA] shadow'
                      : 'text-[#7f7f7f] hover:text-[#6356EA]'
                  } min-w-[70px] h-8 px-3 rounded-lg text-sm flex items-center justify-center  transition-colors ${isEditMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() =>
                    modalState.setModelCreateType(ModelCreateType.LOCAL)
                  }
                >
                  {t('model.selectLocalModel')}
                </div>
              </div>
            </div>
          )}

          {modalState.modelCreateType === ModelCreateType.LOCAL && (
            <SelectLocalModel
              selectedModel={modalState.selectedLocalModel}
              onModelChange={modalState.setSelectedLocalModel}
            />
          )}
          <ModelBasicForm
            modelInfo={modalState.modelInfo}
            setModelInfo={modalState.setModelInfo}
            botIcon={modalState.botIcon}
            botColor={modalState.botColor}
            setShowModal={modalState.setShowModal}
            modelCreateType={modalState.modelCreateType}
            lockProvider={lockProvider}
          />
          {showCategoryForm && (
            <ModelCategoryForm
              modelTypes={modalState.modelTypes}
              handleTypeChange={modalState.handleTypeChange}
              categoryOptions={modalState.categoryOptions}
              hasOtherSelected={modalState.hasOtherSelected}
              modelTypeOtherText={modalState.modelTypeOtherText}
              setModelTypeOtherText={modalState.setModelTypeOtherText}
              languageSystemId={modalState.languageSystemId}
              setLanguageSystemId={modalState.setLanguageSystemId}
              languageSupportOptions={modalState.languageSupportOptions}
              contextLengthSystemId={modalState.contextLengthSystemId}
              setContextLengthSystemId={modalState.setContextLengthSystemId}
              contextLengthOptions={modalState.contextLengthOptions}
              modelScenes={modalState.modelScenes}
              handleSceneChange={modalState.handleSceneChange}
              sceneOptions={modalState.sceneOptions}
              hasSceneOtherSelected={modalState.hasSceneOtherSelected}
              modelSceneOtherText={modalState.modelSceneOtherText}
              setModelSceneOtherText={modalState.setModelSceneOtherText}
            />
          )}
          {modalState.modelCreateType === ModelCreateType.LOCAL && (
            <PerformanceConfiguration
              acceleratorCount={modalState.acceleratorCount}
              onAcceleratorCountChange={value =>
                modalState.setAcceleratorCount(value ?? 0)
              }
            />
          )}
          <ModelParametersSection
            handleAddData={modalState.handleAddData}
            modelParams={modalState.modelParams}
            setModelParams={modalState.setModelParams}
          />
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7 pr-6">
          <Button
            loading={modalState.loading}
            type="primary"
            className="px-[48px]"
            onClick={handleOk}
            disabled={
              !modalState.modelInfo?.modelName ||
              !modalState.modelInfo?.modelDesc ||
              (modalState.modelCreateType === ModelCreateType.THIRD_PARTY &&
                (!modalState.modelInfo?.interfaceAddress ||
                  !modalState.modelInfo?.apiKEY)) ||
              (modalState.modelCreateType === ModelCreateType.LOCAL &&
                !modalState.selectedLocalModel)
            }
          >
            {modalState.t('common.submit')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-[48px]"
            onClick={e => {
              e.stopPropagation();
              setCreateModal(false);
            }}
          >
            {modalState.t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeleteModal({
  currentModel,
  setDeleteModal,
  getModels,
  msg,
}: DeleteModalProps): JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  function handleOk(): void {
    setLoading(true);
    deleteModelAPI(currentModel.modelId)
      .then(() => {
        message.success(t('model.modelDeleteSuccess'));
        setDeleteModal(false);
        getModels?.();
      })
      .catch(error => {
        const errorMessage =
          error instanceof Error ? error.message : t('model.modelDeleteFailed');
        message.error(errorMessage);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="mask">
      <div
        className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[310px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">{t('model.confirmDeleteModel')}</p>
        </div>
        <div className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2">
          {currentModel.name}
        </div>
        <p className="mt-6 text-desc max-w-[310px]">{msg}</p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            onClick={e => {
              e.stopPropagation();
              handleOk();
            }}
            className="delete-btn"
            style={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {t('model.delete')}
          </Button>
          <Button
            type="text"
            className="origin-btn"
            onClick={e => {
              e.stopPropagation();

              setDeleteModal(false);
            }}
            style={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
