import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import {
  Form,
  Input,
  Button,
  Select,
  message,
  Spin,
  Row,
  Col,
  Tabs,
} from 'antd';

import ConfigHeader from '@/components/config-page-component/config-header/ConfigHeader';
import CapabilityDevelopment from '@/components/config-page-component/config-base/components/CapabilityDevelopment';
import UploadCover from '@/components/upload-avatar/index';
import PromptTry, { PromptTryRef } from '@/components/prompt-try';
import InputBox from '@/components/prompt-try/input-box';
import WxModal from '@/components/wx-modal';

import { configListRepos } from '@/services/knowledge';
import { handleAgentStatus } from '@/services/release-management';
import {
  getBotInfo,
  getBotType,
  insertBot,
  // sendApplyBot,
  updateBot,
  listRepos,
  // updateDoneBot,
  quickCreateBot,
  getModelList,
  ModelListData,
} from '@/services/spark-common';
import { useSparkCommonStore } from '@/store/spark-store/spark-common';
import { useBotStateStore } from '@/store/spark-store/bot-state';
import usePrompt from '@/hooks/use-prompt';
import { v4 as uuid } from 'uuid';
import eventBus from '@/utils/event-bus';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';
import { getLanguageCode } from '@/utils/http';

import spark from '@/assets/imgs/sparkImg/icon_spark.png';
import deepseek from '@/assets/imgs/sparkImg/icon_deepseek.png';
import starIcon from '@/assets/imgs/sparkImg/star.svg';
import promptIcon from '@/assets/imgs/sparkImg/prompt.svg';
import tipIcon from '@/assets/imgs/sparkImg/tip.svg';

import styles from './index.module.scss';

import {
  ChatProps,
  BaseModelConfig,
  DatasetItem,
  PageDataItem,
  MaasDatasetItem,
  TreeNode,
  KnowledgeLeaf,
  Knowledge,
} from './types';
import { VcnItem } from '@/components/speaker-modal';
import { getVcnList } from '@/services/chat';

const { Option } = Select;

const baseModelConfig: BaseModelConfig = {
  visible: false,
  isSending: false,
  optionsVisible: false,
  modelInfo: {
    plan: {
      hasAuthorization: true,
      llmId: -99,
      modelId: 0,
      api: '',
      llmSource: '',
      patchId: [],
      serviceId: '',
      name: '',
      value: '',
      configs: [],
    },
    summary: {
      hasAuthorization: true,
      llmId: -99,
      modelId: 0,
      api: '',
      llmSource: '',
      patchId: [],
      serviceId: '',
      name: '',
      value: '',
      configs: [],
    },
  },
};

const BaseConfig: React.FC<ChatProps> = ({
  currentRobot,
  setCurrentRobot,
  currentTab,
  setCurrentTab,
}) => {
  const backgroundImg = useSparkCommonStore(state => state.backgroundImg);
  const setBackgroundImg = useSparkCommonStore(state => state.setBackgroundImg);
  const backgroundImgApp = useSparkCommonStore(state => state.backgroundImgApp);
  const setBackgroundImgApp = useSparkCommonStore(
    state => state.setBackgroundImgApp
  );
  const configPageData = useSparkCommonStore(state => state.configPageData);
  const setConfigPageData = useSparkCommonStore(
    state => state.setConfigPageData
  );

  const setInputExampleTip = useSparkCommonStore(
    state => state.setInputExampleTip
  );
  const inputExampleModel = useSparkCommonStore(
    state => state.inputExampleModel
  );
  const setInputExampleModel = useSparkCommonStore(
    state => state.setInputExampleModel
  );
  const setBotInfo = useBotStateStore(state => state.setBotDetailInfo); // 助手详细信息

  const [fabuFlag, setFabuFlag] = useState<boolean>(false);
  const [openWxmol, setOpenWxmol] = useState<boolean>(false);
  const { t } = useTranslation();
  const [askValue, setAskValue] = useState('');
  const [sentence, setSentence] = useState(0); //是否是一句话创建
  const [globalLoading, setGlobalLoading] = useState(false); // 全局loading状态
  const loadingInstances = useRef(new Set<string>()); // 跟踪正在loading的实例

  // PromptTry实例的refs
  const defaultPromptTryRef = useRef<PromptTryRef>(null);
  const tipPromptTryRefs = useRef<(PromptTryRef | null)[]>([]);
  const modelPromptTryRefs = useRef<(PromptTryRef | null)[]>([]);
  const [botCreateActiveV, setBotCreateActiveV] = useState<{
    cn: string;
  }>({
    cn: '',
  });
  const [modelList, setModelList]: any = useState([
    {
      modelId: 'null',
      modelName: '星火大模型 Spark X1',
      modelDomain: 'x1',
      model: '', // 将在 modelOptions 加载后初始化
      modelIcon:
        'https://openres.xfyun.cn/xfyundoc/2025-09-24/e9b74fbb-c2d6-4f4a-8c07-0ea7f03ee03a/1758681839941/icon.png',
      promptAnswerCompleted: true,
    },
    {
      modelId: 'null',
      modelName: '星火大模型 Spark V4.0 Ultra',
      modelDomain: 'spark',
      model: '', // 将在 modelOptions 加载后初始化
      modelIcon:
        'https://openres.xfyun.cn/xfyundoc/2025-09-24/e9b74fbb-c2d6-4f4a-8c07-0ea7f03ee03a/1758681839941/icon.png',
      promptAnswerCompleted: true,
    },
  ]);
  const [questionTipActive, setQuestionTipActive] = useState(-1);
  const navigate = useNavigate();
  const [prologue, setPrologue] = useState('');
  const [createBotton, setCreateBotton] = useState<any>(false);
  const [botTemplateInfoValue, _setBotTemplateInfoValue] = useState<any>(
    JSON.parse(sessionStorage.getItem('botTemplateInfoValue') ?? '{}')
  );
  const [detailInfo, setDetailInfo] = useState<any>({});
  const [baseinfo, setBaseinfo] = useState<any>({});
  const [inputExample, setInputExample] = useState<string[]>([]);
  const [bottypeList, setBottypeList] = useState<any>([]);
  const [searchParams] = useSearchParams();
  const [selectSource, setSelectSource] = useState<any>([]);
  const [prompt, setPrompt] = useState(t('configBase.prompt'));
  const [promptList, setPromptList]: any = useState([
    { prompt: prompt, promptAnswerCompleted: true },
    { prompt: prompt, promptAnswerCompleted: true },
  ]);
  const [choosedAlltool, setChoosedAlltool] = useState<any>({
    ifly_search: true,
    text_to_image: true,
    codeinterpreter: true,
  });
  const [supportSystemFlag, setSupportSystemFlag] = useState(false);
  const [supportContextFlag, setSupportContextFlag] = useState(false);
  const [promptNow, setPromptNow] = useState();
  const [coverUrl, setCoverUrl] = useState<string>(''); // 助手封面图
  const isMounted = useRef(false);
  const [isChanged, setIsChanged] = useState(false);
  const [promptData, setPromptData] = useState('');
  const [suggest, setSuggest] = useState(false);
  const [resource, setResource] = useState(false);
  const [conversationStarter, setConversationStarter] = useState('');
  const [conversation, setConversation] = useState(false);
  const [presetQuestion, setPresetQuestion] = useState(['']);
  const [feedback, setFeedback] = useState(false);

  // 人设相关状态
  const [personalityData, setPersonalityData] = useState({
    enablePersonality: false,
    personalityConfig: null as {
      personality?: string;
      sceneType?: 1 | 2;
      sceneInfo?: string;
    } | null,
  });

  // 处理人设数据变化，保持enablePersonality的用户选择状态
  const handlePersonalityChange = useCallback(
    (data: {
      enablePersonality: boolean;
      personalityConfig: {
        personality?: string;
        sceneType?: 1 | 2;
        sceneInfo?: string;
      } | null;
    }) => {
      // 直接保存用户选择的enablePersonality状态，不根据内容自动改变
      setPersonalityData(data);
    },
    []
  );

  const [files, setFiles] = useState<any[]>([]);
  const [repoConfig, setRepoConfig] = useState({
    topK: 5,
    scoreThreshold: 0.94,
  });
  const [flows, setFlows] = useState<any[]>([]);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({});
  const [tools, setTools] = useState<any[]>([]);
  const [tree, setTree] = useState<any>([]);
  const [knowledges, setKnowledges] = useState<any[]>([]);
  const [chatModelList, setChatModelList] = useState([
    {
      id: uuid(),
      ...JSON.parse(JSON.stringify(baseModelConfig)),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [resetChatSwitch, setResetChatSwitch] = useState(false);
  const [growOrShrinkConfig, setGrowOrShrinkConfig] = useState<{
    [key: string]: boolean;
    prompt: boolean;
    tools: boolean;
    knowledges: boolean;
    chatStrong: boolean;
    flows: boolean;
  }>({
    prompt: true,
    tools: true,
    knowledges: true,
    chatStrong: true,
    flows: true,
  });
  const [publishModalShow, setPublishModalShow] = useState(false);
  const [vcnList, setVcnList] = useState<VcnItem[]>([]);
  const [form] = Form.useForm();
  const [model, setModel] = useState('星火大模型 Spark X1');
  const [modelOptions, setModelOptions] = useState<ModelListData[]>([]);
  const [pendingModelData, setPendingModelData] = useState<{
    modelId?: string;
    modelDomain?: string;
  } | null>(null);

  // 获取模型列表
  const getModelListData = (): void => {
    getModelList().then((res: ModelListData[]) => {
      setModelOptions(res || []);
    });
  };

  // 处理模型回显的函数
  const handleModelDisplay = (modelId?: string, modelDomain?: string): void => {
    if (modelOptions.length === 0) {
      // 如果 modelOptions 还没有加载，保存待处理的数据
      setPendingModelData({ modelId, modelDomain });
      return;
    }

    const matchedModel = findModelOption(modelId, modelDomain);
    if (matchedModel) {
      // 找到匹配的模型，需要找到其在 modelOptions 中的索引
      const modelIndex = modelOptions.findIndex(
        option => option === matchedModel
      );
      setModel(getModelUniqueKey(matchedModel, modelIndex));
    } else {
      // 如果找不到匹配的模型，使用原来的逻辑
      setModel(modelDomain || 'spark');
    }
  };

  const handleModelChange = (value: string): void => {
    setModel(value);
  };

  // 生成模型的唯一标识符
  const getModelUniqueKey = (option: ModelListData, index?: number): string => {
    if (option.isCustom && option.modelId) {
      // 自定义模型使用 modelId 作为唯一标识
      return option.modelId;
    }
    // 默认模型使用 modelDomain + index 作为唯一标识，确保唯一性
    return `${option.modelDomain}_${index ?? 0}`;
  };

  // 根据 modelId 或 modelDomain 查找对应的模型选项
  const findModelOption = (
    modelId?: string,
    modelDomain?: string
  ): ModelListData | undefined => {
    if (modelId) {
      const modelUse = modelOptions.find(option => option.modelId === modelId);
      return modelUse;
    }
    if (modelDomain) {
      return modelOptions.find(
        option => option.modelDomain === modelDomain && !option.isCustom
      );
    }
    return undefined;
  };

  // 根据唯一标识符查找对应的模型选项
  const findModelOptionByUniqueKey = (
    uniqueKey: string
  ): ModelListData | undefined => {
    return modelOptions.find(
      (option, index) => getModelUniqueKey(option, index) === uniqueKey
    );
  };

  // 获取模型配置信息（model, modelId, isCustom）
  const getModelConfig = (modelKey: string) => {
    const selectedModel = findModelOptionByUniqueKey(modelKey);
    return {
      model: selectedModel?.modelDomain ?? modelKey,
      modelId: selectedModel?.isCustom ? selectedModel.modelId : null,
      isCustom: selectedModel?.isCustom ?? false,
    };
  };

  const handleModelChangeNew = (e: string, index: number): void => {
    const updatedModelList = [...modelList];
    updatedModelList[index] = { ...updatedModelList[index], model: e };
    setModelList(updatedModelList);
  };

  // 提取处理接口调用的函数 -- NOTE: 修改 handleApiCall 函数以包含 handleApiNew 的功能
  const handleApiCall = async (
    obj: any,
    api: (params: any) => Promise<any>,
    successMessage: string,
    shouldNavigateToAgent = false
  ): Promise<void> => {
    try {
      await api(obj);
      message.success(successMessage);

      // 添加 handleApiNew 中的导航逻辑
      if (shouldNavigateToAgent) {
        if (
          detailInfo.botStatus !== 1 &&
          detailInfo.botStatus !== 2 &&
          detailInfo.botStatus !== 4
        ) {
          const currentLang = getLanguageCode();
          currentLang === 'zh';
        }
        navigate('/space/agent');
      } else {
        // 保留原有的导航逻辑
        navigate(`/space/config/overview?botId=${searchParams.get('botId')}`, {
          replace: true,
        });
        if (detailInfo.botStatus == 2) {
          obj.botName = obj.name;
          return setConfigPageData(obj);
        }
      }
    } catch (err: any) {
      message.error(err.msg);
    }
  };

  // MARK:
  const buildRequestObject = (
    isRag: boolean,
    useFormValues: boolean,
    isForPublish: boolean = false
  ): any => {
    const datasetKey = isRag ? 'datasetList' : 'maasDatasetList';
    const dataList: string[] = [];
    (selectSource || []).forEach((item: any) => {
      dataList.push(item.id);
    });

    const name = useFormValues
      ? form.getFieldsValue().botName
      : baseinfo.botName;
    const botType = useFormValues
      ? form.getFieldsValue().botType
      : baseinfo.botType;
    const botDesc = useFormValues
      ? form.getFieldsValue().botDesc
      : baseinfo.botDesc;

    return {
      ...(backgroundImgApp && {
        appBackground:
          typeof backgroundImgApp === 'string'
            ? backgroundImgApp.replace(/\?.*$/, '')
            : backgroundImgApp,
      }),
      ...(backgroundImg && {
        pcBackground:
          typeof backgroundImg === 'string'
            ? backgroundImg.replace(/\?.*$/, '')
            : backgroundImg,
      }),
      botId: searchParams.get('botId'),
      name: name,
      botType: botType,
      botDesc: botDesc,
      supportContext: supportContextFlag ? 1 : 0,
      supportSystem: supportSystemFlag ? 1 : 0,
      promptType: 0,
      inputExample: inputExample,
      [datasetKey]: dataList,
      avatar: coverUrl,
      vcnCn: botCreateActiveV?.cn || vcnList[0]?.voiceType,
      isSentence: 0,
      openedTool: Object.keys(choosedAlltool)
        .filter((key: any) => choosedAlltool[key])
        .join(','),
      prologue: prologue,
      ...getModelConfig(model),
      prompt: prompt,
      // 人设相关字段
      enablePersonality: personalityData.enablePersonality,
      personalityConfig: personalityData.personalityConfig,
      ...(!useFormValues && { promptStructList: [] }),
    };
  };

  // 验证人设信息
  const validatePersonality = () => {
    if (personalityData.enablePersonality) {
      // 验证人设信息必填
      if (!personalityData.personalityConfig?.personality?.trim()) {
        message.info(t('configBase.CapabilityDevelopment.personalityRequired'));
        return false;
      }
      // 验证场景描述（如果选择了场景类型）
      if (
        personalityData.personalityConfig?.sceneType &&
        !personalityData.personalityConfig?.sceneInfo?.trim()
      ) {
        message.info(t('configBase.CapabilityDevelopment.sceneInfoRequired'));
        return false;
      }
    }
    return true;
  };

  const savebot = (e: any) => {
    if (!coverUrl) {
      return message.warning(t('configBase.defaultAvatar'));
    }
    if (
      baseinfo?.botName === '' ||
      baseinfo?.botType === '' ||
      baseinfo?.botDesc === ''
    ) {
      return message.warning(t('configBase.requiredInfoNotFilled'));
    }

    const isRag = selectSource[0]?.tag === 'SparkDesk-RAG';
    const useFormValues = !(
      detailInfo.botStatus === 1 ||
      detailInfo.botStatus === 2 ||
      detailInfo.botStatus === 4
    );

    const obj = buildRequestObject(isRag, useFormValues);
    const api = updateBot;
    const successMessage =
      detailInfo.botStatus === 1 ||
      detailInfo.botStatus === 2 ||
      detailInfo.botStatus === 4
        ? '更新发布成功'
        : '保存成功';

    handleApiCall(obj, api, successMessage, false); // 第四个参数为 false 表示使用原有的导航逻辑
    return;
  };

  // 发布
  const releaseFn = (e: any) => {
    if (!coverUrl) {
      return message.warning(t('configBase.defaultAvatar'));
    }
    if (!baseinfo?.botName || !baseinfo?.botType || !baseinfo?.botDesc) {
      return message.warning(t('configBase.requiredInfoNotFilled'));
    }
    closeModal();
    setPublishModalShow(true);
    const botId = searchParams.get('botId');

    if (botId) {
      if (
        detailInfo.botStatus === 1 ||
        detailInfo.botStatus === 2 ||
        detailInfo.botStatus === 4
      ) {
        const isRag = selectSource[0]?.tag === 'SparkDesk-RAG';
        const obj = buildRequestObject(isRag, false, true); // 第三个参数表示用于发布
        handleApiCall(
          obj,
          updateBot,
          t('configBase.updatePublishSuccess'),
          true
        ); // 第四个参数为 true 表示导航到 /space/agent
      } else {
        const isRag = selectSource[0]?.tag === 'SparkDesk-RAG';
        const obj = buildRequestObject(isRag, true, true);
        updateBot(obj)
          .then(() => {
            handleAgentStatus(Number(botId), {
              action: 'PUBLISH',
              publishType: 'MARKET',
              publishData: {},
            })
              .then(() => {
                message.success(t('configBase.publishSuccess'));
                navigate('/space/agent');
              })
              .catch(err => {
                message.error(err?.msg);
              });
          })
          .catch(err => {
            message.error(err?.msg);
          });
      }

      return;
    } else {
      const isRag = selectSource[0]?.tag === 'SparkDesk-RAG';
      const obj = buildRequestObject(isRag, false, true);
      insertBot(obj)
        .then((res: any) => {
          handleAgentStatus(Number(res.botId), {
            action: 'PUBLISH',
            publishType: 'MARKET',
            publishData: {},
          })
            .then(() => {
              message.success(t('configBase.publishSuccess'));
              navigate('/space/agent');
            })
            .catch(err => {
              //
            });
        })
        .catch(err => {
          message.error(err.msg);
        });

      return;
    }
  };

  useEffect(() => {
    eventBus.on('releaseFn', releaseFn);
    return () => {
      eventBus.off('releaseFn', releaseFn);
    };
  }, [coverUrl, baseinfo, selectSource, form.getFieldsValue()]);

  useEffect(() => {
    setShowTipPk(false);
    setShowModelPk(0);
    getModelListData();
    getVcnList().then((res: VcnItem[]) => {
      setVcnList(res);
    });
  }, []);

  // 监听 modelOptions 加载完成，处理待回显的模型数据
  useEffect(() => {
    if (modelOptions.length > 0) {
      if (pendingModelData) {
        // 更新模式：处理待回显的模型数据
        const { modelId, modelDomain } = pendingModelData;
        handleModelDisplay(modelId, modelDomain);
        setPendingModelData(null); // 清除待处理数据
      } else if (model === '星火大模型 Spark X1' || !model) {
        // 创建模式：如果 model 还是初始值或为空，设置为第一个模型的 uniqueKey
        const firstModel = modelOptions[0];
        if (firstModel) {
          setModel(getModelUniqueKey(firstModel, 0));
        }
      }

      // 更新 modelList 中的 model 字段
      const firstModel = modelOptions[0];
      if (firstModel) {
        setModelList((prevList: any[]) =>
          prevList.map((item, index) => {
            // 如果已经有 model 字段且不是初始默认值，就不更新
            if (item.model && item.model !== '') {
              return item;
            }
            // 否则，设置为第一个 modelOption 的 uniqueKey
            return {
              ...item,
              model: getModelUniqueKey(firstModel, 0),
              modelName: firstModel.modelName,
              modelIcon: firstModel.modelIcon,
              modelDomain: firstModel.modelDomain,
              modelId: firstModel.modelId,
            };
          })
        );
      }
    }
  }, [modelOptions, pendingModelData]);

  useEffect(() => {
    const obj: any = {};
    obj.botDesc = botTemplateInfoValue.botDesc;
    obj.botName = botTemplateInfoValue.botName;
    obj.botType = botTemplateInfoValue.botType;
    setBaseinfo(obj);
    const create = searchParams.get('create');
    if (create) {
      setCreateBotton(true);
      setBackgroundImg('');
      setBackgroundImgApp('');
    }
    getBotType().then((resp: any) => {
      const arr = [...resp].map(item => {
        return { value: item.typeKey, label: item.typeName };
      });
      const filteredBottypeList = arr.filter(item => item.value !== 25);
      setBottypeList(filteredBottypeList);
      const save = searchParams.get('save');
      const botId = searchParams.get('botId');

      if (botId) {
        sessionStorage.removeItem('botTemplateInfoValue');

        getBotInfo({ botId: botId }).then((res: any) => {
          setBackgroundImgApp(res.appBackground);
          setBackgroundImg(res.pcBackground);
          setBotInfo(res);
          setBotCreateActiveV({
            cn: save == 'true' ? configPageData?.vcnCn : res.vcnCn,
          });
          const obj: any = {};
          if (
            save == 'true'
              ? typeof configPageData?.openedTool === 'string' &&
                configPageData.openedTool.indexOf('ifly_search') !== -1
              : typeof res.openedTool === 'string' &&
                res.openedTool.indexOf('ifly_search') !== -1
          ) {
            obj.ifly_search = true;
          } else {
            obj.ifly_search = false;
          }
          if (
            save == 'true'
              ? typeof configPageData?.openedTool === 'string' &&
                configPageData.openedTool.indexOf('text_to_image') !== -1
              : typeof res.openedTool === 'string' &&
                res.openedTool.indexOf('text_to_image') !== -1
          ) {
            obj.text_to_image = true;
          } else {
            obj.text_to_image = false;
          }
          if (
            save == 'true'
              ? typeof configPageData?.openedTool === 'string' &&
                configPageData.openedTool.indexOf('codeinterpreter') !== -1
              : typeof res.openedTool === 'string' &&
                res.openedTool.indexOf('codeinterpreter') !== -1
          ) {
            obj.codeinterpreter = true;
          } else {
            obj.codeinterpreter = false;
          }
          setSupportContextFlag(
            save == 'true'
              ? configPageData?.supportContext == 1
              : res.supportContext == 1
          );
          setSupportSystemFlag(
            save == 'true'
              ? configPageData?.supportSystem == 1
              : res.supportSystem == 1
          );
          setInputExample(
            save == 'true'
              ? Array.isArray(configPageData?.inputExampleList)
                ? configPageData?.inputExampleList
                : configPageData?.inputExample
              : Array.isArray(res.inputExampleList)
                ? res.inputExampleList
                : res.inputExample
          );
          setPrologue(save == 'true' ? configPageData?.prologue : res.prologue);
          setChoosedAlltool(obj);
          setBaseinfo(save == 'true' ? configPageData : res);
          form.setFieldsValue(save == 'true' ? configPageData : res);
          setDetailInfo(save == 'true' ? { ...res, ...configPageData } : res);
          setCoverUrl(save == 'true' ? configPageData?.avatar : res.avatar);

          // 回显人设数据
          setPersonalityData({
            enablePersonality:
              save == 'true'
                ? (configPageData?.enablePersonality as boolean) || false
                : res?.personalityConfig !== null || false,
            personalityConfig:
              save == 'true'
                ? configPageData?.personalityConfig || null
                : res.personalityConfig || null,
          });

          // 处理模型回显逻辑
          const currentModelData = save == 'true' ? configPageData : res;
          const modelId = currentModelData?.modelId;
          const modelDomain = currentModelData?.model;

          // 使用新的处理函数
          handleModelDisplay(modelId, modelDomain);
          const filteredPrompt =
            save == 'true'
              ? typeof configPageData?.prompt === 'string'
                ? configPageData.prompt.replace(
                    /接下来我的输入是：\{\{\}\}$/,
                    ''
                  )
                : ''
              : typeof res.prompt === 'string'
                ? res.prompt.replace(/接下来我的输入是：\{\{\}\}$/, '')
                : '';
          setPrompt(filteredPrompt);
          promptList[0].prompt = filteredPrompt;
          setPromptList(promptList);
          listRepos().then((respo: any) => {
            const arr: any = [];
            if (
              save == 'true'
                ? Array.isArray(configPageData?.datasetList) &&
                  configPageData.datasetList.length > 0
                : Array.isArray(res.datasetList) && res.datasetList.length > 0
            ) {
              const newArr: DatasetItem[] =
                save == 'true' ? configPageData?.datasetList : res.datasetList;
              const pageData: PageDataItem[] = respo?.pageData;

              newArr.forEach((item: DatasetItem) => {
                pageData.forEach((itemt: PageDataItem) => {
                  if ((save == 'true' ? item : item.id) == itemt.id) {
                    arr.push(itemt);
                  }
                });
              });
            }
            if (
              save == 'true'
                ? Array.isArray(configPageData?.maasDatasetList) &&
                  configPageData.maasDatasetList.length > 0
                : Array.isArray(res.maasDatasetList) &&
                  res.maasDatasetList.length > 0
            ) {
              const maasDatasetList: MaasDatasetItem[] =
                save == 'true'
                  ? configPageData?.maasDatasetList
                  : res.maasDatasetList;

              maasDatasetList.forEach((item: MaasDatasetItem) => {
                (respo?.pageData as PageDataItem[]).forEach(
                  (itemt: PageDataItem) => {
                    if ((save == 'true' ? item : item.id) == itemt.id) {
                      arr.push(itemt);
                    }
                  }
                );
              });
            }
            setSelectSource(arr);
          });
        });
      }
    });
    const quickCreate = searchParams.get('quickCreate');
    if (quickCreate) {
      form.setFieldsValue(botTemplateInfoValue);
      setCoverUrl(botTemplateInfoValue.avatar);
      let prompt = '';
      botTemplateInfoValue.promptStructList?.forEach(
        (item: { promptKey: string; promptValue: string }, index: number) => {
          prompt = prompt + item.promptKey + `\n` + item.promptValue + '\n';
        }
      );
      setPrompt(prompt);
      setInputExample(
        Array.isArray(botTemplateInfoValue.inputExampleList)
          ? botTemplateInfoValue.inputExampleList
          : botTemplateInfoValue.inputExample
      );
    }
    const sentence = searchParams.get('sentence');
    if (sentence) {
      setSentence(1);
    }
  }, [searchParams, configPageData?.openedTool]);

  useEffect(() => {
    setInputExampleTip('');
    setInputExampleModel('');
  }, []);

  useEffect(() => {
    const params = {
      pageNo: 1,
      pageSize: 999,
    };

    configListRepos(params).then((data: any) => {
      setKnowledges(data.pageData);
    });
  }, []);

  usePrompt(isChanged, t('configBase.confirmLeavePrompt'));

  useEffect(() => {
    setCurrentTab('base');
  }, [currentRobot.id]);

  const aiGen = () => {
    if (!prompt) {
      return message.warning(t('configBase.settingCannotBeEmpty'));
    }
    setLoadingPrompt(true);
    quickCreateBot(prompt).then((res: any) => {
      let promptStr = '';
      res.promptStructList?.forEach(
        (item: { promptKey: string; promptValue: string }, index: number) => {
          promptStr =
            promptStr + item.promptKey + `\n` + item.promptValue + '\n';
        }
      );
      setPrompt(promptStr);
      setLoadingPrompt(false);
    });

    return;
  };

  useEffect(() => {
    changeConfig();
    if (!isMounted.current) {
      return;
    }
    setResetChatSwitch(!resetChatSwitch);
    setIsChanged(true);
  }, [
    promptData,
    tree,
    suggest,
    resource,
    conversationStarter,
    conversation,
    presetQuestion,
    feedback,
    repoConfig,
    tools,
    flows,
  ]);

  function changeConfig() {
    const params = {
      prePrompt: promptData,
      userInputForm: [],
      suggestedQuestionsAfterAnswer: {
        enabled: suggest,
      },
      retrieverResource: {
        enabled: resource,
      },
      conversationStarter: {
        enabled: conversation,
        openingRemark: conversationStarter,
        presetQuestion: presetQuestion.filter(item => item),
      },
      feedback: {
        enabled: feedback,
      },
      models: {},
      repoConfigs: {
        topK: repoConfig.topK,
        scoreThreshold: repoConfig.scoreThreshold,
        scoreThresholdEnabled: true,
        reposet: tree,
      },
      tools: tools.map((item: any) => ({
        toolId: item.toolId,
        name: item.name,
        description: item.description,
      })),
      flows,
    };
    setConfig(params);
  }

  function getLeafNodes(tree: TreeNode): TreeNode[] {
    const leafNodes: TreeNode[] = [];

    function findLeaves(node: TreeNode): void {
      if (!node.files || node.files.length === 0) {
        // @ts-ignore
        leafNodes.push(node);
      } else {
        for (const child of node.files) {
          findLeaves(child);
        }
      }
    }

    findLeaves(tree);
    return leafNodes;
  }

  useEffect(() => {
    if (tree.length && knowledges.length > 0) {
      const newTree = {
        files: tree,
      };
      let leaves: any = getLeafNodes(newTree);

      leaves = (leaves as KnowledgeLeaf[]).map((item: KnowledgeLeaf) => {
        const currentLeaves: Knowledge | undefined = (
          knowledges as Knowledge[]
        ).find((i: Knowledge) => i.id === item.id);
        item.charCount = currentLeaves?.charCount;
        item.knowledgeCount = currentLeaves?.knowledgeCount;
        return { ...item };
      });
      setFiles(leaves);
    } else {
      setFiles([]);
    }
  }, [tree, knowledges]);

  useEffect(() => {
    return () => setIsChanged(false);
  }, []);

  const multiModelDebugging = useMemo(() => {
    return chatModelList.length >= 2;
  }, [chatModelList]);

  useEffect(() => {
    let flag = true;
    if (multiModelDebugging) {
      flag = false;
    }
    for (const key in growOrShrinkConfig) {
      growOrShrinkConfig[key] = flag;
    }
    setGrowOrShrinkConfig(JSON.parse(JSON.stringify(growOrShrinkConfig)));
  }, [multiModelDebugging]);

  useEffect(() => {
    document.body.addEventListener('click', clickOutside);
    return () => document.body.removeEventListener('click', clickOutside);
  }, []);

  function clickOutside(event: MouseEvent) {
    setPublishModalShow(false);
  }

  function closeModal() {
    setVisible(false);
    setChatModelList(chatModelList =>
      chatModelList.map(item => ({
        ...item,
        visible: false,
        optionsVisible: false,
      }))
    );
  }

  useEffect(() => {
    if (isSending) {
      setIsSending(
        chatModelList
          ?.filter(
            item =>
              item.modelInfo?.plan?.value && item.modelInfo?.summary?.value
          )
          ?.some(item => item.isSending)
      );
    }
  }, [chatModelList]);

  // 提示词、模型对比涉及状态 start
  const [showTipPk, setShowTipPk] = useState(false);
  const [showModelPk, setShowModelPk] = useState(0);

  // 提示词、模型对比涉及状态 over

  /** 处理InputBox发送消息 */
  const handleInputBoxSend = useCallback(
    (text: string) => {
      // 根据当前模式触发相应的PromptTry实例

      if (showTipPk) {
        tipPromptTryRefs.current.forEach(ref => {
          if (ref) {
            ref.send(text);
          }
        });
      } else if (showModelPk > 0) {
        modelPromptTryRefs.current.forEach(ref => {
          if (ref) {
            ref.send(text);
          }
        });
      } else {
        // 默认模式：触发单个PromptTry实例
        // console.log('Triggering default mode');
        if (defaultPromptTryRef.current) {
          defaultPromptTryRef.current.send(text);
        }
      }

      // 清空相关状态
      setInputExampleTip('');
      setInputExampleModel('');
    },
    [showTipPk, showModelPk]
  );

  useEffect(() => {
    eventBus.on('eventSavebot', savebot);

    // 监听PromptTry实例的loading状态变化
    const handleLoadingChange = (data: {
      instanceId: string;
      loading: boolean;
    }) => {
      const { instanceId, loading } = data;
      if (loading) {
        loadingInstances.current.add(instanceId);
      } else {
        loadingInstances.current.delete(instanceId);
      }
      setGlobalLoading(loadingInstances.current.size > 0);
    };

    eventBus.on('promptTry.inputExample', handleInputBoxSend);
    eventBus.on('promptTry.loadingChange', handleLoadingChange);

    return () => {
      eventBus.off('eventSavebot', savebot);
      eventBus.off('promptTry.inputExample', handleInputBoxSend);
      eventBus.off('promptTry.loadingChange', handleLoadingChange);
    };
  }, [
    handleInputBoxSend, // 添加 handleInputBoxSend 作为依赖项
    coverUrl,
    baseinfo,
    searchParams,
    detailInfo,
    supportContextFlag,
    supportSystemFlag,
    inputExample,
    selectSource,
    botCreateActiveV,
    prologue,
    model,
    prompt,
    sentence,
    choosedAlltool,
  ]);

  /** 提示词对比 */
  const handleShowTipPk = (type: string) => {
    setShowModelPk(0); // 提示词对比时隐藏模型对比
    if (type === 'show') {
      return setShowTipPk(true);
    } else {
      // TODO: 回显选中的提示词
      return setShowTipPk(false);
    }
  };

  const debouncedAddModelPk = debounce((showModelPk, setShowModelPk) => {
    if (showModelPk >= 4) {
      message.info(t('configBase.modelComparisonDesc'));
      return;
    }
    setShowModelPk(showModelPk + 1);
  }, 300);

  /** 添加模型 */
  const addModelPk = () => {
    if (modelList.length >= 4) {
      message.info(t('configBase.modelComparisonDesc'));
      return;
    }
    debouncedAddModelPk(showModelPk, setShowModelPk);
    const firstModel = modelOptions[0];
    setModelList([
      ...modelList,
      {
        modelId: firstModel?.modelId || 'null',
        modelName: firstModel?.modelName || '星火大模型 Spark X1',
        modelDomain: firstModel?.modelDomain || 'x1',
        model: firstModel ? getModelUniqueKey(firstModel, 0) : 'x1_0',
        modelIcon:
          firstModel?.modelIcon ||
          'https://openres.xfyun.cn/xfyundoc/2025-09-24/e9b74fbb-c2d6-4f4a-8c07-0ea7f03ee03a/1758681839941/icon.png',
        promptAnswerCompleted: true,
      },
    ]);
  };

  /** 处理InputBox清除消息 */
  const handleInputBoxClear = () => {
    // 直接调用PromptTry实例的clear方法
    if (showTipPk) {
      tipPromptTryRefs.current.forEach(ref => {
        if (ref) {
          ref.clear();
        }
      });
    } else if (showModelPk > 0) {
      modelPromptTryRefs.current.forEach(ref => {
        if (ref) {
          ref.clear();
        }
      });
    } else {
      if (defaultPromptTryRef.current) {
        defaultPromptTryRef.current.clear();
      }
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col relative overflow-hidden">
      <ConfigHeader
        coverUrl={coverUrl}
        baseinfo={baseinfo}
        botId={searchParams.get('botId') ?? undefined}
        detailInfo={detailInfo}
        currentRobot={currentRobot}
        currentTab={currentTab}
      >
        <div className="flex items-center">
          {!createBotton &&
            !showTipPk &&
            detailInfo.botStatus !== 1 &&
            detailInfo.botStatus !== 2 &&
            detailInfo.botStatus !== 4 && (
              <Button
                type="primary"
                loading={loading}
                className="primary-btn px-6 h-10"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={e => {
                  if (!coverUrl) {
                    return message.warning(t('configBase.defaultAvatar'));
                  }
                  if (
                    baseinfo?.botName == '' ||
                    baseinfo?.botType == '' ||
                    baseinfo?.botDesc == ''
                  ) {
                    return message.warning(
                      t('configBase.requiredInfoNotFilled')
                    );
                  }

                  if (selectSource[0]?.tag == 'SparkDesk-RAG') {
                    const datasetList: string[] = [];
                    (selectSource || []).forEach((item: any) => {
                      datasetList.push(item.id);
                    });
                    e.stopPropagation();
                    const obj = {
                      ...(backgroundImgApp && {
                        appBackground:
                          typeof backgroundImgApp === 'string'
                            ? backgroundImgApp.replace(/\?.*$/, '')
                            : backgroundImgApp,
                      }),
                      ...(backgroundImg && {
                        pcBackground:
                          typeof backgroundImg === 'string'
                            ? backgroundImg.replace(/\?.*$/, '')
                            : backgroundImg,
                      }),
                      supportContext: supportContextFlag ? 1 : 0,
                      supportSystem: supportSystemFlag ? 1 : 0,
                      name: form.getFieldsValue().botName,
                      botType: form.getFieldsValue().botType,
                      botDesc: form.getFieldsValue().botDesc,
                      botId: searchParams.get('botId'),
                      promptType: 0,
                      inputExample: inputExample,
                      promptStructList: [],
                      datasetList: datasetList,
                      avatar: coverUrl,
                      vcnCn: botCreateActiveV?.cn || vcnList[0]?.voiceType,
                      isSentence: 0,
                      openedTool: Object.keys(choosedAlltool)
                        .filter((key: any) => choosedAlltool[key])
                        .join(','),
                      prologue: prologue,
                      ...getModelConfig(model),
                      prompt: prompt,
                      // 人设相关字段
                      enablePersonality: personalityData.enablePersonality,
                      personalityConfig: personalityData.personalityConfig,
                    };
                    updateBot(obj)
                      .then(() => {
                        message.success(t('configBase.saveSuccess'));
                        navigate('/space/agent');
                      })
                      .catch(err => {
                        message.error(err?.msg);
                      });
                  } else {
                    const maasDatasetList: string[] = [];
                    (selectSource || []).forEach((item: any) => {
                      maasDatasetList.push(item.id);
                    });
                    e.stopPropagation();
                    const obj = {
                      ...(backgroundImgApp && {
                        appBackground:
                          typeof backgroundImgApp === 'string'
                            ? backgroundImgApp.replace(/\?.*$/, '')
                            : backgroundImgApp,
                      }),
                      ...(backgroundImg && {
                        pcBackground:
                          typeof backgroundImg === 'string'
                            ? backgroundImg.replace(/\?.*$/, '')
                            : backgroundImg,
                      }),
                      supportContext: supportContextFlag ? 1 : 0,
                      supportSystem: supportSystemFlag ? 1 : 0,
                      name: form.getFieldsValue().botName,
                      botType: form.getFieldsValue().botType,
                      botDesc: form.getFieldsValue().botDesc,
                      botId: searchParams.get('botId'),
                      promptType: 0,
                      inputExample: inputExample,
                      promptStructList: [],
                      maasDatasetList: maasDatasetList,
                      avatar: coverUrl,
                      vcnCn: botCreateActiveV?.cn || vcnList[0]?.voiceType,
                      isSentence: 0,
                      openedTool: Object.keys(choosedAlltool)
                        .filter((key: any) => choosedAlltool[key])
                        .join(','),
                      prologue: prologue,
                      ...getModelConfig(model),
                      prompt: prompt,
                      // 人设相关字段
                      enablePersonality: personalityData.enablePersonality,
                      personalityConfig: personalityData.personalityConfig,
                    };
                    updateBot(obj)
                      .then(() => {
                        message.success(t('configBase.saveSuccess'));
                        navigate('/space/agent');
                      })
                      .catch(err => {
                        message.error(err.msg);
                      });
                  }
                }}
              >
                <span>{t('configBase.save')}</span>
              </Button>
            )}

          {createBotton && (
            <Button
              type="primary"
              loading={loading}
              className="primary-btn px-6 h-10"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={e => {
                if (!coverUrl) {
                  return message.warning(t('configBase.defaultAvatar'));
                }
                if (
                  !baseinfo?.botName ||
                  !baseinfo?.botType ||
                  !baseinfo?.botDesc
                ) {
                  return message.warning(t('configBase.requiredInfoNotFilled'));
                }
                if (selectSource[0]?.tag == 'SparkDesk-RAG') {
                  const datasetList: string[] = [];
                  (selectSource || []).forEach((item: any) => {
                    datasetList.push(item.id);
                  });
                  e.stopPropagation();
                  const obj = {
                    ...(backgroundImgApp && {
                      appBackground:
                        typeof backgroundImgApp === 'string'
                          ? backgroundImgApp.replace(/\?.*$/, '')
                          : backgroundImgApp,
                    }),
                    ...(backgroundImg && {
                      pcBackground:
                        typeof backgroundImg === 'string'
                          ? backgroundImg.replace(/\?.*$/, '')
                          : backgroundImg,
                    }),
                    name: baseinfo.botName,
                    botType: baseinfo.botType,
                    botDesc: baseinfo.botDesc,
                    supportContext: supportContextFlag ? 1 : 0,
                    supportSystem: supportSystemFlag ? 1 : 0,
                    promptType: 0,
                    inputExample: inputExample,
                    promptStructList: [],
                    datasetList: datasetList,
                    avatar: coverUrl,
                    vcnCn: botCreateActiveV?.cn || vcnList[0]?.voiceType,
                    isSentence: sentence,
                    openedTool: Object.keys(choosedAlltool)
                      .filter((key: any) => choosedAlltool[key])
                      .join(','),
                    prologue: prologue,
                    ...getModelConfig(model),
                    prompt: prompt,
                    // 人设相关字段
                    enablePersonality: personalityData.enablePersonality,
                    personalityConfig: personalityData.personalityConfig,
                  };

                  insertBot(obj)
                    .then(() => {
                      navigate('/space/agent');
                    })
                    .catch(err => {
                      //
                    });
                } else {
                  const maasDatasetList: string[] = [];
                  (selectSource || []).forEach((item: any) => {
                    maasDatasetList.push(item.id);
                  });
                  e.stopPropagation();
                  const obj = {
                    ...(backgroundImgApp && {
                      appBackground:
                        typeof backgroundImgApp === 'string'
                          ? backgroundImgApp.replace(/\?.*$/, '')
                          : backgroundImgApp,
                    }),
                    ...(backgroundImg && {
                      pcBackground:
                        typeof backgroundImg === 'string'
                          ? backgroundImg.replace(/\?.*$/, '')
                          : backgroundImg,
                    }),
                    name: baseinfo.botName,
                    botType: baseinfo.botType,
                    botDesc: baseinfo.botDesc,
                    supportContext: supportContextFlag ? 1 : 0,
                    supportSystem: supportSystemFlag ? 1 : 0,
                    promptType: 0,
                    inputExample: inputExample,
                    promptStructList: [],
                    maasDatasetList: maasDatasetList,
                    avatar: coverUrl,
                    vcnCn: botCreateActiveV?.cn || vcnList[0]?.voiceType,
                    isSentence: sentence,
                    openedTool: Object.keys(choosedAlltool)
                      .filter((key: any) => choosedAlltool[key])
                      .join(','),
                    prologue: prologue,
                    ...getModelConfig(model),
                    prompt: prompt,
                    // 人设相关字段
                    enablePersonality: personalityData.enablePersonality,
                    personalityConfig: personalityData.personalityConfig,
                  };

                  insertBot(obj)
                    .then(() => {
                      navigate('/space/agent');
                    })
                    .catch(err => {
                      //
                    });
                }
              }}
            >
              <span>{t('configBase.create')}</span>
            </Button>
          )}

          <div className="ml-3 relative">
            {showTipPk ? (
              <Button
                type="primary"
                loading={loading}
                className="primary-btn px-6 h-10"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={e => {
                  if (questionTipActive == -1) {
                    return message.warning(t('configBase.notSelectPrompt'));
                  }
                  e.stopPropagation();
                  setPrompt(promptList[questionTipActive].prompt);
                  setShowTipPk(false);
                  setInputExampleTip('');
                  setInputExampleModel('');
                }}
              >
                <span>{t('configBase.completeComparison')}</span>
              </Button>
            ) : (
              <Button
                type="primary"
                loading={loading}
                className="primary-btn px-6 h-10"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => {
                  if (!searchParams.get('botId')) {
                    return message.warning(t('先创建助手'));
                  }
                  setOpenWxmol(true);
                }}
              >
                <span>{t('configBase.publish')}</span>
              </Button>
            )}
          </div>
        </div>
        <WxModal
          promptbot={true}
          setPageInfo={() => {}}
          disjump={true}
          setIsOpenapi={() => {}}
          fabuFlag={fabuFlag}
          show={openWxmol}
          onCancel={() => {
            setOpenWxmol(false);
          }}
        />
      </ConfigHeader>

      <div className="flex flex-1 w-full gap-2 py-6 overflow-hidden">
        {/* 左侧区域 */}
        <div
          className={`${
            styles.leftBox
          } h-full bg-[#fff] border border-[#E2E8FF] p-6 ${
            !showTipPk ? 'flex-1 pr-0' : 'w-1/3'
          } ${showModelPk !== 0 && 'flex-none w-1/3'} z-10 overflow-auto`}
          style={{
            borderRadius: 18,
            display: multiModelDebugging ? 'block' : '',
          }}
        >
          {!showTipPk ? (
            <>
              <Form
                form={form}
                name="botEdit"
                onValuesChange={val => {
                  setBaseinfo({ ...baseinfo, ...val });
                }}
              >
                {
                  <div className="step_one">
                    <div className={styles.baseInfoBox}>
                      <Row>
                        <Col span={5}>
                          <Form.Item
                            label=""
                            name="cover"
                            required
                            colon={false}
                          >
                            <UploadCover
                              name={form.getFieldsValue().botName}
                              botDesc={form.getFieldsValue().botDesc}
                              setCoverUrl={setCoverUrl}
                              coverUrl={coverUrl}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={18}>
                          <div className={styles.baseInfoText}>
                            <div className={styles.nameAndType}>
                              {
                                <div className={styles.name}>
                                  <Form.Item
                                    label={t('configBase.agentName')}
                                    name="botName"
                                    rules={[{ required: true, message: '' }]}
                                    colon={false}
                                  >
                                    <Input
                                      disabled={
                                        detailInfo.botStatus == 1 ||
                                        detailInfo.botStatus == 2 ||
                                        detailInfo.botStatus == 4
                                      }
                                      className={styles.inputField}
                                      maxLength={20}
                                    />
                                  </Form.Item>
                                </div>
                              }
                              <div className={styles.type}>
                                <Form.Item
                                  name="botType"
                                  rules={[{ required: true, message: '' }]}
                                  colon={false}
                                  label={t('configBase.agentCategory')}
                                >
                                  <Select
                                    disabled={
                                      detailInfo.botStatus == 1 ||
                                      detailInfo.botStatus == 2 ||
                                      detailInfo.botStatus == 4
                                    }
                                    options={bottypeList}
                                  />
                                </Form.Item>
                              </div>
                            </div>
                            <Form.Item
                              label={t('configBase.agentIntroduction')}
                              name="botDesc"
                              rules={[{ required: true, message: '' }]}
                              colon={false}
                            >
                              <Input.TextArea
                                className="xingchen-textarea"
                                maxLength={100}
                                showCount
                                autoSize={{ minRows: 3, maxRows: 3 }}
                              />
                            </Form.Item>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                }
              </Form>
              <div className={styles.tipBox}>
                <Tabs
                  defaultActiveKey="1"
                  className={styles.tipBoxTab}
                  items={[
                    {
                      key: '1',
                      label: t('configBase.commonConfig'),
                      children: (
                        <>
                          <div className={styles.tipTitle}>
                            <div className={styles.tipLabel}>
                              {t('configBase.promptEdit')}
                            </div>
                            <div className={styles.tipBotton}>
                              <div
                                className={styles.leftBotton}
                                onClick={() => handleShowTipPk('show')}
                              >
                                <img
                                  className={styles.leftImg}
                                  src={promptIcon}
                                  alt=""
                                />
                                <div>{t('configBase.promptComparison')}</div>
                              </div>
                            </div>
                          </div>
                          <div className={styles.TextArea}>
                            <Spin spinning={loadingPrompt}>
                              <div
                                style={{
                                  border: '1px solid #e4eaff',
                                  marginBottom: '20px',
                                  borderRadius: '6px',
                                }}
                              >
                                <Input.TextArea
                                  className={styles.textField}
                                  onChange={(e: any) =>
                                    setPrompt(e.target.value)
                                  }
                                  value={prompt}
                                  autoSize={{ minRows: 10, maxRows: 10 }}
                                  style={{ marginBottom: '50px' }}
                                />
                                <div
                                  className={styles.rightBotton}
                                  onClick={() => {
                                    aiGen();
                                  }}
                                >
                                  <img
                                    className={styles.rightBottonIcon}
                                    src={starIcon}
                                    alt=""
                                  />
                                  {t('configBase.AIoptimization')}
                                </div>
                              </div>
                            </Spin>
                          </div>
                          <div className={styles.tipTitle}>
                            <div className={styles.tipLabel}>
                              {t('configBase.modelSelection')}
                            </div>
                            <div className={styles.tipBotton}>
                              <div
                                className={styles.leftBotton}
                                onClick={() => setShowModelPk(2)}
                              >
                                <img
                                  className={styles.leftImg}
                                  src={tipIcon}
                                  alt=""
                                />
                                <div>{t('configBase.modelComparison')}</div>
                              </div>
                            </div>
                          </div>
                          <Select
                            value={model}
                            onChange={handleModelChange}
                            style={{ width: '100%' }}
                            placeholder={t('configBase.pleaseSelectModel')}
                          >
                            {modelOptions.map((option, index) => (
                              <Option
                                key={getModelUniqueKey(option, index)}
                                value={getModelUniqueKey(option, index)}
                              >
                                <div className="flex items-center">
                                  <img
                                    className="w-[20px] h-[20px]"
                                    src={option.modelIcon}
                                    alt={option.modelName}
                                  />
                                  <span>{option.modelName}</span>
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </>
                      ),
                    },
                    {
                      key: '2',
                      label: t('configBase.highOrderConfig'),
                      children: (
                        <CapabilityDevelopment
                          botCreateActiveV={botCreateActiveV}
                          setBotCreateActiveV={setBotCreateActiveV}
                          baseinfo={baseinfo}
                          detailInfo={detailInfo}
                          prompt={prompt}
                          prologue={prologue}
                          setPrologue={setPrologue}
                          inputExample={inputExample}
                          setInputExample={setInputExample}
                          choosedAlltool={choosedAlltool}
                          setChoosedAlltool={setChoosedAlltool}
                          supportContextFlag={supportContextFlag}
                          setSupportContextFlag={setSupportContextFlag}
                          selectSource={selectSource}
                          setSelectSource={setSelectSource}
                          files={files}
                          tree={tree}
                          setTree={setTree}
                          tools={tools}
                          setTools={setTools}
                          conversation={conversation}
                          setConversation={setConversation}
                          multiModelDebugging={multiModelDebugging}
                          growOrShrinkConfig={growOrShrinkConfig}
                          setGrowOrShrinkConfig={setGrowOrShrinkConfig}
                          personalityData={personalityData}
                          setPersonalityData={handlePersonalityChange}
                          model={model}
                          vcnList={vcnList}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </>
          ) : (
            <div className={styles.tipPkBox}>
              <h1>{t('configBase.promptEdit')}</h1>
              <div
                className={
                  questionTipActive == 0
                    ? styles.tipPkItemActive
                    : styles.tipPkItem
                }
              >
                <div className={styles.tipPkTitle}>
                  {t('configBase.defaultPrompt')}
                </div>
                <Input.TextArea
                  onChange={(e: any) => {
                    promptList[0].prompt = e.target.value;
                    setPromptList(promptList);
                  }}
                  defaultValue={promptList[0].prompt}
                  className={styles.tipPkTextArea}
                  autoSize={{ minRows: 13, maxRows: 13 }}
                />
                <Button
                  type={questionTipActive == 0 ? 'primary' : 'default'}
                  className={styles.tipBtn}
                  onClick={() => {
                    setQuestionTipActive(0);
                  }}
                >
                  {questionTipActive == 0
                    ? t('configBase.selected')
                    : t('configBase.select')}
                </Button>
              </div>
              <div
                className={
                  questionTipActive == 1
                    ? styles.tipPkItemActive
                    : styles.tipPkItem
                }
              >
                <div className={styles.tipPkTitle}>
                  {t('configBase.comparePrompt')}
                </div>
                <Input.TextArea
                  onChange={(e: any) => {
                    promptList[1].prompt = e.target.value;
                    promptList(promptList);
                  }}
                  defaultValue={promptList[1].prompt}
                  className={styles.tipPkTextArea}
                  autoSize={{ minRows: 13, maxRows: 13 }}
                />
                <Button
                  type={questionTipActive == 1 ? 'primary' : 'default'}
                  className={styles.tipBtn}
                  onClick={() => {
                    setQuestionTipActive(1);
                  }}
                >
                  {questionTipActive == 1
                    ? t('configBase.selected')
                    : t('configBase.select')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧区域 */}
        <div
          className="h-full bg-[#fff] border border-[#E2E8FF] p-6 flex-1 z-10 overflow-auto"
          style={{
            borderRadius: 18,
            display: multiModelDebugging ? 'block' : 'flex',
            zIndex: 1,
            paddingBottom: '0',
          }}
        >
          <div className={styles.testArea}>
            <div className={styles.testInfo}>
              <div className={styles.testName}>
                {t('configBase.debugPreview')}
              </div>
              {/* 模型对比才显示 */}
              {showModelPk !== 0 && !showTipPk && (
                <div className={styles.testBtn}>
                  <Button onClick={() => setShowModelPk(0)}>
                    {t('configBase.restoreDefaultDisplay')}
                  </Button>
                  <Button onClick={addModelPk}>
                    {t('configBase.addModel')} {`(${showModelPk} / 4)`}
                  </Button>
                </div>
              )}
            </div>
            <div className={styles.testInputModal}>
              {/* 提示词对比 样式区域 */}
              {showModelPk === 0 && (
                <>
                  {!showTipPk && (
                    <PromptTry
                      ref={defaultPromptTryRef}
                      baseinfo={baseinfo}
                      inputExample={inputExample}
                      coverUrl={coverUrl}
                      selectSource={selectSource}
                      prompt={prompt}
                      model={model}
                      promptText={promptNow}
                      supportContext={supportContextFlag ? 1 : 0}
                      choosedAlltool={choosedAlltool}
                      findModelOptionByUniqueKey={findModelOptionByUniqueKey}
                      personalityConfig={
                        personalityData.enablePersonality
                          ? personalityData.personalityConfig
                          : null
                      }
                    />
                  )}
                  {showTipPk &&
                    promptList.map((item: PageDataItem, index: number) => (
                      <div
                        key={index}
                        style={
                          {
                            '--count': showTipPk ? 2 : 1,
                            background:
                              questionTipActive == index ? '#f6f9ff' : '',
                            border:
                              questionTipActive == index
                                ? '1px solid #6356EA'
                                : '',
                          } as React.CSSProperties
                        }
                        className={`${styles.ModelItem} ${
                          !showTipPk && styles.signlItem
                        } `}
                      >
                        <PromptTry
                          ref={ref => {
                            if (tipPromptTryRefs.current) {
                              tipPromptTryRefs.current[index] = ref;
                            }
                          }}
                          newPrompt={item.prompt}
                          baseinfo={baseinfo}
                          inputExample={inputExample}
                          coverUrl={coverUrl}
                          selectSource={selectSource}
                          prompt={prompt}
                          model={model}
                          promptText={promptNow}
                          supportContext={supportContextFlag ? 1 : 0}
                          choosedAlltool={choosedAlltool}
                          findModelOptionByUniqueKey={
                            findModelOptionByUniqueKey
                          }
                          personalityConfig={
                            personalityData.enablePersonality
                              ? personalityData.personalityConfig
                              : null
                          }
                        />
                      </div>
                    ))}
                </>
              )}

              {/* 模型对比 样式区域 */}
              {showModelPk > 0 && !showTipPk && (
                <>
                  {modelList.map((item: ModelListData, index: number) => (
                    <div
                      key={index}
                      style={
                        {
                          '--count':
                            modelList.length === 4 ? 2 : modelList.length,
                        } as React.CSSProperties
                      }
                      className={styles.ModelItem}
                    >
                      <div style={{ margin: '15px 0 0 15px' }}>
                        {t('configBase.model')}
                        {index + 1}
                      </div>
                      <div
                        style={{ display: 'flex', justifyContent: 'center' }}
                      >
                        <Select
                          value={item.model}
                          onChange={e => handleModelChangeNew(e, index)}
                          style={{ width: '60%' }}
                          placeholder="请选择模型"
                        >
                          {modelOptions.map((option, index) => (
                            <Option
                              key={getModelUniqueKey(option, index)}
                              value={getModelUniqueKey(option, index)}
                            >
                              <div className="flex items-center">
                                <img
                                  className="w-[20px] h-[20px]"
                                  src={option.modelIcon}
                                  alt={option.modelName}
                                />
                                <span>{option.modelName}</span>
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </div>
                      <PromptTry
                        ref={ref => {
                          if (modelPromptTryRefs.current) {
                            modelPromptTryRefs.current[index] = ref;
                          }
                        }}
                        baseinfo={baseinfo}
                        inputExample={inputExample}
                        coverUrl={coverUrl}
                        selectSource={selectSource}
                        prompt={prompt}
                        model={item.model}
                        promptText={promptNow}
                        supportContext={supportContextFlag ? 1 : 0}
                        choosedAlltool={choosedAlltool}
                        findModelOptionByUniqueKey={findModelOptionByUniqueKey}
                        personalityConfig={
                          personalityData.enablePersonality
                            ? personalityData.personalityConfig
                            : null
                        }
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* 统一输入框 */}
            <InputBox
              onSend={handleInputBoxSend}
              onClear={handleInputBoxClear}
              value={askValue}
              onChange={setAskValue}
              isLoading={globalLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseConfig;
