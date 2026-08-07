import { debugTool } from '@/services/plugin';
import { InputParamsData, ToolItem } from '@/types/resource';
import { isJSON } from '@/utils/utils';
import { message } from 'antd';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
interface BaseFormData {
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
export const useToolDebugger = ({
  currentToolInfo,
  offical = false,
  selectedCard = {} as ToolItem,
}: {
  currentToolInfo: ToolItem;
  offical: boolean;
  selectedCard: ToolItem;
}): {
  handleDebuggerTool: () => void;
  debuggerJsonData: string;
  debugLoading: boolean;
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
} => {
  const { t } = useTranslation();
  const [baseFormData, setBaseFormData] = useState<BaseFormData>({});
  const [outputParamsData, setOutputParamsData] = useState<InputParamsData[]>(
    []
  );
  const [debuggerParamsData, setDebuggerParamsData] = useState<
    InputParamsData[]
  >([]);
  const [debuggerJsonData, setDebuggerJsonData] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);

  const currentToolId = currentToolInfo?.id;

  const handleResetFormData = (data: ToolItem): void => {
    let baseFormParams: BaseFormData = {
      name: data?.name,
      description: data?.description,
      endPoint: data?.endPoint,
      authType: data?.authType,
      method: data?.method,
      visibility: data?.visibility,
      creationMethod: data?.creationMethod,
    };
    if (baseFormParams?.authType === 2) {
      const authInfo = JSON.parse(data?.authInfo || '{}');
      baseFormParams = {
        ...baseFormParams,
        location: authInfo?.location,
        parameterName: authInfo?.parameterName,
        serviceToken: authInfo?.serviceToken,
      };
    }
    setOutputParamsData(data?.toolRequestOutput || []);
    setDebuggerParamsData(data?.toolRequestInput || []);
    setBaseFormData(baseFormParams);
  };

  useEffect(() => {
    if (selectedCard?.id) {
      const paramsData = isJSON(selectedCard?.webSchema || '')
        ? JSON.parse(selectedCard?.webSchema || '{}')
        : {};
      handleResetFormData({
        ...selectedCard,
        toolRequestInput: paramsData?.toolRequestInput as InputParamsData[],
        toolRequestOutput: paramsData?.toolRequestOutput as InputParamsData[],
      });
    } else if (currentToolInfo?.id) {
      const paramsData = isJSON(currentToolInfo?.webSchema)
        ? JSON.parse(currentToolInfo?.webSchema)
        : {};
      handleResetFormData({
        ...currentToolInfo,
        toolRequestInput: paramsData?.toolRequestInput,
        toolRequestOutput: paramsData?.toolRequestOutput,
      });
    }
  }, [
    offical,
    currentToolInfo,
    setOutputParamsData,
    setDebuggerParamsData,
    selectedCard?.id,
  ]);

  const validateDebuggerTransformedData = (
    data: InputParamsData[]
  ): { validatedData: InputParamsData[]; flag: boolean } => {
    let flag = true;
    const validate = (items: InputParamsData[]): InputParamsData[] => {
      const newItems = items.map((item, index) => {
        // 校验当前项的 name 字段是否为空
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

  const checkDebuggerParmasTable = useCallback(() => {
    const { validatedData, flag } =
      validateDebuggerTransformedData(debuggerParamsData);
    setDebuggerParamsData(cloneDeep(validatedData));
    return flag;
  }, [debuggerParamsData, setDebuggerParamsData]);

  const handleDebuggerTool = useCallback(() => {
    const flag = checkDebuggerParmasTable();
    if (!flag) {
      message.warning(t('plugin.requiredParameterNotFilled'));
      return;
    }
    setDebugLoading(true);
    const params = {
      id: currentToolId,
      name: baseFormData?.name || '',
      description: baseFormData?.description || '',
      endPoint: baseFormData?.endPoint || '',
      authType: baseFormData?.authType || 0,
      method: baseFormData?.method || '',
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
        setDebuggerJsonData(JSON.stringify(result, null, 2));
        message.success(result?.message || t('operationSuccessful'));
      })
      .catch(error => {
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
  }, [debuggerParamsData, outputParamsData, baseFormData]);

  return {
    handleDebuggerTool,
    debuggerJsonData,
    debugLoading,
    debuggerParamsData,
    setDebuggerParamsData,
  };
};
