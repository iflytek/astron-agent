import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { Input, Button, Spin } from 'antd';
import { useDebounce, useMemoizedFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { getAgentPromptList } from '@/services/prompt';
import { isJSON } from '@/utils';
import { useTranslation } from 'react-i18next';
import {
  AgentPromptItem,
  useSelectPromptType,
} from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

const PromptList = ({
  loading,
  dataSource,
  currentTemplateId,
  setCurrentTemplateId,
}): React.ReactElement => {
  return (
    <>
      {!loading && dataSource?.length > 0 && (
        <div className="w-full flex flex-col gap-2 h-[336px] overflow-auto pr-1">
          {dataSource?.map(item => (
            <div
              key={item?.id}
              className="flex flex-col gap-2 rounded-lg px-4 py-[14px] cursor-pointer"
              onClick={() => setCurrentTemplateId(item?.id)}
              style={{
                border:
                  currentTemplateId === item?.id
                    ? '1px solid #6356EA'
                    : '1px solid #E4EAFF',
                backgroundColor:
                  currentTemplateId === item?.id ? '#f8faff' : 'transparent',
              }}
            >
              <h4
                className="text-sm font-medium"
                style={{
                  color: currentTemplateId === item?.id ? '#6356EA' : '#333',
                }}
              >
                {item?.name}
              </h4>
              <p className="text-xs text-[#666]">{item?.description}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const PromptDetail = ({
  loading,
  currentTemplateId,
  currentTemplate,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      {!loading && currentTemplateId && (
        <div className="flex-1 flex flex-col gap-4 rounded-lg border-[1px] h-[400px] border-[#E4EAFF] px-4">
          <div className="flex items-center py-2 border-b-[1px] border-[#E4EAFF]">
            <div>{t('workflow.promptDebugger.adaptationModel')}</div>
            <img
              src={currentTemplate?.modelInfo?.icon}
              className="w-[24px] h-[24px]"
              alt=""
            />
            <div>{currentTemplate?.modelInfo?.name}</div>
          </div>
          <div className="flex-1 overflow-auto text-xs flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="text-[#6356EA]">
                {t('workflow.promptDebugger.roleSettingLabel')}
              </div>
              <div>{currentTemplate?.characterSettings}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[#6356EA]">
                {t('workflow.promptDebugger.thinkingStepsLabel')}
              </div>
              <div>{currentTemplate?.thinkStep}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[#6356EA]">
                {t('workflow.promptDebugger.userQueryLabel')}
              </div>
              <div>{currentTemplate?.userQuery}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const useSelectPrompt = (): useSelectPromptType => {
  const setUpdateNodeInputData = useFlowsManager(
    state => state.setUpdateNodeInputData
  );
  const selectAgentPromptModalInfo = useFlowsManager(
    state => state.selectAgentPromptModalInfo
  );
  const setSelectAgentPromptModalInfo = useFlowsManager(
    state => state.setSelectAgentPromptModalInfo
  );
  const [dataSource, setDataSource] = useState<AgentPromptItem[]>([]);
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('');
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const setNode = currentStore(state => state.setNode);
  const debouncedValue = useDebounce(value, { wait: 500 });

  useEffect(() => {
    setLoading(true);

    const params = {
      current: 1,
      pageSize: 999,
      search: debouncedValue,
    };

    getAgentPromptList(params)
      .then((res: unknown) => {
        setDataSource(
          res?.pageData?.map((item: unknown) => ({
            ...item,
            publishTime: dayjs(item?.commitTime).format('YYYY-MM-DD HH:mm:ss'),
            modelInfo: isJSON(item?.adaptationModel)
              ? JSON.parse(item?.adaptationModel)
              : {},
          }))
        );
        setCurrentTemplateId(res?.pageData?.[0]?.id);
      })
      .finally(() => setLoading(false));
  }, [debouncedValue]);
  const currentTemplate = useMemo(() => {
    const res = dataSource?.find(item => item?.id === currentTemplateId);
    return {
      ...res,
      modelInfo: isJSON(res?.adaptationModel || '')
        ? JSON.parse(res?.adaptationModel || '{}')
        : {},
    };
  }, [dataSource, currentTemplateId]);
  const handleAddTemplateDataToNode = useMemoizedFn(() => {
    const inputs =
      currentTemplate?.inputs?.map(item => ({
        schema: {
          type: 'string',
          value: {
            type: 'ref',
            content: {},
          },
        },
        name: item?.name,
        id: uuid(),
      })) || [];
    const currentInputsName =
      currentTemplate?.inputs?.map(item => item?.name) || [];
    setNode(selectAgentPromptModalInfo?.nodeId, old => {
      const data = old?.data;
      const value = currentTemplate?.modelInfo;
      data.nodeParam.instruction.answer = currentTemplate?.characterSettings;
      data.nodeParam.instruction.reasoning = currentTemplate?.thinkStep;
      data.nodeParam.instruction.query = currentTemplate?.userQuery;
      data.inputs = [
        ...old.data.inputs.filter(
          item => !currentInputsName.includes(item?.name)
        ),
        ...inputs,
      ];
      data.nodeParam.llmId = value?.llmId;
      data.nodeParam.domain = value?.domain;
      data.nodeParam.serviceId = value?.serviceId;
      data.nodeParam.patchId = value?.patchId;
      data.nodeParam.url = value?.url;
      data.nodeParam.modelId = value?.id;
      data.nodeParam.isThink = value?.isThink;
      data.nodeParam.maxLoopCount = currentTemplate?.maxLoopCount;
      if (value.provider) {
        data.nodeParam.source = value.provider;
      } else if (value.llmSource === 0) {
        data.nodeParam.source = 'openai';
      } else {
        delete data.nodeParam.source;
      }
      return {
        ...cloneDeep(old),
      };
    });
    updateNodeRef(selectAgentPromptModalInfo?.nodeId);
    setSelectAgentPromptModalInfo({
      open: false,
      nodeId: '',
    });
    setTimeout(() => {
      setUpdateNodeInputData(updateNodeInputData => !updateNodeInputData);
    });
  });
  return {
    dataSource,
    setDataSource,
    value,
    setValue,
    loading,
    setLoading,
    currentTemplateId,
    setCurrentTemplateId,
    handleAddTemplateDataToNode,
    currentTemplate,
  };
};

function SelectAgentPrompt(): React.ReactElement {
  const { t } = useTranslation();
  const selectAgentPromptModal = useFlowsManager(
    state => state.selectAgentPromptModalInfo?.open
  );
  const setSelectAgentPromptModalInfo = useFlowsManager(
    state => state.setSelectAgentPromptModalInfo
  );
  const {
    dataSource,
    value,
    setValue,
    loading,
    currentTemplateId,
    setCurrentTemplateId,
    handleAddTemplateDataToNode,
    currentTemplate,
  } = useSelectPrompt();

  return (
    <>
      {selectAgentPromptModal
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1002,
              }}
            >
              <div className="modal-container w-[880px] pr-0 text-sm h-[570px]">
                <div className="flex items-center justify-between font-medium pr-6">
                  <span className="font-semibold text-base">
                    {t('workflow.promptDebugger.promptLibraryTitle')}
                  </span>
                  <img
                    src={Icons.selectAgentPrompt.close}
                    className="w-3 h-3 cursor-pointer"
                    alt=""
                    onClick={() =>
                      setSelectAgentPromptModalInfo({
                        open: false,
                        nodeId: '',
                      })
                    }
                  />
                </div>
                <div className="flex gap-4 pr-6 mt-[14px]">
                  <div className="flex flex-col items-center gap-6 w-[250px]">
                    <div className="relative pr-1">
                      <img
                        src={Icons.selectAgentPrompt.search}
                        className="w-4 h-4 absolute left-[14px] top-[13px] z-10"
                        alt=""
                      />
                      <Input
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setValue(e.target.value)
                        }
                        className="w-[250px] pl-10 h-10 global-input"
                        placeholder={t('workflow.nodes.toolNode.pleaseEnter')}
                      />
                    </div>
                    <PromptList
                      loading={loading}
                      dataSource={dataSource}
                      currentTemplateId={currentTemplateId}
                      setCurrentTemplateId={setCurrentTemplateId}
                    />
                  </div>
                  <PromptDetail
                    loading={loading}
                    currentTemplateId={currentTemplateId}
                    currentTemplate={currentTemplate}
                  />
                </div>
                {loading && (
                  <div className="h-[360px] w-full flex items-center justify-center">
                    <Spin spinning={loading} />
                  </div>
                )}
                {!loading && dataSource?.length === 0 && (
                  <div className="h-[360px] w-full flex flex-col items-center justify-center gap-2">
                    <img
                      src={Icons.selectAgentPrompt.knowledgeListEmpty}
                      className="w-[100px] h-[100px]"
                      alt=""
                    />
                    <div className="text-sm text-[#999]">
                      {t('workflow.nodes.toolNode.noData')}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-4 mt-10 pr-6">
                  <Button
                    type="text"
                    className="origin-btn px-[24px]"
                    onClick={() =>
                      setSelectAgentPromptModalInfo({
                        open: false,
                        nodeId: '',
                      })
                    }
                  >
                    {t('workflow.promptDebugger.cancel')}
                  </Button>
                  <Button
                    type="primary"
                    disabled={!currentTemplateId}
                    className="px-[24px]"
                    onClick={handleAddTemplateDataToNode}
                  >
                    {t('workflow.nodes.variableMemoryNode.add')}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default SelectAgentPrompt;
