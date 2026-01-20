import React, { useMemo, useState, memo } from 'react';
import {
  FlowSelect,
  FlowTemplateEditor,
  FLowCollapse,
  FlowInput,
  FlowInputNumber,
} from '@/components/workflow/ui';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import Inputs from '../components/inputs';
import Outputs from '../components/outputs';
import ModelSelect from './components/model-select';
import AddTools from './components/add-tool';
import ExceptionHandling from '../components/exception-handling';
import { getToolLatestVersion } from '@/services/plugin';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { isValidURL } from '@/components/workflow/utils/reactflowUtils';
import {
  AgentProps,
  AgentDetailProps,
  ToolItem,
  UseAgentReturn,
} from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

export const Agent = memo(({ data }: AgentProps) => {
  const { t } = useTranslation();
  const agentStrategy = useFlowsManager(state => state.agentStrategy);

  const agentStrategyName = useMemo(() => {
    return agentStrategy?.find(
      item => item?.code === data?.nodeParam?.modelConfig?.agentStrategy
    )?.name;
  }, [data?.nodeParam?.modelConfig?.agentStrategy, agentStrategy]);

  return (
    <>
      <div className="text-[#333] text-right">
        {t('workflow.nodes.agentNode.agentStrategy')}
      </div>
      <span>{agentStrategyName}</span>
    </>
  );
});

const AgentStrategySection = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const agentStrategy = useFlowsManager(state => state.agentStrategy);

  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <div className="text-base font-medium flex items-center">
            <span>{t('workflow.nodes.agentNode.agentStrategy')}</span>
          </div>
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3 pointer-events-auto">
          <FlowSelect
            value={data?.nodeParam?.modelConfig?.agentStrategy}
            onChange={value =>
              handleChangeNodeParam(
                (data: unknown, value: unknown) =>
                  (data.nodeParam.modelConfig.agentStrategy = value),
                value
              )
            }
          >
            {agentStrategy?.map(item => (
              <FlowSelect.Option key={item?.code} value={item?.code}>
                <div className="flex items-center gap-1">
                  <div className="text-xs">{item?.name}</div>
                  <Tooltip
                    title={item?.description}
                    overlayClassName="black-tooltip"
                  >
                    <img src={Icons.agent.questionMark} width={12} alt="" />
                  </Tooltip>
                </div>
              </FlowSelect.Option>
            ))}
          </FlowSelect>
        </div>
      }
    />
  );
};

const PluginSection = ({
  orderToolsList,
  setShowModal,
  handleToolChange,
  handleUpdateTool,
}): React.ReactElement => {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <div className="text-base font-medium flex items-center gap-1">
            <span>{t('workflow.nodes.agentNode.pluginList')}</span>
            <Tooltip
              title={t('workflow.nodes.common.pluginLimitTip')}
              overlayClassName="black-tooltip"
            >
              <img src={Icons.agent.questionMark} width={12} alt="" />
            </Tooltip>
          </div>
          <div
            className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5 pl-6"
            onClick={e => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <img src={Icons.agent.inputAddIcon} className="w-3 h-3" alt="" />
            <span>{t('workflow.nodes.agentNode.addPlugin')}</span>
          </div>
        </div>
      }
      content={
        <div>
          <div className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-2 max-h-[300px] overflow-auto">
            {orderToolsList.map(tool => (
              <div
                key={tool.id}
                className="py-2 px-2.5 bg-[#fff] flex items-center gap-2.5 rounded-md"
              >
                <div className="flex-1 flex items-center">
                  {/* <img src={tool?.type === 'tool' ? toolIcon : (tool?.icon || mcpIcon)} className='w-7 h-7' alt="" /> */}
                  <img
                    src={
                      tool?.type === 'tool'
                        ? Icons.agent.toolIcon
                        : tool?.type === 'knowledge'
                          ? Icons.agent.knowledgeIcon
                          : tool?.icon
                    }
                    className="w-7 h-7"
                    alt=""
                  />
                  <p
                    className="text-overflow text-sm font-medium ml-2"
                    title={tool.name}
                  >
                    {tool.name}
                  </p>
                  <div className="bg-[#F0F0F0] rounded py-1 px-2 text-xs ml-4">
                    {tool?.type === 'tool'
                      ? t('workflow.nodes.agentNode.tool')
                      : tool?.type === 'knowledge'
                        ? t('workflow.nodes.agentNode.knowledgeBase')
                        : t('workflow.nodes.agentNode.mcpServer')}
                  </div>
                  {tool?.isLatest === false && (
                    <div
                      className="bg-[#1FC92D] flex items-center gap-1 cursor-pointer ml-2"
                      style={{
                        padding: '2px 15px 2px 2px',
                        borderRadius: '10px',
                      }}
                      onClick={() => handleUpdateTool(tool as unknown)}
                    >
                      <img
                        src={Icons.agent.oneClickUpdate}
                        className="w-[16px] h-[16px]"
                        alt=""
                      />
                      <span className="text-white text-xs">
                        {t('workflow.nodes.agentNode.update')}
                      </span>
                    </div>
                  )}
                </div>
                {!canvasesDisabled && (
                  <div
                    className="w-[18px] h-[18px] rounded-full bg-[#F7F7F7] flex items-center justify-center cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      handleToolChange(tool as unknown);
                    }}
                  >
                    <img
                      src={Icons.agent.knowledgeListDelete}
                      className="w-1.5 h-1.5"
                      alt=""
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
};

const McpAddressSection = ({
  addressList,
  handleChangeAddress,
  handleAddAddress,
  handleRemoveAddress,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <div className="text-base font-medium flex items-center gap-1">
            <span>{t('workflow.nodes.agentNode.customMcpServerAddress')}</span>
            <Tooltip
              title={t('workflow.nodes.common.mcpServerTip')}
              overlayClassName="black-tooltip"
            >
              <img src={Icons.agent.questionMark} width={12} alt="" />
            </Tooltip>
          </div>
          {addressList?.length < 3 && (
            <div
              className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5 pl-6"
              onClick={handleAddAddress}
            >
              <img src={Icons.agent.inputAddIcon} className="w-3 h-3" alt="" />
              <span>{t('workflow.nodes.agentNode.addAddress')}</span>
            </div>
          )}
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-2">
          {addressList.map((item, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <FlowInput
                  className="flex-1"
                  placeholder={t('workflow.nodes.agentNode.mcpServerConfig')}
                  value={item?.value}
                  onChange={e => handleChangeAddress(item?.id, e.target.value)}
                />
                {addressList?.length > 1 && (
                  <img
                    src={Icons.agent.remove}
                    className="w-[16px] h-[17px] cursor-pointer"
                    alt=""
                    onClick={() => handleRemoveAddress(item?.id)}
                  />
                )}
              </div>
              {item?.value?.trim() && !isValidURL(item?.value) && (
                <div className="text-[#FF4D4F] text-xs font-medium">
                  {t('workflow.nodes.agentNode.invalidUrl')}
                </div>
              )}
            </div>
          ))}
        </div>
      }
    />
  );
};

const PromptSection = ({
  id,
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const setSelectAgentPromptModalInfo = useFlowsManager(
    state => state.setSelectAgentPromptModalInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            {t('workflow.nodes.agentNode.prompt')}
          </h4>
          {!canvasesDisabled && (
            <div
              className="flex items-center gap-1 cursor-pointer text-[#6356EA] text-xs"
              onClick={() =>
                setSelectAgentPromptModalInfo({
                  open: true,
                  nodeId: id,
                })
              }
            >
              <img
                src={Icons.agent.promptLibraryIcon}
                className="w-[14px] h-[14px]"
                alt=""
              />
              <span>{t('workflow.nodes.agentNode.promptLibrary')}</span>
            </div>
          )}
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3 pointer-events-auto">
          <div className="mb-4">
            {t('workflow.nodes.agentNode.roleSetting')}
          </div>
          <FlowTemplateEditor
            id={id}
            data={data}
            value={data?.nodeParam?.instruction?.answer}
            onChange={value =>
              handleChangeNodeParam(
                (data: unknown, value: unknown) =>
                  (data.nodeParam.instruction.answer = value),
                value
              )
            }
            placeholder={t('workflow.nodes.agentNode.thinkingStepsPlaceholder')}
          />
          <div className="my-4">
            {t('workflow.nodes.agentNode.thinkingSteps')}
          </div>
          <FlowTemplateEditor
            id={id}
            data={data}
            onBlur={() => delayCheckNode(id)}
            value={data?.nodeParam?.instruction?.reasoning}
            onChange={value =>
              handleChangeNodeParam(
                (data: unknown, value: unknown) =>
                  (data.nodeParam.instruction.reasoning = value),
                value
              )
            }
            placeholder={t('workflow.nodes.agentNode.thinkingStepsPlaceholder')}
          />
          <div className="my-4">
            <span className="text-[#F74E43] text-lg font-medium h-5">*</span>
            <span>{t('workflow.nodes.agentNode.userQuery')}</span>
          </div>
          <FlowTemplateEditor
            id={id}
            data={data}
            onBlur={() => delayCheckNode(id)}
            value={data?.nodeParam?.instruction?.query}
            onChange={value =>
              handleChangeNodeParam(
                (data: unknown, value: unknown) =>
                  (data.nodeParam.instruction.query = value),
                value
              )
            }
            placeholder={t('workflow.nodes.agentNode.userPromptPlaceholder')}
          />
          <p className="text-xs text-[#F74E43]">
            {data?.nodeParam?.instruction?.queryErrMsg}
          </p>
        </div>
      }
    />
  );
};

const LoopCountSection = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="bg-[#f8faff] px-[18px] py-2.5 rounded-md flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="text-base font-medium">
          {t('workflow.nodes.agentNode.maxLoopCount')}
        </div>
        <Tooltip
          title={t('workflow.nodes.agentNode.maxLoopCountTip')}
          getPopupContainer={triggerNode =>
            triggerNode?.parentNode as HTMLElement
          }
        >
          <img
            src={Icons.agent.questionMark}
            className="w-[14px] h-[14px]"
            alt=""
          />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-[15px] h-[15px] flex justify-center items-center"
          onClick={() =>
            handleChangeNodeParam(
              (data: unknown, value: unknown) =>
                (data.nodeParam.maxLoopCount = value),
              (data.nodeParam?.maxLoopCount || 1) - 1 > 0
                ? (data.nodeParam?.maxLoopCount || 1) - 1
                : 1
            )
          }
        >
          <img
            src={Icons.agent.zoomOutIcon}
            className="w-[15px] h-[2px] cursor-pointer"
            alt=""
          />
        </div>
        <FlowInputNumber
          value={data?.nodeParam?.maxLoopCount}
          onChange={value =>
            handleChangeNodeParam(
              (data: unknown, value: unknown) =>
                (data.nodeParam.maxLoopCount = value),
              value
            )
          }
          onBlur={() => {
            if (data?.nodeParam?.maxLoopCount === null) {
              handleChangeNodeParam(
                (data: unknown, value: unknown) =>
                  (data.nodeParam.maxLoopCount = value),
                10
              );
            }
          }}
          min={1}
          max={100}
          precision={0}
          className="nodrag w-[50px]"
          controls={false}
        />
        <div
          className="w-[15px] h-[15px]"
          onClick={() =>
            handleChangeNodeParam(
              (data: unknown, value: unknown) =>
                (data.nodeParam.maxLoopCount = value),
              (data.nodeParam?.maxLoopCount || 1) + 1 <= 100
                ? (data.nodeParam?.maxLoopCount || 1) + 1
                : 100
            )
          }
        >
          <img
            src={Icons.agent.zoomInIcon}
            className="w-[15px] h-[16px] cursor-pointer"
            alt=""
          />
        </div>
      </div>
    </div>
  );
};

const useAgent = ({
  addressList,
  id,
  data,
  handleChangeNodeParam,
}): UseAgentReturn => {
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setNode = currentStore(state => state.setNode);
  const toolsList = useMemo(() => {
    return data?.nodeParam?.plugin?.toolsList || [];
  }, [data]);

  const handleChangeAddress = useMemoizedFn((id: string, value: string) => {
    const currentAddress = addressList?.find(item => item?.id === id);
    if (currentAddress) {
      currentAddress.value = value;
    }
    handleChangeNodeParam(
      (data: unknown, value: unknown) =>
        (data.nodeParam.plugin.mcpServerUrls = value),
      addressList?.map(item => item?.value)
    );
  });

  const handleAddAddress = useMemoizedFn(e => {
    e.stopPropagation();
    const newAddressList = [...addressList, { id: uuid(), value: '' }];
    handleChangeNodeParam(
      (data: unknown, value: unknown) =>
        (data.nodeParam.plugin.mcpServerUrls = value),
      newAddressList?.map(item => item?.value)
    );
  });

  const handleRemoveAddress = useMemoizedFn((id: string) => {
    const newAddressList = addressList.filter(item => item?.id !== id);
    handleChangeNodeParam(
      (data: unknown, value: unknown) =>
        (data.nodeParam.plugin.mcpServerUrls = value),
      newAddressList?.map(item => item?.value)
    );
  });

  const handleToolChange = useMemoizedFn((tool: ToolItem) => {
    autoSaveCurrentFlow();
    setNode(id, (old: unknown) => {
      const findTool = old.data.nodeParam?.plugin?.toolsList?.find(
        item =>
          item.toolId === tool.toolId ||
          item?.match?.repoIds?.[0] === tool?.toolId
      );
      if (!findTool) {
        if (tool?.type === 'mcp') {
          old.data.nodeParam.plugin.mcpServerIds.push(tool.toolId);
        } else if (tool?.type === 'tool') {
          old.data.nodeParam.plugin.tools.push({
            tool_id: tool.toolId,
            version: tool.version || 'V1.0',
          });
        } else if (tool?.type === 'knowledge') {
          if (old.data.nodeParam.plugin?.knowledge) {
            old.data.nodeParam.plugin.knowledge.push({
              name: tool?.name,
              description: tool?.description,
              topK: 3,
              match: {
                repoIds: [tool?.toolId],
              },
              repoType: tool?.tag === 'CBG-RAG' ? 2 : 3,
            });
          } else {
            old.data.nodeParam.plugin.knowledge = [
              {
                name: tool?.name,
                description: tool?.description,
                topK: 3,
                match: {
                  repoIds: [tool?.toolId],
                },
                repoType: tool?.tag === 'CBG-RAG' ? 2 : 3,
              },
            ];
          }
        }
        old.data.nodeParam.plugin.toolsList.push({
          toolId: tool?.toolId,
          name: tool?.name,
          type: tool?.type,
          icon: tool?.icon,
          tag: tool?.tag,
        });
      } else {
        if (findTool?.type === 'mcp') {
          old.data.nodeParam.plugin.mcpServerIds =
            old.data.nodeParam.plugin.mcpServerIds.filter(
              item => item !== tool?.toolId
            );
        } else if (findTool?.type === 'tool') {
          old.data.nodeParam.plugin.tools =
            old.data.nodeParam.plugin.tools.filter(
              item =>
                item !== tool?.toolId && item?.['tool_id'] !== tool?.toolId
            );
        } else if (findTool?.type === 'knowledge') {
          old.data.nodeParam.plugin.knowledge =
            old.data.nodeParam.plugin.knowledge.filter(
              item => item?.match?.repoIds?.[0] !== tool?.toolId
            );
        }
        old.data.nodeParam.plugin.toolsList =
          old.data.nodeParam.plugin.toolsList.filter(
            item => item?.toolId !== tool?.toolId
          );
      }
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  });

  const orderToolsList = useMemo(() => {
    return [
      ...toolsList.filter(item => item?.type === 'knowledge'),
      ...toolsList.filter(item => item?.type === 'tool'),
      ...toolsList.filter(item => item?.type === 'mcp'),
    ];
  }, [toolsList]);

  const handleUpdateTool = useMemoizedFn((tool: ToolItem) => {
    getToolLatestVersion(tool?.toolId).then((data: unknown) => {
      setNode(id, (old: unknown) => {
        const newTools = old?.data?.nodeParam?.plugin?.tools?.filter(
          (item: unknown) =>
            item?.tool_id !== tool?.toolId && item !== tool?.toolId
        );
        const currentTool = old?.data?.nodeParam?.plugin?.toolsList?.find(
          (item: unknown) => item?.toolId === tool?.toolId
        );
        newTools.push({
          tool_id: tool?.toolId,
          version: data?.[tool?.toolId || ''] || 'V1.0',
        });
        old.data.nodeParam.plugin.tools = newTools;
        if (currentTool) {
          currentTool.isLatest = true;
          if (currentTool?.pluginName) {
            currentTool.name = currentTool?.pluginName;
          }
        }
        return cloneDeep(old);
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    });
  });

  return {
    toolsList,
    orderToolsList,
    handleChangeNodeParam,
    handleToolChange,
    handleUpdateTool,
    handleChangeAddress,
    handleRemoveAddress,
    handleAddAddress,
  };
};

export const AgentDetail = memo((props: AgentDetailProps) => {
  const { id, data } = props;
  const { handleChangeNodeParam } = useNodeCommon({
    id,
    data: data as unknown,
  });
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState<boolean>(false);

  const addressList = useMemo(() => {
    if (data?.nodeParam?.plugin?.mcpServerUrls?.length === 0) {
      return [
        {
          id: uuid(),
          value: '',
        },
      ];
    }
    return (
      data?.nodeParam?.plugin?.mcpServerUrls?.map((item: string) => ({
        id: uuid(),
        value: item,
      })) || []
    );
  }, [data]);

  const {
    toolsList,
    orderToolsList,
    handleToolChange,
    handleUpdateTool,
    handleChangeAddress,
    handleRemoveAddress,
    handleAddAddress,
  } = useAgent({
    addressList,
    id,
    data,
    handleChangeNodeParam,
  });

  return (
    <div>
      {showModal && (
        <AddTools
          id={id}
          closeToolModal={() => {
            setShowModal(false);
          }}
          handleAddTool={handleToolChange}
          toolsList={toolsList}
        />
      )}
      <div className="p-[14px] pb-[6px]">
        <div className="bg-[#fff] rounded-lg w-full flex flex-col gap-2.5">
          <FLowCollapse
            label={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium">
                  {t('workflow.nodes.largeModelNode.model')}
                </h2>
              </div>
            }
            content={
              <div className="rounded-md px-[18px] pb-3">
                <ModelSelect id={id} data={data} />
              </div>
            }
          />
          <Inputs id={id} data={data} />
          <AgentStrategySection
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
          <PluginSection
            orderToolsList={orderToolsList}
            setShowModal={setShowModal}
            handleToolChange={handleToolChange}
            handleUpdateTool={handleUpdateTool}
          />
          <McpAddressSection
            addressList={addressList}
            handleChangeAddress={handleChangeAddress}
            handleRemoveAddress={handleRemoveAddress}
            handleAddAddress={handleAddAddress}
          />
          <PromptSection
            id={id}
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
          <LoopCountSection
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
          <Outputs id={id} data={data}>
            <div className="flex-1 flex items-center justify-between">
              <div className="text-base font-medium">
                {t('workflow.nodes.agentNode.output')}
              </div>
            </div>
          </Outputs>
          <ExceptionHandling id={id} data={data} />
        </div>
      </div>
    </div>
  );
});
