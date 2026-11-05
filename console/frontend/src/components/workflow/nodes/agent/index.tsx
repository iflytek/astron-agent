import type { AddressItem } from '@/components/workflow/types/nodes/agent';
import type { WorkflowNodeData } from '@/components/workflow/types/domain';

type AgentEditorContext = NodePropsFor<
  'id' | 'data' | 'handleChangeNodeParam'
> & {
  addressList: AddressItem[];
  orderToolsList: ToolItem[];
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleToolChange: (tool: ToolItem) => void;
  handleUpdateTool: (tool: ToolItem) => void;
  handleChangeAddress: (id: string, value: string) => void;
  handleAddAddress: (event: React.MouseEvent<HTMLElement>) => void;
  handleRemoveAddress: (id: string) => void;
};
type AgentPropsFor<Key extends keyof AgentEditorContext> = Pick<
  AgentEditorContext,
  Key
>;

function editablePlugin(data: WorkflowNodeData) {
  const previous = data.nodeParam.plugin;
  const plugin = {
    ...previous,
    toolsList: previous?.toolsList ?? [],
    tools: previous?.tools ?? [],
    knowledge: previous?.knowledge ?? [],
    skills: previous?.skills ?? [],
  };
  data.nodeParam.plugin = plugin;
  return plugin;
}

import type {
  NodeComponentProps,
  NodeDataProps,
} from '@/components/workflow/nodes/types';
import type { NodePropsFor } from '@/components/workflow/nodes/types';
import React, { useMemo, useState, useEffect, memo } from 'react';
import {
  FlowSelect,
  FlowTemplateEditor,
  FLowCollapse,
  FlowInput,
  FlowInputNumber,
} from '@/components/workflow/ui';
import { Alert, Select, Tooltip } from 'antd';
import { listAgents, type AgentDefinition } from '@/services/agents';
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
import { ToolItem } from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

export const Agent = memo(({ data }: NodeDataProps) => {
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
        {data.nodeParam.agentId
          ? '引用 Agent'
          : t('workflow.nodes.agentNode.agentStrategy')}
      </div>
      <span>
        {data.nodeParam.agentId
          ? data.nodeParam.agentName || `Agent #${data.nodeParam.agentId}`
          : agentStrategyName}
      </span>
    </>
  );
});

const AgentReferenceSection = ({
  data,
  handleChangeNodeParam,
}: NodePropsFor<'data' | 'handleChangeNodeParam'>): React.ReactElement => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const disabled = useFlowsManager(state => state.canvasesDisabled);
  useEffect(() => {
    let ignore = false;
    const fetchAll = async (): Promise<void> => {
      const items: AgentDefinition[] = [];
      let page = 1;
      while (true) {
        const result = await listAgents({ page, pageSize: 100 });
        items.push(...result.records);
        if (items.length >= result.total || !result.records.length) break;
        page += 1;
      }
      if (!ignore) setAgents(items);
    };
    void fetchAll()
      .catch(() => {
        if (!ignore) setError('无法读取 Agent 列表');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);
  return (
    <section className="p-4 bg-[#f8faff] rounded-md">
      <label className="block mb-2 font-medium">引用独立 Agent</label>
      <Select
        className="w-full"
        aria-label="引用独立 Agent"
        allowClear
        showSearch
        optionFilterProp="label"
        loading={loading}
        disabled={disabled}
        placeholder="使用节点内联配置"
        value={data.nodeParam.agentId}
        options={agents.map(agent => ({
          value: agent.id,
          label: `${agent.botName} (${agent.publishedVersionId ? `版本 ${agent.publishedVersionId}` : '未发布'})`,
        }))}
        onChange={(value: number | undefined) =>
          handleChangeNodeParam((node, id) => {
            node.nodeParam.agentId = id;
            node.nodeParam.agentName = agents.find(
              agent => agent.id === id
            )?.botName;
          }, value)
        }
      />
      {error && <Alert type="error" message={error} className="mt-2" />}
      {data.nodeParam.agentId && (
        <p className="mt-2 text-xs text-gray-600">
          新运行使用最新已发布版本；本次运行、重试和恢复固定该版本。未发布草稿不会生效。
        </p>
      )}
    </section>
  );
};

const AgentStrategySection = ({
  data,
  handleChangeNodeParam,
}: NodePropsFor<'data' | 'handleChangeNodeParam'>): React.ReactElement => {
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
                (data, value) =>
                  (data.nodeParam.modelConfig = {
                    ...data.nodeParam.modelConfig,
                    agentStrategy: value,
                  }),
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
}: AgentPropsFor<
  'orderToolsList' | 'setShowModal' | 'handleToolChange' | 'handleUpdateTool'
>): React.ReactElement => {
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
                          : tool?.type === 'skill'
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
                        : tool?.type === 'skill'
                          ? 'Skill'
                          : t('workflow.nodes.agentNode.mcpServer')}
                  </div>
                  {tool?.isLatest === false && (
                    <div
                      className="bg-[#1FC92D] flex items-center gap-1 cursor-pointer ml-2"
                      style={{
                        padding: '2px 15px 2px 2px',
                        borderRadius: '10px',
                      }}
                      onClick={() => handleUpdateTool(tool)}
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
                      handleToolChange(tool);
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
}: AgentPropsFor<
  | 'addressList'
  | 'handleChangeAddress'
  | 'handleAddAddress'
  | 'handleRemoveAddress'
>): React.ReactElement => {
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
              {item?.value?.trim() && !isValidURL(item.value) && (
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
}: NodePropsFor<
  'id' | 'data' | 'handleChangeNodeParam'
>): React.ReactElement => {
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
          {!data.nodeParam.agentId && (
            <>
              <div className="mb-4">
                {t('workflow.nodes.agentNode.roleSetting')}
              </div>
              <FlowTemplateEditor
                id={id}
                data={data}
                value={data?.nodeParam?.instruction?.answer}
                onChange={value =>
                  handleChangeNodeParam(
                    (data, value) =>
                      (data.nodeParam.instruction = {
                        ...data.nodeParam.instruction,
                        answer: value,
                      }),
                    value
                  )
                }
                placeholder={t(
                  'workflow.nodes.agentNode.thinkingStepsPlaceholder'
                )}
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
                    (data, value) =>
                      (data.nodeParam.instruction = {
                        ...data.nodeParam.instruction,
                        reasoning: value,
                      }),
                    value
                  )
                }
                placeholder={t(
                  'workflow.nodes.agentNode.thinkingStepsPlaceholder'
                )}
              />
            </>
          )}
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
                (data, value) =>
                  (data.nodeParam.instruction = {
                    ...data.nodeParam.instruction,
                    query: value,
                  }),
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
}: NodePropsFor<'data' | 'handleChangeNodeParam'>): React.ReactElement => {
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
              (data, value) => (data.nodeParam.maxLoopCount = value),
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
              (data, value) => (data.nodeParam.maxLoopCount = value),
              value
            )
          }
          onBlur={() => {
            if (data?.nodeParam?.maxLoopCount === null) {
              handleChangeNodeParam(
                (data, value) => (data.nodeParam.maxLoopCount = value),
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
              (data, value) => (data.nodeParam.maxLoopCount = value),
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
}: AgentPropsFor<'addressList' | 'id' | 'data' | 'handleChangeNodeParam'>) => {
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
      (data, value) => (editablePlugin(data).mcpServerUrls = value),
      addressList?.map(item => item?.value)
    );
  });

  const handleAddAddress = useMemoizedFn((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const newAddressList = [...addressList, { id: uuid(), value: '' }];
    handleChangeNodeParam(
      (data, value) => (editablePlugin(data).mcpServerUrls = value),
      newAddressList?.map(item => item?.value)
    );
  });

  const handleRemoveAddress = useMemoizedFn((id: string) => {
    const newAddressList = addressList.filter(item => item?.id !== id);
    handleChangeNodeParam(
      (data, value) => (editablePlugin(data).mcpServerUrls = value),
      newAddressList?.map(item => item?.value)
    );
  });

  const handleToolChange = useMemoizedFn((tool: ToolItem) => {
    autoSaveCurrentFlow();
    setNode(id, old => {
      const plugin = editablePlugin(old.data);
      const findTool = plugin.toolsList?.find(
        item =>
          item.toolId === tool.toolId ||
          item?.match?.repoIds?.[0] === tool?.toolId
      );
      if (!findTool) {
        if (tool?.type === 'mcp') {
          (plugin.mcpServerIds ??= []).push(tool.toolId);
        } else if (tool?.type === 'tool') {
          plugin.tools.push({
            tool_id: tool.toolId,
            version: tool.version || 'V1.0',
          });
        } else if (tool?.type === 'knowledge') {
          if (plugin.knowledge) {
            plugin.knowledge.push({
              name: tool?.name,
              description: tool?.description ?? '',
              topK: 3,
              match: {
                repoIds: [tool?.toolId],
              },
              repoType: tool?.tag === 'CBG-RAG' ? 2 : 3,
            });
          } else {
            plugin.knowledge = [
              {
                name: tool?.name,
                description: tool?.description ?? '',
                topK: 3,
                match: {
                  repoIds: [tool?.toolId],
                },
                repoType: tool?.tag === 'CBG-RAG' ? 2 : 3,
              },
            ];
          }
        } else if (tool?.type === 'skill') {
          if (plugin.skills) {
            plugin.skills.push({
              skillId: tool?.toolId,
              name: tool?.name,
              description: tool?.description || '',
            });
          } else {
            plugin.skills = [
              {
                skillId: tool?.toolId,
                name: tool?.name,
                description: tool?.description || '',
              },
            ];
          }
        }
        plugin.toolsList.push({
          toolId: tool?.toolId,
          name: tool?.name,
          type: tool?.type,
          icon: tool?.icon,
          tag: tool?.tag,
        });
      } else {
        if (findTool?.type === 'mcp') {
          plugin.mcpServerIds = (plugin.mcpServerIds || []).filter(
            item => item !== tool?.toolId
          );
        } else if (findTool?.type === 'tool') {
          plugin.tools = plugin.tools.filter(
            item =>
              (typeof item === 'string' ? item : item.tool_id) !== tool.toolId
          );
        } else if (findTool?.type === 'knowledge') {
          plugin.knowledge = plugin.knowledge.filter(
            item => item?.match?.repoIds?.[0] !== tool?.toolId
          );
        } else if (findTool?.type === 'skill') {
          plugin.skills = plugin.skills.filter(
            item => item?.skillId !== tool?.toolId
          );
        }
        plugin.toolsList = plugin.toolsList.filter(
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
      ...toolsList.filter(item => item?.type === 'skill'),
      ...toolsList.filter(item => item?.type === 'tool'),
      ...toolsList.filter(item => item?.type === 'mcp'),
    ];
  }, [toolsList]);

  const handleUpdateTool = useMemoizedFn((tool: ToolItem) => {
    getToolLatestVersion([tool.toolId]).then(data => {
      setNode(id, old => {
        const plugin = editablePlugin(old.data);
        const newTools = plugin.tools?.filter(
          item =>
            (typeof item === 'string' ? item : item.tool_id) !== tool.toolId
        );
        const currentTool = plugin.toolsList?.find(
          item => item?.toolId === tool?.toolId
        );
        newTools.push({
          tool_id: tool?.toolId,
          version: data?.[tool?.toolId || ''] || 'V1.0',
        });
        plugin.tools = newTools;
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

export const AgentDetail = memo((props: NodeComponentProps) => {
  const { id, data } = props;
  const { handleChangeNodeParam } = useNodeCommon({
    id,
    data,
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
          <AgentReferenceSection
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
          {!data.nodeParam.agentId && (
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
          )}
          <Inputs id={id} data={data} />
          {!data.nodeParam.agentId && (
            <>
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
              {!!data.nodeParam.plugin?.configuredMcpCount && (
                <div className="px-4 py-2 text-xs text-gray-600">
                  保留 {data.nodeParam.plugin.configuredMcpCount} 个旧 MCP
                  绑定。修改其他工具不会替换它们。
                  <button
                    type="button"
                    className="ml-2 text-[#6356EA]"
                    onClick={() =>
                      handleChangeNodeParam(node => {
                        const plugin = editablePlugin(node);
                        plugin.mcpServerIds = [];
                        plugin.mcpServerUrls = [];
                        plugin.configuredMcpCount = 0;
                      }, undefined)
                    }
                  >
                    清除旧 MCP 绑定
                  </button>
                </div>
              )}
              <McpAddressSection
                addressList={addressList}
                handleChangeAddress={handleChangeAddress}
                handleRemoveAddress={handleRemoveAddress}
                handleAddAddress={handleAddAddress}
              />
            </>
          )}
          <PromptSection
            id={id}
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
          {!data.nodeParam.agentId && (
            <LoopCountSection
              data={data}
              handleChangeNodeParam={handleChangeNodeParam}
            />
          )}
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
