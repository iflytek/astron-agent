/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:08:50
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:08:59
 * @Description: 插件广场详情页
 */
import React, { ReactElement, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message } from 'antd';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getToolDetail } from '@/services/tool';
import { debugTool } from '@/services/plugin';
import ToolInputParametersDetail from '@/components/plugin-store/tool-input-parameters-detail';
import ToolOutputParametersDetail from '@/components/plugin-store/tool-output-parameters-detail';
import JsonMonacoEditor from '@/components/monaco-editor/json-monaco-editor'; // TODO：等W.oic提交json-monaco-editor
import { MCPDetail } from '@/components/workflow/nodes/agent/components/add-tool/components/mcp-detail'; // TODO：等吴启提交custom-node
import DebuggerTable from '@/components/plugin-store/debugger-table';
import { cloneDeep } from 'lodash';
import { DebugInput, ToolDetail, DebugToolParams } from '@/types/plugin-store';

import arrowLeft from '@/assets/svgs/icon-zhishi-arrow-left.svg';
import offical from '@/assets/svgs/offical.svg';
import references from '@/assets/svgs/references.svg';
import favorite from '@/assets/svgs/favorite.svg';
import selectFavorite from '@/assets/svgs/select-favorite.png';

//弹框
const PrivacyModal = (props: {
  setModal: (modal: boolean) => void;
}): ReactElement => {
  const { setModal } = props;
  const { t } = useTranslation();
  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[400px]">
        <div className="text-lg font-medium text-second">
          {t('common.storePlugin.privacyStatement')}
        </div>
        <p className="mt-3 text-sm">
          {t('common.storePlugin.developerStatement')}
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            className="px-[48px]"
            onClick={() => setModal(false)}
          >
            {t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

//详情页
const PluginStoreDetail: React.FC = (): ReactElement => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isMcp = searchParams?.get('isMcp') === 'true' ? true : false;
  const navigate = useNavigate();
  const [toolInfo, setToolInfo] = useState<ToolDetail>({} as ToolDetail);
  const [modal, setModal] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('details');
  const [debuggerParamsData, setDebuggerParamsData] = useState<DebugInput[]>(
    []
  );
  const [debuggerJsonData, setDebuggerJsonData] = useState<string>('');
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  const inputParamsData = useMemo(() => {
    return (
      (toolInfo.webSchema &&
        JSON.parse(toolInfo.webSchema)?.toolRequestInput) ||
      []
    );
  }, [toolInfo]);

  const outputParamsData = useMemo(() => {
    const webSchema = toolInfo.webSchema && JSON.parse(toolInfo.webSchema);
    return webSchema?.toolRequestOutput || [];
  }, [toolInfo]);
  /**
   * 验证调试参数
   * @param data 调试参数
   * @returns 验证结果
   */
  const validateDebuggerTransformedData = (
    data: DebugInput[]
  ): { validatedData: DebugInput[]; flag: boolean } => {
    let flag = true;
    const validate = (items: DebugInput[]): DebugInput[] => {
      const newItems = items.map((item: DebugInput) => {
        // 校验当前项的 name 字段是否为空
        if (item?.type !== 'object' && item?.type !== 'array') {
          if (
            item?.required &&
            item?.type === 'string' &&
            !item?.default?.toString().trim()
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
        if (Array.isArray(item?.children)) {
          item.children = validate(item.children);
        }
        return item;
      });
    };
    const validatedData = validate(data);
    return { validatedData, flag };
  };

  /**
   * 检查调试参数表格
   * @returns 是否有效
   */
  const checkDebuggerParmasTable = (): boolean => {
    const { validatedData, flag } =
      validateDebuggerTransformedData(debuggerParamsData);
    setDebuggerParamsData(cloneDeep(validatedData));
    return flag;
  };

  /**
   * 调试工具
   */
  const handleDebuggerTool = (): void => {
    const flag = checkDebuggerParmasTable();
    if (!flag) {
      message.warning(t('plugin.requiredParameterNotFilled'));
      return;
    }
    setDebugLoading(true);
    const params: DebugToolParams = {
      id: toolInfo.id,
      name: toolInfo.name,
      description: toolInfo.description,
      endPoint: toolInfo.endPoint,
      authType: toolInfo.authType,
      method: toolInfo.method,
      visibility: toolInfo.visibility || 0,
      creationMethod: 1,
      webSchema: JSON.stringify({
        toolRequestInput: debuggerParamsData,
        toolRequestOutput: outputParamsData,
      }),
    };
    if (toolInfo?.authType === 2) {
      params.authInfo = JSON.stringify({
        location: toolInfo.location,
        parameterName: toolInfo.parameterName,
        serviceToken: toolInfo.serviceToken,
      });
    }
    debugTool(params)
      .then((res: unknown) => {
        if ((res as { code: number }).code === 0) {
          //TODO: 等W.oic提交json-monaco-editor
          setDebuggerJsonData(
            JSON.stringify(res as { data: unknown }, null, 2)
          );
          message.success((res as { message: string }).message);
        } else {
          //TODO: 等W.oic提交json-monaco-editor
          setDebuggerJsonData(
            JSON.stringify(
              {
                code: (res as { code: number }).code,
                message: (res as { message: string }).message,
              },
              null,
              2
            )
          );
          message.error((res as { message: string }).message);
        }
      })
      .finally(() => setDebugLoading(false));
  };

  /**
   * 返回
   */
  const goBack = (): void => {
    const newParams = new URLSearchParams();

    Array.from(searchParams.entries()).forEach(([key, value]) => {
      if (key !== 'isMcp') {
        newParams.append(key, value);
      }
    });

    navigate(`/store/plugin?${newParams.toString()}`);
  };

  useEffect(() => {
    if (!isMcp) {
      getToolDetail({
        id: id || '',
      }).then((data: ToolDetail) => {
        setToolInfo(data);
        setDebuggerParamsData(
          JSON.parse(data?.webSchema)?.toolRequestInput || []
        );
      });
    }
  }, []);

  return isMcp ? (
    <div
      className="h-full flex flex-col overflow-hidden mx-auto pb-6 gap-6 max-w-[1425px]"
      style={{
        width: '85%',
      }}
    >
      <div
        className="flex items-center gap-3 py-6 text-base font-medium cursor-pointer"
        onClick={goBack}
      >
        <img src={arrowLeft} width={18} className="" alt="" />
        <span>{t('common.storePlugin.pluginDetails')}</span>
      </div>
      <div className="p-6 pr-0 w-full rounded-2xl bg-[#fff] flex-1 overflow-hidden">
        <div className="w-full h-full pr-6 overflow-scroll">
          <MCPDetail currentTool={toolInfo} />
        </div>
      </div>
    </div>
  ) : (
    <div
      className="h-full flex flex-col mx-auto pb-6 gap-2.5 max-w-[1425px] overflow-hidden"
      style={{
        width: '85%',
      }}
    >
      {modal && <PrivacyModal setModal={setModal} />}
      <div className="flex justify-between w-full gap-2 py-5 overflow-hidden">
        <div
          className="flex items-center flex-1 gap-3 text-base font-medium cursor-pointer"
          onClick={goBack}
        >
          <img src={arrowLeft} width={18} className="" alt="" />
          <span>{t('common.storePlugin.pluginDetails')}</span>
        </div>
        <div className="flex-shrink-0 text-desc">
          {t('common.publishedAt')} {toolInfo?.updateTime}
        </div>
      </div>
      <div className="p-6 pr-0 w-full rounded-2xl bg-[#fff] flex-1 overflow-hidden">
        <div className="h-full pr-6 overflow-scroll">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <img src={toolInfo.icon} className="w-[72px] h-[72px]" alt="" />
              <div className="flex flex-col gap-6">
                <span className="text-2xl font-semibold">{toolInfo?.name}</span>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-1 text-[#757575] text-sm">
                    <img src={offical} className="w-6 h-6" alt="" />
                    <div className="flex items-center">
                      <span>{t('common.storePlugin.xingchenOfficial')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={references}
                      className="w-[15px] h-[15px]"
                      alt=""
                    />
                    <div className="text-sm text-[#757575]">
                      <span className="text-[#6356EA]">
                        {toolInfo?.botUsedCount}
                      </span>{' '}
                      {t('common.storePlugin.references')}
                    </div>
                  </div>
                  {/* <div
                    className="flex items-center gap-2"
                  >
                    <img
                      src={toolInfo.isFavorite ? selectFavorite : favorite}
                      className="w-[15px] h-[15px]"
                      alt=""
                    />
                    <div className="text-sm text-[#757575]">
                      <span className="text-[#6356EA]">
                        {toolInfo?.favoriteCount}
                      </span>{' '}
                      {t('common.storePlugin.favorites')}
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start justify-between py-6 border-b border-[#E2E8FF]">
            <p>{toolInfo?.description}</p>
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {t('common.pluginParameters')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm text-[#6356EA] cursor-pointer"
                  onClick={() =>
                    setCurrentTab(currentTab === 'debug' ? 'details' : 'debug')
                  }
                >
                  {currentTab === 'debug'
                    ? t('plugin.details')
                    : t('plugin.debug')}
                </span>
                <span
                  className="text-sm text-[#6356EA] cursor-pointer"
                  onClick={() => setModal(true)}
                >
                  {t('common.storePlugin.privacyStatement')}
                </span>
              </div>
            </div>
            {currentTab === 'details' && (
              <>
                <div className="mt-5 mb-3 text-xs font-medium">
                  {t('common.inputParameters')}
                </div>
                <ToolInputParametersDetail inputParamsData={inputParamsData} />
                <div className="mt-5 mb-3 text-xs font-medium">
                  {t('common.outputParameters')}
                </div>
                <ToolOutputParametersDetail
                  outputParamsData={outputParamsData}
                />
              </>
            )}
            {currentTab === 'debug' && (
              <div>
                <DebuggerTable
                  showTitle={false}
                  debuggerParamsData={debuggerParamsData}
                  setDebuggerParamsData={setDebuggerParamsData}
                />
                <div className="w-full flex items-center justify-between mt-6">
                  <span className="text-base font-medium">
                    {t('plugin.debugResult')}
                  </span>
                  <Button
                    loading={debugLoading}
                    type="primary"
                    className="flex items-center w-[80px] gap-1.5 text-[#6356EA] cursor-pointer"
                    onClick={handleDebuggerTool}
                    style={{
                      height: '36px',
                    }}
                  >
                    <span>{t('plugin.debug')}</span>
                  </Button>
                </div>
                <div className="mt-6">
                  {/* TODO：等W.oic提交json-monaco-editor */}
                  <JsonMonacoEditor
                    className="tool-debugger-json"
                    value={debuggerJsonData}
                    options={{
                      readOnly: true,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginStoreDetail;
