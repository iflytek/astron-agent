import { AvatarType, RecurseData, ToolItem } from '@/types/resource';
import { useImperativeHandle, useRef } from 'react';
import { Form, FormInstance, message } from 'antd';
import React, { useState } from 'react';
import { InputParamsData } from '@/types/resource';
import { useMemoizedFn } from 'ahooks';
import { v4 as uuid } from 'uuid';
import { useEffect } from 'react';
import { useCallback } from 'react';
import globalStore from '@/store/global-store';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  createTool,
  debugTool,
  temporaryTool,
  updateTool,
} from '@/services/plugin';
export interface BaseFormData {
  name?: string;
  description?: string;
  endPoint?: string;
  authType?: number;
  method?: string;
  visibility?: number;
  creationMethod?: number;
  location?: string;
  parameterName?: string;
  serviceToken?: string;
}
export interface ParamsFormData {
  creationMethod?: number;
}
// 表单管理相关 Hook
const useFormManagement = (): {
  baseForm: FormInstance<BaseFormData>;
  paramsForm: FormInstance<ParamsFormData>;
  baseFormData: BaseFormData;
  setBaseFormData: React.Dispatch<React.SetStateAction<BaseFormData>>;
  resetBaseForms: () => void;
} => {
  const [baseForm] = Form.useForm();
  const [paramsForm] = Form.useForm();
  const [baseFormData, setBaseFormData] = useState<BaseFormData>({});

  const resetBaseForms = useCallback(() => {
    baseForm.resetFields();
    baseForm.setFieldsValue({
      authType: 1,
      visibility: 0,
      location: 'header',
    });
    paramsForm.setFieldsValue({
      creationMethod: 1,
    });
  }, [baseForm, paramsForm]);

  return {
    baseForm,
    paramsForm,
    baseFormData,
    setBaseFormData,
    resetBaseForms,
  };
};

// 状态管理相关 Hook
const useToolStates = (): {
  authType: number;
  setAuthType: React.Dispatch<React.SetStateAction<number>>;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  desc: string;
  setDesc: React.Dispatch<React.SetStateAction<string>>;
  inputParamsData: InputParamsData[];
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  outputParamsData: InputParamsData[];
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
  debuggerJsonData: string;
  setDebuggerJsonData: React.Dispatch<React.SetStateAction<string>>;
  canPublish: boolean;
  setCanPublish: React.Dispatch<React.SetStateAction<boolean>>;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  debugLoading: boolean;
  setDebugLoading: React.Dispatch<React.SetStateAction<boolean>>;
  publishLoading: boolean;
  setPublishLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentToolStatus: number;
  setCurrentToolStatus: React.Dispatch<React.SetStateAction<number>>;
  temporaryStorageToolId: number | string | null;
  setTemporaryStorageToolId: React.Dispatch<
    React.SetStateAction<number | string | null>
  >;
  resetStates: () => void;
} => {
  const [authType, setAuthType] = useState(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [inputParamsData, setInputParamsData] = useState<InputParamsData[]>([]);
  const [outputParamsData, setOutputParamsData] = useState<InputParamsData[]>(
    []
  );
  const [debuggerParamsData, setDebuggerParamsData] = useState<
    InputParamsData[]
  >([]);
  const [debuggerJsonData, setDebuggerJsonData] = useState('');
  const [canPublish, setCanPublish] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [currentToolStatus, setCurrentToolStatus] = useState(0);
  const [temporaryStorageToolId, setTemporaryStorageToolId] = useState<
    number | string | null
  >(null);

  const resetStates = useCallback(() => {
    setName('');
    setDesc('');
    setInputParamsData([]);
    setOutputParamsData([]);
    setDebuggerParamsData([]);
    setAuthType(1);
    setDebuggerJsonData('');
  }, []);

  return {
    authType,
    setAuthType,
    name,
    setName,
    desc,
    setDesc,
    inputParamsData,
    setInputParamsData,
    outputParamsData,
    setOutputParamsData,
    debuggerParamsData,
    setDebuggerParamsData,
    debuggerJsonData,
    setDebuggerJsonData,
    canPublish,
    setCanPublish,
    showModal,
    setShowModal,
    debugLoading,
    setDebugLoading,
    publishLoading,
    setPublishLoading,
    currentToolStatus,
    setCurrentToolStatus,
    temporaryStorageToolId,
    setTemporaryStorageToolId,
    resetStates,
  };
};

// 数据转换相关 Hook
const useDataTransform = (): {
  addTestProperty: (obj: InputParamsData) => void;
  transformInputDataToDefaultParamsData: (
    node: InputParamsData
  ) => InputParamsData;
  parmasTableSetDefault: (data: InputParamsData[]) => InputParamsData[];
} => {
  const addTestProperty = useCallback((obj: InputParamsData) => {
    obj.subChild = obj?.children?.[0] as InputParamsData;
    obj.id = uuid();

    if (obj.children && Array.isArray(obj.children)) {
      obj.children.forEach(child => addTestProperty(child));
    }
  }, []);

  const transformInputDataToDefaultParamsData = useCallback(
    (node: InputParamsData) => {
      function recurse(
        node: InputParamsData,
        defaultVal: RecurseData | undefined,
        parentId: string
      ): void {
        node.id = parentId ? `${parentId}-${uuid()}` : uuid();
        if (node.type === 'object') {
          (node.children || []).forEach(child => {
            recurse(
              child,
              defaultVal ? defaultVal[child.name] : undefined,
              node.id
            );
          });
        } else if (node.type === 'array') {
          const arrayDefault = (
            Array.isArray(defaultVal) ? defaultVal : []
          ) as InputParamsData[];

          node.children = arrayDefault.map((defaultItem, index) => {
            const newChild = {
              ...cloneDeep(node.children?.[0]),
              default: defaultItem,
              id: `${node.id}-${index}`,
            };

            recurse(
              newChild as InputParamsData,
              defaultItem as RecurseData,
              newChild.id
            );

            return newChild;
          }) as InputParamsData[];
        } else {
          node.default = defaultVal !== undefined ? defaultVal : node.default;
        }
      }

      recurse(node as InputParamsData, node.default as RecurseData, node.id);
      return node;
    },
    []
  );

  const parmasTableSetDefault = useCallback(
    (data: InputParamsData[]) => {
      function transformData(node: InputParamsData): InputParamsData {
        if (node?.children && node?.children?.length > 0) {
          node.children = node?.children?.map(node => transformData(node));
        }
        if (
          node?.type === 'array' &&
          Array.isArray(node?.default) &&
          node?.default?.length > 0
        ) {
          addTestProperty(node);
          const newNode = transformInputDataToDefaultParamsData(node);
          return newNode;
        } else {
          return node;
        }
      }

      return data?.map(node => transformData(node));
    },
    [addTestProperty, transformInputDataToDefaultParamsData]
  );

  return {
    addTestProperty,
    transformInputDataToDefaultParamsData,
    parmasTableSetDefault,
  };
};

// 参数验证相关 Hook
const useParamsValidation = (): {
  checkNameConventions: (string: string) => boolean;
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null;
  checkParmas: (params: InputParamsData[], id: string, key: string) => boolean;
  validateTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  validateDebuggerTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
} => {
  const { t } = useTranslation();

  const checkNameConventions = (string: string): boolean => {
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(string);
  };

  const findNodeById = useCallback(
    (tree: InputParamsData[], id: string): InputParamsData | null => {
      for (const node of tree) {
        if (node.id === id) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const result = findNodeById(node.children, id);
          if (result) {
            return result;
          }
        }
      }
      return null;
    },
    []
  );

  const checkParmas = useCallback(
    (params: InputParamsData[], id: string, key: string) => {
      let passFlag = true;
      const errEsg =
        key === 'name'
          ? t('plugin.pleaseEnterParameterName')
          : t('plugin.pleaseEnterParameterDescription');
      const currentNode = findNodeById(params, id) || ({} as InputParamsData);
      if (!currentNode[key]) {
        currentNode[`${key}ErrMsg`] = errEsg;
        passFlag = false;
      } else if (
        key === 'name' &&
        currentNode.fatherType !== 'array' &&
        !checkNameConventions(currentNode[key])
      ) {
        currentNode.nameErrMsg = t('common.onlyLettersNumbersDashUnderscore');
      } else {
        currentNode[`${key}ErrMsg`] = '';
      }
      return passFlag;
    },
    [t]
  );

  const validateTransformedData = (
    data: InputParamsData[]
  ): { validatedData: InputParamsData[]; flag: boolean } => {
    let flag = true;

    const validate = (items: InputParamsData[]): InputParamsData[] => {
      const nameCount: Record<string, number> = {};
      const newItems = items.map((item, index) => {
        if (!item?.name?.trim()) {
          item.nameErrMsg = t('common.valueCannotBeEmpty');
          flag = false;
        } else if (
          item.fatherType !== 'array' &&
          !checkNameConventions(item?.name)
        ) {
          item.nameErrMsg = t('common.onlyLettersNumbersDashUnderscore');
          flag = false;
        } else {
          item.nameErrMsg = '';
        }
        if (!item?.description?.trim()) {
          item.descriptionErrMsg = t('common.valueCannotBeEmpty');
          flag = false;
        } else {
          item.descriptionErrMsg = '';
        }
        nameCount[item.name] = (nameCount[item.name] || 0) + 1;
        return item;
      });

      newItems.forEach(item => {
        if ((nameCount[item.name] || 0) > 1) {
          flag = false;
          item.nameErrMsg = t('common.valueCannotBeRepeated');
        }
      });

      return newItems?.map(item => {
        if (Array.isArray(item.children)) {
          item.children = validate(item.children);
        }
        return item;
      });
    };

    const validatedData = validate(data);
    return { validatedData, flag };
  };

  const validateDebuggerTransformedData = (
    data: InputParamsData[]
  ): { validatedData: InputParamsData[]; flag: boolean } => {
    let flag = true;

    const validate = (items: InputParamsData[]): InputParamsData[] => {
      const newItems = items.map((item, index) => {
        if (item?.type !== 'object' && item?.type !== 'array') {
          if (
            item?.required &&
            item?.type === 'string' &&
            !(item?.default as string)?.trim()
          ) {
            item.defaultErrMsg = t('common.valueCannotBeEmpty');
            flag = false;
          } else {
            item.defaultErrMsg = '';
          }
        }
        return item;
      });

      return newItems?.map(item => {
        if (Array.isArray(item.children)) {
          item.children = validate(item.children);
        }
        return item;
      });
    };

    const validatedData = validate(data);
    return { validatedData, flag };
  };

  return {
    checkNameConventions,
    findNodeById,
    checkParmas,
    validateTransformedData,
    validateDebuggerTransformedData,
  };
};

// 工具操作相关 Hook
const useToolOperations = ({
  baseFormData,
  inputParamsData,
  outputParamsData,
  botIcon,
  botColor,
  currentToolId,
  currentToolStatus,
  temporaryStorageToolId,
  setTemporaryStorageToolId,
  setPublishLoading,
  handleCreateToolDone,
}: {
  baseFormData: BaseFormData;
  inputParamsData: InputParamsData[];
  outputParamsData: InputParamsData[];
  botIcon: AvatarType;
  botColor: string;
  currentToolId: number | string | undefined;
  currentToolStatus: number;
  temporaryStorageToolId: number | string | null;
  setTemporaryStorageToolId: (id: number | string) => void;
  setPublishLoading: (loading: boolean) => void;
  handleCreateToolDone: () => void;
}): {
  onHold: () => Promise<void>;
  handlePublishTool: () => void;
} => {
  const onHold = async (): Promise<void> => {
    try {
      // This would need to be adapted to use the form validation properly
      let params = {} as ToolItem;
      params = {
        name: baseFormData?.name || '',
        description: baseFormData?.description || '',
        endPoint: baseFormData?.endPoint || '',
        authType: baseFormData?.authType || 0,
        method: baseFormData?.method || '',
        // visibility: baseFormData?.visibility || 0,
        creationMethod: 1,
        avatarColor: botColor,
        avatarIcon: botIcon.value || '',
        webSchema: JSON.stringify({
          toolRequestInput: inputParamsData,
          toolRequestOutput: outputParamsData,
        }),
      } as ToolItem;

      if (baseFormData?.authType === 2) {
        params.authInfo = JSON.stringify({
          location: baseFormData.location,
          parameterName: baseFormData.parameterName,
          serviceToken: baseFormData.serviceToken,
        });
      }
      if (temporaryStorageToolId) {
        params.id = temporaryStorageToolId;
      }
      temporaryTool(params).then(res =>
        setTemporaryStorageToolId(res?.id || '')
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handlePublishTool = useCallback(() => {
    setPublishLoading(true);
    const params = {
      name: baseFormData?.name || '',
      description: baseFormData?.description || '',
      endPoint: baseFormData?.endPoint || '',
      authType: baseFormData?.authType || 0,
      method: baseFormData?.method || '',
      // visibility: baseFormData?.visibility || 0,
      creationMethod: 1,
      avatarColor: botColor,
      avatarIcon: botIcon.value || '',
      webSchema: JSON.stringify({
        toolRequestInput: inputParamsData,
        toolRequestOutput: outputParamsData,
      }),
    } as ToolItem;
    if (baseFormData?.authType === 2) {
      params.authInfo = JSON.stringify({
        location: baseFormData.location,
        parameterName: baseFormData.parameterName,
        serviceToken: baseFormData.serviceToken,
      });
    }
    if (temporaryStorageToolId) {
      params.id = temporaryStorageToolId;
    }
    if (currentToolId && currentToolStatus == 1) {
      updateTool(params)
        .then(() => {
          handleCreateToolDone();
        })
        .finally(() => setPublishLoading(false));
    } else {
      createTool(params)
        .then(() => {
          handleCreateToolDone();
        })
        .finally(() => setPublishLoading(false));
    }
  }, [
    baseFormData,
    botColor,
    botIcon.value,
    inputParamsData,
    outputParamsData,
    temporaryStorageToolId,
    currentToolId,
    currentToolStatus,
    handleCreateToolDone,
    setPublishLoading,
  ]);

  return {
    onHold,
    handlePublishTool,
  };
};

// 步骤管理相关 Hook
const useStepManagement = ({
  step,
  setStep,
  baseFormData,
  setName,
  setDesc,
  setCanPublish,
  baseForm,
  setBaseFormData,
  inputParamsData,
  setDebuggerParamsData,
  checkParmasTable,
  parmasTableSetDefault,
}: {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  baseFormData: BaseFormData;
  setName: (name: string) => void;
  setDesc: (desc: string) => void;
  setCanPublish: (canPublish: boolean) => void;
  baseForm: FormInstance<BaseFormData>;
  setBaseFormData: (data: BaseFormData) => void;
  inputParamsData: InputParamsData[];
  setDebuggerParamsData: (data: InputParamsData[]) => void;
  checkParmasTable: () => boolean;
  parmasTableSetDefault: (data: InputParamsData[]) => InputParamsData[];
}): {
  handlePreStep: () => void;
  handleNextStep: () => void;
} => {
  const { t } = useTranslation();

  const handlePreStep = useCallback(() => {
    if (step === 2) {
      setName(baseFormData?.name || '');
      setDesc(baseFormData?.description || '');
    } else if (step === 3) {
      setCanPublish(false);
    }
    setStep(step - 1);
  }, [step, baseFormData, setCanPublish, setName, setDesc, setStep]);

  const handleNextStep = useCallback(() => {
    if (step === 1) {
      baseForm.validateFields().then((values: BaseFormData) => {
        setBaseFormData(values);
        setStep(step => step + 1);
      });
    }
    if (step === 2) {
      const flag = checkParmasTable();
      if (!flag) {
        message.warning(t('plugin.parameterValidationFailed'));
        return;
      }
      setDebuggerParamsData(parmasTableSetDefault(cloneDeep(inputParamsData)));
      setStep(step => step + 1);
    }
  }, [
    step,
    baseForm,
    setBaseFormData,
    setStep,
    checkParmasTable,
    t,
    setDebuggerParamsData,
    parmasTableSetDefault,
    inputParamsData,
  ]);

  return {
    handlePreStep,
    handleNextStep,
  };
};

// 调试功能相关 Hook
const useToolDebugger = ({
  debuggerParamsData,
  setDebuggerParamsData,
  outputParamsData,
  baseFormData,
  temporaryStorageToolId,
  setCanPublish,
  setDebuggerJsonData,
  setDebugLoading,
  validateDebuggerTransformedData,
}: {
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: (data: InputParamsData[]) => void;
  outputParamsData: InputParamsData[];
  baseFormData: BaseFormData;
  temporaryStorageToolId: number | string | null;
  setCanPublish: (canPublish: boolean) => void;
  setDebuggerJsonData: (data: string) => void;
  setDebugLoading: (loading: boolean) => void;
  validateDebuggerTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
}): {
  checkDebuggerParmasTable: () => boolean;
  handleDebuggerTool: () => void;
} => {
  const { t } = useTranslation();

  const checkDebuggerParmasTable = useCallback(() => {
    const { validatedData, flag } =
      validateDebuggerTransformedData(debuggerParamsData);
    setDebuggerParamsData(cloneDeep(validatedData));
    return flag;
  }, [
    debuggerParamsData,
    setDebuggerParamsData,
    validateDebuggerTransformedData,
  ]);

  const handleDebuggerTool = useCallback(() => {
    const flag = checkDebuggerParmasTable();
    if (!flag) {
      message.warning(t('plugin.requiredParameterNotFilled'));
      return;
    }
    setDebugLoading(true);
    const params = {
      id: temporaryStorageToolId,
      name: baseFormData?.name,
      description: baseFormData?.description,
      endPoint: baseFormData?.endPoint,
      authType: baseFormData?.authType,
      method: baseFormData?.method,
      // visibility: baseFormData?.visibility || 0,
      creationMethod: 1,
      webSchema: JSON.stringify({
        toolRequestInput: debuggerParamsData,
        toolRequestOutput: outputParamsData,
      }),
    } as ToolItem;
    if (baseFormData?.authType === 2) {
      params.authInfo = JSON.stringify({
        location: baseFormData.location,
        parameterName: baseFormData.parameterName,
        serviceToken: baseFormData.serviceToken,
      });
    }
    debugTool(params)
      .then(result => {
        setCanPublish(true);
        setDebuggerJsonData(JSON.stringify(result, null, 2));
        message.success(result?.message || t('operationSuccessful'));
      })
      .catch(error => {
        setCanPublish(false);
        setDebuggerJsonData(
          JSON.stringify(
            {
              code: error?.code,
              message: error?.message,
            },
            null,
            2
          )
        );
        message.error(error?.message);
      })
      .finally(() => setDebugLoading(false));
  }, [
    checkDebuggerParmasTable,
    t,
    setDebugLoading,
    temporaryStorageToolId,
    baseFormData,
    debuggerParamsData,
    outputParamsData,
    setCanPublish,
    setDebuggerJsonData,
  ]);

  return {
    checkDebuggerParmasTable,
    handleDebuggerTool,
  };
};

// 工具初始化相关 Hook
const useToolInitialization = (
  currentToolId: number | string | undefined
): {
  currentDebuggerToolInfo: React.MutableRefObject<ToolItem>;
  avatarIcon: AvatarType[];
  avatarColor: AvatarType[];
  getAvatarConfig: () => void;
} => {
  const currentDebuggerToolInfo = useRef<ToolItem>({} as ToolItem);
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);

  return {
    currentDebuggerToolInfo,
    avatarIcon,
    avatarColor,
    getAvatarConfig,
  };
};

// 表单数据处理相关 Hook
const useFormDataHandler = (
  toolStates: ReturnType<typeof useToolStates>,
  formManagement: ReturnType<typeof useFormManagement>,
  setBotIcon: (botIcon: AvatarType) => void,
  setBotColor: (botColor: string) => void
): {
  handleSetFormData: (data: ToolItem) => void;
} => {
  const handleSetFormData = useMemoizedFn((data: ToolItem) => {
    toolStates.setCurrentToolStatus(data.status);
    formManagement.baseForm.setFieldsValue({
      name: data?.name,
      description: data?.description,
      endPoint: data?.endPoint,
      authType: data?.authType,
      method: data?.method,
      visibility: data?.visibility,
      creationMethod: data?.creationMethod,
    });
    if (data?.authType === 2) {
      const authInfo = JSON.parse(data?.authInfo || '{}');
      formManagement.baseForm.setFieldsValue({
        location: authInfo?.location,
        parameterName: authInfo?.parameterName,
        serviceToken: authInfo?.serviceToken,
      });
      toolStates.setAuthType(2);
    }
    toolStates.setName(data?.name);
    toolStates.setDesc(data?.description);
    toolStates.setInputParamsData(data?.toolRequestInput || []);
    toolStates.setOutputParamsData(data?.toolRequestOutput || []);
    toolStates.setDebuggerParamsData(data?.toolRequestInput || []);
    setBotIcon({
      name: data?.address,
      value: data?.icon || '',
    });
    setBotColor(data?.avatarColor);
  });

  return {
    handleSetFormData,
  };
};

// 副作用管理相关 Hook
const useToolEffects = ({
  currentToolInfo,
  currentToolId,
  toolStates,
  formManagement,
  initialization,
  formHandler,
  setBotIcon,
  setBotColor,
}: {
  currentToolInfo: ToolItem;
  currentToolId: number | string | undefined;
  toolStates: ReturnType<typeof useToolStates>;
  formManagement: ReturnType<typeof useFormManagement>;
  initialization: ReturnType<typeof useToolInitialization>;
  formHandler: ReturnType<typeof useFormDataHandler>;
  setBotIcon: React.Dispatch<React.SetStateAction<AvatarType>>;
  setBotColor: React.Dispatch<React.SetStateAction<string>>;
}): void => {
  useEffect(() => {
    if (!currentToolId) {
      initialization.avatarIcon.length > 0 &&
        setBotIcon(initialization.avatarIcon[0] as AvatarType);
      initialization.avatarColor.length > 0 &&
        setBotColor(initialization.avatarColor[0]?.name as string);
    }
  }, [
    initialization.avatarIcon.length,
    initialization.avatarColor.length,
    currentToolId,
    setBotIcon,
    setBotColor,
  ]);

  useEffect(() => {
    initialization.getAvatarConfig();
  }, []);

  useEffect(() => {
    if (currentToolInfo?.id) {
      const paramsData = JSON.parse(currentToolInfo?.webSchema);
      formHandler.handleSetFormData({
        ...currentToolInfo,
        toolRequestInput: paramsData?.toolRequestInput,
        toolRequestOutput: paramsData?.toolRequestOutput,
      });
      toolStates.setTemporaryStorageToolId(currentToolId as number);
    } else {
      formManagement.resetBaseForms();
      toolStates.resetStates();
    }
    toolStates.setDebuggerJsonData('');
  }, [currentToolInfo?.id, currentToolInfo?.webSchema, currentToolId]);
};

// 工具信息更新相关 Hook
const useToolInfoUpdater = ({
  toolStates,
  formManagement,
  initialization,
  formHandler,
  botIcon,
  botColor,
}: {
  toolStates: ReturnType<typeof useToolStates>;
  formManagement: ReturnType<typeof useFormManagement>;
  initialization: ReturnType<typeof useToolInitialization>;
  formHandler: ReturnType<typeof useFormDataHandler>;
  botIcon: AvatarType;
  botColor: string;
}): {
  updateToolInfo: (
    selectedCard: ToolItem,
    shouldUpdateToolInfo: boolean
  ) => void;
} => {
  const updateToolInfo = useCallback(
    (selectedCard: ToolItem, shouldUpdateToolInfo: boolean): void => {
      if (shouldUpdateToolInfo) {
        const baseFormData = formManagement.baseForm.getFieldsValue();
        initialization.currentDebuggerToolInfo.current = {
          status: toolStates.currentToolStatus,
          name: baseFormData?.name,
          description: baseFormData?.description,
          endPoint: baseFormData?.endPoint,
          authType: baseFormData?.authType,
          method: baseFormData?.method,
          visibility: baseFormData?.visibility,
          creationMethod: baseFormData?.creationMethod,
          authInfo: JSON.stringify({
            location: baseFormData?.location,
            parameterName: baseFormData?.parameterName,
            serviceToken: baseFormData?.serviceToken,
          }),
          toolRequestInput: toolStates.inputParamsData,
          toolRequestOutput: toolStates.outputParamsData,
          address: botIcon?.name || '',
          icon: botIcon.value || '',
          avatarColor: botColor,
        } as ToolItem;
      }
      if (selectedCard?.id) {
        const paramsData = JSON.parse(selectedCard?.webSchema);
        formHandler.handleSetFormData({
          ...selectedCard,
          toolRequestInput: paramsData?.toolRequestInput,
          toolRequestOutput: paramsData?.toolRequestOutput,
        });
      }
      if (selectedCard?.id === '') {
        formHandler.handleSetFormData(
          initialization.currentDebuggerToolInfo?.current as ToolItem
        );
      }
    },
    [toolStates, formManagement, initialization, formHandler, botIcon, botColor]
  );

  return {
    updateToolInfo,
  };
};

// 返回值组合器 Hook
const useCreateToolReturn = ({
  stepManagement,
  dataTransform,
  toolOperations,
  paramsValidation,
  toolDebugger,
  updatePlugin,
  toolStates,
  formManagement,
  currentToolId,
  checkParmasTable,
  initialization,
}: {
  stepManagement: ReturnType<typeof useStepManagement>;
  dataTransform: ReturnType<typeof useDataTransform>;
  toolOperations: ReturnType<typeof useToolOperations>;
  paramsValidation: ReturnType<typeof useParamsValidation>;
  toolDebugger: ReturnType<typeof useToolDebugger>;
  updatePlugin: ReturnType<typeof usePluginImport>;
  toolStates: ReturnType<typeof useToolStates>;
  formManagement: ReturnType<typeof useFormManagement>;
  currentToolId: number | string | undefined;
  checkParmasTable: () => boolean;
  initialization: ReturnType<typeof useToolInitialization>;
}): {
  handlePreStep: () => void;
  handleNextStep: () => void;
  addTestProperty: (obj: InputParamsData) => void;
  transformInputDataToDefaultParamsData: (
    node: InputParamsData
  ) => InputParamsData;
  parmasTableSetDefault: (data: InputParamsData[]) => InputParamsData[];
  onHold: () => Promise<void>;
  handlePublishTool: () => void;
  checkNameConventions: (string: string) => boolean;
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null;
  checkParmas: (params: InputParamsData[], id: string, key: string) => boolean;
  validateTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  validateDebuggerTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  checkParmasTable: () => boolean;
  checkDebuggerParmasTable: () => boolean;
  handleDebuggerTool: () => void;
  updatePlugin: (tool: ToolItem) => void;
  authType: number;
  name: string;
  debuggerJsonData: string;
  canPublish: boolean;
  desc: string;
  showModal: boolean;
  debugLoading: boolean;
  currentToolId: number | string | undefined;
  inputParamsData: InputParamsData[];
  debuggerParamsData: InputParamsData[];
  outputParamsData: InputParamsData[];
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setAuthType: React.Dispatch<React.SetStateAction<number>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDesc: React.Dispatch<React.SetStateAction<string>>;
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
  baseForm: FormInstance<BaseFormData>;
  paramsForm: FormInstance<ParamsFormData>;
  avatarColor: AvatarType[];
  avatarIcon: AvatarType[];
  setBaseFormData: React.Dispatch<React.SetStateAction<BaseFormData>>;
} => {
  return {
    // 步骤管理
    handlePreStep: stepManagement.handlePreStep,
    handleNextStep: stepManagement.handleNextStep,

    // 数据转换
    addTestProperty: dataTransform.addTestProperty,
    transformInputDataToDefaultParamsData:
      dataTransform.transformInputDataToDefaultParamsData,
    parmasTableSetDefault: dataTransform.parmasTableSetDefault,

    // 工具操作
    onHold: toolOperations.onHold,
    handlePublishTool: toolOperations.handlePublishTool,

    // 参数验证
    checkNameConventions: paramsValidation.checkNameConventions,
    findNodeById: paramsValidation.findNodeById,
    checkParmas: paramsValidation.checkParmas,
    validateTransformedData: paramsValidation.validateTransformedData,
    validateDebuggerTransformedData:
      paramsValidation.validateDebuggerTransformedData,
    checkParmasTable,

    // 调试功能
    checkDebuggerParmasTable: toolDebugger.checkDebuggerParmasTable,
    handleDebuggerTool: toolDebugger.handleDebuggerTool,

    // 插件导入
    updatePlugin: updatePlugin.updatePlugin,

    // 状态数据
    authType: toolStates.authType,
    name: toolStates.name,
    debuggerJsonData: toolStates.debuggerJsonData,
    canPublish: toolStates.canPublish,
    desc: toolStates.desc,
    showModal: toolStates.showModal,
    debugLoading: toolStates.debugLoading,
    currentToolId,
    inputParamsData: toolStates.inputParamsData,
    debuggerParamsData: toolStates.debuggerParamsData,
    outputParamsData: toolStates.outputParamsData,

    // 状态设置器
    setShowModal: toolStates.setShowModal,
    setAuthType: toolStates.setAuthType,
    setName: toolStates.setName,
    setDesc: toolStates.setDesc,
    setInputParamsData: toolStates.setInputParamsData,
    setOutputParamsData: toolStates.setOutputParamsData,
    setDebuggerParamsData: toolStates.setDebuggerParamsData,

    // 表单
    baseForm: formManagement.baseForm,
    paramsForm: formManagement.paramsForm,

    avatarColor: initialization.avatarColor,
    avatarIcon: initialization.avatarIcon,
    setBaseFormData: formManagement.setBaseFormData,
  };
};

const usePluginImport = ({
  formHandler,
}: {
  formHandler: ReturnType<typeof useFormDataHandler>;
}): {
  updatePlugin: (tool: ToolItem) => void;
} => {
  const updatePlugin = useCallback((values: ToolItem): void => {
    const paramsData = JSON.parse(values?.webSchema);
    formHandler.handleSetFormData({
      ...values,
      toolRequestInput: paramsData?.toolRequestInput,
      toolRequestOutput: paramsData?.toolRequestOutput,
    });
  }, []);
  return {
    updatePlugin,
  };
};

export const useCreateTool = ({
  currentToolInfo,
  handleCreateToolDone,
  step,
  setStep,
  botIcon,
  setBotIcon,
  botColor,
  setBotColor,
  ref,
}: {
  currentToolInfo: ToolItem;
  handleCreateToolDone: () => void;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  botIcon: AvatarType;
  setBotIcon: React.Dispatch<React.SetStateAction<AvatarType>>;
  botColor: string;
  setBotColor: React.Dispatch<React.SetStateAction<string>>;

  ref: React.RefObject<{
    updateToolInfo: (
      selectedCard: ToolItem,
      shouldUpdateToolInfo: boolean
    ) => void;
  }>;
}): {
  handlePreStep: () => void;
  addTestProperty: (obj: InputParamsData) => void;
  transformInputDataToDefaultParamsData: (
    node: InputParamsData
  ) => InputParamsData;
  parmasTableSetDefault: (data: InputParamsData[]) => InputParamsData[];
  handleNextStep: () => void;
  onHold: () => Promise<void>;
  handlePublishTool: () => void;
  checkNameConventions: (string: string) => boolean;
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null;
  checkParmas: (params: InputParamsData[], id: string, key: string) => boolean;
  validateTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  checkParmasTable: () => boolean;
  validateDebuggerTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  checkDebuggerParmasTable: () => boolean;
  handleDebuggerTool: () => void;
  updatePlugin: (tool: ToolItem) => void;
  authType: number;
  name: string;
  debuggerJsonData: string;
  canPublish: boolean;
  desc: string;
  showModal: boolean;
  debugLoading: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentToolId: number | string | undefined;
  inputParamsData: InputParamsData[];
  setAuthType: React.Dispatch<React.SetStateAction<number>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDesc: React.Dispatch<React.SetStateAction<string>>;
  baseForm: FormInstance<BaseFormData>;
  paramsForm: FormInstance<ParamsFormData>;
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
  debuggerParamsData: InputParamsData[];
  outputParamsData: InputParamsData[];
  avatarColor: AvatarType[];
  avatarIcon: AvatarType[];
  setBaseFormData: React.Dispatch<React.SetStateAction<BaseFormData>>;
} => {
  const currentToolId = currentToolInfo?.id;

  // 创建所有子 hooks
  const formManagement = useFormManagement();
  const toolStates = useToolStates();
  const dataTransform = useDataTransform();
  const paramsValidation = useParamsValidation();
  const initialization = useToolInitialization(currentToolId);
  const formHandler = useFormDataHandler(
    toolStates,
    formManagement,
    setBotIcon,
    setBotColor
  );

  const toolOperations = useToolOperations({
    baseFormData: formManagement.baseFormData,
    inputParamsData: toolStates.inputParamsData,
    outputParamsData: toolStates.outputParamsData,
    botIcon,
    botColor,
    currentToolId,
    currentToolStatus: toolStates.currentToolStatus,
    temporaryStorageToolId: toolStates.temporaryStorageToolId,
    setTemporaryStorageToolId: toolStates.setTemporaryStorageToolId,
    setPublishLoading: toolStates.setPublishLoading,
    handleCreateToolDone: handleCreateToolDone,
  });

  const toolInfoUpdater = useToolInfoUpdater({
    toolStates,
    formManagement,
    initialization,
    formHandler,
    botIcon,
    botColor,
  });

  // 参数验证相关的逻辑
  const checkParmasTable = useCallback(() => {
    const { validatedData: newInputParamsData, flag: inputFlag } =
      paramsValidation.validateTransformedData(toolStates.inputParamsData);
    const { validatedData: newOutputParamsData, flag: outputFlag } =
      paramsValidation.validateTransformedData(toolStates.outputParamsData);
    toolStates.setInputParamsData(cloneDeep(newInputParamsData));
    toolStates.setOutputParamsData(cloneDeep(newOutputParamsData));
    return inputFlag && outputFlag;
  }, [
    toolStates.inputParamsData,
    toolStates.outputParamsData,
    paramsValidation.validateTransformedData,
  ]);

  // 创建步骤管理和调试器实例
  const stepManagement = useStepManagement({
    step,
    setStep,
    baseFormData: formManagement.baseFormData,
    setName: toolStates.setName,
    setDesc: toolStates.setDesc,
    setCanPublish: toolStates.setCanPublish,
    baseForm: formManagement.baseForm,
    setBaseFormData: formManagement.setBaseFormData,
    inputParamsData: toolStates.inputParamsData,
    setDebuggerParamsData: toolStates.setDebuggerParamsData,
    checkParmasTable,
    parmasTableSetDefault: dataTransform.parmasTableSetDefault,
  });

  const toolDebugger = useToolDebugger({
    debuggerParamsData: toolStates.debuggerParamsData,
    setDebuggerParamsData: toolStates.setDebuggerParamsData,
    outputParamsData: toolStates.outputParamsData,
    baseFormData: formManagement.baseFormData,
    temporaryStorageToolId: toolStates.temporaryStorageToolId,
    setCanPublish: toolStates.setCanPublish,
    setDebuggerJsonData: toolStates.setDebuggerJsonData,
    setDebugLoading: toolStates.setDebugLoading,
    validateDebuggerTransformedData:
      paramsValidation.validateDebuggerTransformedData,
  });

  const updatePlugin = usePluginImport({ formHandler });

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    updateToolInfo: toolInfoUpdater.updateToolInfo,
  }));

  // 副作用管理
  useToolEffects({
    currentToolInfo,
    currentToolId,
    toolStates,
    formManagement,
    initialization,
    formHandler,
    setBotIcon,
    setBotColor,
  });

  // 组合并返回所有功能
  return useCreateToolReturn({
    stepManagement,
    dataTransform,
    toolOperations,
    paramsValidation,
    toolDebugger,
    updatePlugin,
    toolStates,
    formManagement,
    currentToolId,
    checkParmasTable,
    initialization,
  });
};
