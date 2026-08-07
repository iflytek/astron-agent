import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { getMcpServerList as getMcpServerListAPI } from '@/services/plugin';
import { Tooltip } from 'antd';
import { throttle } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import {
  Table,
  PrimaryBtn,
  SecondaryBtn,
  EmptyState,
  BackToNavigation,
} from '@/components/ui';
import {
  McpItem,
  McpTabType,
  McpOperateType,
  useAddMcpType,
} from '@/components/workflow/types';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import { useMemoizedFn } from 'ahooks';
import { NodeType } from '@/components/workflow/types/zustand/flow';
import MCPDetail from '@/components/workflow/nodes/agent/components/add-tool/components/mcp-detail';

import arrowDown from '@/assets/imgs/mcp/mcp-arrow-down.svg';

const LeftNav = ({
  currentTab,
  handleChangeTab,
  closeMCPModal,
}: {
  currentTab: McpTabType;
  handleChangeTab: (tab: McpTabType) => void;
  closeMCPModal: () => void;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="w-[240px] h-full bg-[#f8faff] px-4 py-6 flow-tool-modal-left">
      <BackToNavigation
        onClick={() => closeMCPModal()}
        text={t('mcp.addMCP')}
      />
      <div className="mt-5">
        <div
          className={`create-tool-tab-normal ${
            currentTab === 'offical' ? 'create-tool-tab-active' : ''
          }`}
          onClick={() => handleChangeTab('offical')}
        >
          <i className="offical"></i>
          <span>{t('workflow.nodes.toolNode.officialTools')}</span>
        </div>
      </div>
    </div>
  );
};

const McpList = ({
  setToolOperate,
  loading,
  dataSource,
  expandedKeys,
  setExpandedKeys,
  setCurrentMcpInfo,
  renderParamsTooltip,
  toolsNode,
}: {
  setToolOperate: (toolOperate: McpOperateType) => void;
  loading: boolean;
  dataSource: McpItem[];
  expandedKeys: string[];
  setExpandedKeys: (expandedKeys: string[]) => void;
  setCurrentMcpInfo: (currentMcpInfo: McpItem) => void;
  renderParamsTooltip: (data: McpItem) => React.ReactNode;
  toolsNode: NodeType[];
}): React.ReactElement => {
  const { t } = useTranslation();
  const { handleAddMcpNode } = useFlowCommon();

  const onExpand = record => {
    const isExpanded = expandedKeys.includes(record.key);

    if (isExpanded) {
      setExpandedKeys(expandedKeys.filter(k => k !== record.key));
    } else {
      setExpandedKeys([...expandedKeys, record.key]);
    }
  };

  const handleAddMCPNodeThrottle = useMemoizedFn(
    throttle(tool => {
      handleAddMcpNode(tool);
    }, 1000)
  );

  const columns = [
    {
      title: t('workflow.nodes.toolNode.tool'),
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => {
        return (
          <div className="w-full flex items-center gap-[12px] overflow-hidden">
            <img
              src={item?.icon}
              className="w-[40px] h-[40px] rounded"
              alt=""
            />
            <div className="flex flex-col gap-1 overflow-hidden">
              <div className="font-semibold">{item?.name}</div>
              <p
                className="text-[#757575] text-xs text-overflow max-w-[40vw]"
                title={item?.description}
              >
                {item?.description}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      width: 160,
      title: t('workflow.nodes.toolNode.publishTime'),
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      width: 100,
      title: t('workflow.nodes.toolNode.parameters'),
      dataIndex: 'params',
      key: 'params',
      render: (_, item) => {
        return (
          <div
            style={{
              height: '22px',
              lineHeight: '22px',
              padding: '0 8px',
              borderRadius: '4px',
              backgroundColor: '#F1F4FA',
              color: '#676773',
              display: 'inline-flex',
            }}
          >
            {`${t('workflow.nodes.toolNode.type')}${item?.tools?.length}`}
          </div>
        );
      },
    },
    {
      width: 200,
      title: t('workflow.nodes.toolNode.operation'),
      dataIndex: 'operation',
      key: 'operation',
      render: (_, record) => {
        const isOpen = expandedKeys.includes(record.key);
        return (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center justify-center w-[20px] h-[20px] cursor-pointer"
              onClick={e => {
                e.stopPropagation();
                onExpand(record);
              }}
            >
              <span className="text-blue-500">
                <img
                  src={arrowDown}
                  style={{
                    transform: !isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                  className="w-3.5 h-3.5"
                  alt=""
                />
              </span>
            </div>
          </div>
        );
      },
    },
  ];
  const subColumns = [
    {
      title: t('workflow.nodes.toolNode.tool'),
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => {
        return (
          <div className="w-full flex items-center gap-[12px] overflow-hidden pl-2">
            <div className="w-[40px] h-[40px] pr-2"></div>
            <div className="flex flex-col gap-1 overflow-hidden">
              <div className="font-semibold">{item?.name}</div>
              <p
                className="text-[#757575] text-xs text-overflow max-w-[40vw]"
                title={item?.description}
              >
                {item?.description}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      width: 160,
      title: t('workflow.nodes.toolNode.publishTime'),
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      width: 100,
      title: t('workflow.nodes.toolNode.parameters'),
      dataIndex: 'params',
      key: 'params',
      render: (_, item) => {
        return (
          <div>
            {item?.args?.length > 0 ? (
              <Tooltip
                placement="right"
                title={renderParamsTooltip(item)}
                overlayClassName="white-tooltip tool-params-tooltip"
              >
                <div className="w-fit text-[#6356EA] text-sm font-medium bg-[#EFEEFC] px-2 py-1 rounded">
                  {t('workflow.nodes.toolNode.parameters')}
                </div>
              </Tooltip>
            ) : (
              <span className="w-1 h-1"></span>
            )}
          </div>
        );
      },
    },
    {
      width: 200,
      title: t('workflow.nodes.toolNode.operation'),
      dataIndex: 'operation',
      key: 'operation',
      render: (_, record) => {
        return (
          <div className="flex items-center gap-2">
            <SecondaryBtn
              text={t('workflow.nodes.toolNode.test')}
              onClick={() => {
                const tool = dataSource.find(
                  item => item.key === record.parentId
                );
                setCurrentMcpInfo({
                  ...tool,
                  name: record.name,
                  description: record.description,
                  icon: '',
                  updateTime: '',
                  childName: record.name,
                });
                setToolOperate('mcpDetail');
              }}
            />
            <PrimaryBtn
              className="w-[76px]"
              text={
                t('workflow.nodes.common.add') +
                (toolsNode.filter(
                  toolnode =>
                    toolnode?.data?.nodeParam?.toolName === record.name &&
                    toolnode?.data?.nodeParam?.mcpServerId === record.sparkId
                )?.length > 0
                  ? toolsNode.filter(
                      toolnode =>
                        toolnode?.data?.nodeParam?.toolName === record.name &&
                        toolnode?.data?.nodeParam?.mcpServerId ===
                          record.sparkId
                    )?.length
                  : '')
              }
              onClick={() => {
                const tool = dataSource.find(
                  item => item.key === record.parentId
                );
                handleAddMCPNodeThrottle({
                  ...tool,
                  key: record.key,
                  args: record.args,
                  name: record.name,
                  description: record.description,
                });
              }}
            />
          </div>
        );
      },
    },
  ];

  const expandedRowRender = record => {
    return (
      <Table
        showHeader={false}
        columns={subColumns}
        dataSource={record?.tools}
        pagination={false}
        rowKey={record => record?.key}
        tableLayout="fixed"
      />
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="h-full mx-auto"
        style={{
          width: '90%',
          minWidth: 1000,
        }}
      >
        <Table
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          rowClassName={() => 'cursor-pointer'}
          rowKey={record => record?.key}
          onRow={record => {
            return {
              onClick: () => {
                setCurrentMcpInfo({
                  ...record,
                });
                setToolOperate('mcpDetail');
              },
            };
          }}
          expandable={{
            expandedRowRender,
            expandedRowKeys: expandedKeys,
            expandIcon: () => null,
          }}
          locale={{
            emptyText: <EmptyState description={t('mcp.noSearchResults')} />,
          }}
        />
      </div>
    </div>
  );
};

const useAddMcp = (): useAddMcpType => {
  const { handleAddToolNode, resetBeforeAndWillNode } = useFlowCommon();
  const setMcpModalInfo = useFlowsManager(state => state.setMcpModalInfo);
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const nodes = currentStore(state => state.nodes);
  const [dataSource, setDataSource] = useState<McpItem[]>([]);
  const [currentTab, setCurrentTab] = useState<McpTabType>('offical');
  const [toolOperate, setToolOperate] = useState<McpOperateType>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentMcpInfo, setCurrentMcpInfo] = useState<McpItem>({
    name: '',
    description: '',
    icon: '',
    updateTime: '',
    childName: '',
  });
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  function transformSchemaToArray(schema) {
    const requiredFields = schema.required || [];

    return Object.entries(schema.properties || []).map(([name, property]) => {
      return {
        id: uuid(),
        name,
        type: property.type,
        description: property.description,
        required: requiredFields.includes(name),
        enum: property.enum,
      };
    });
  }

  function getMcpServerList(): void {
    setLoading(true);
    getMcpServerListAPI()
      .then(data => {
        const newData = data?.map(item => {
          const key = uuid();
          return {
            ...item,
            key,
            toolId: item['spark_id'],
            description: item?.brief,
            icon: item['logo_url'],
            updateTime: dayjs(item['create_time'])?.format(
              'YYYY-MM-DD HH:mm:ss'
            ),
            isMcp: true,
            tools: item?.tools?.map(tool => ({
              ...tool,
              key: uuid(),
              parentId: key,
              sparkId: item['spark_id'],
              args: tool.inputSchema
                ? transformSchemaToArray(tool.inputSchema)
                : [],
            })),
          };
        });
        setDataSource(newData);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function renderParamsTooltip(data) {
    return (
      <div>
        <div className="text-base font-semibold">{data?.name}</div>
        <p className="text-desc mt-1">{data?.description}</p>
        <div className="mt-3">
          {data?.args?.map(item => (
            <div
              key={item?.key}
              className="flex flex-col gap-1.5 py-2.5 border-t border-[#F2F2F2]"
            >
              <div className="flex items-center gap-2.5 text-sm">
                <div>{item?.name}</div>
                <div className="text-desc">{item?.type}</div>
              </div>
              <p className="text-desc">{item?.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleAddToolNodeThrottle = useCallback(
    throttle((tool: McpItem) => {
      handleAddToolNode(tool);
    }, 1000),
    [nodes]
  );

  const handleClearMCPData = (): void => {
    setToolOperate('');
  };

  const handleChangeTab = (tab: McpTabType): void => {
    setCurrentTab(tab);
    handleClearMCPData();
  };

  const closeMCPModal = () => {
    setMcpModalInfo({ open: false });
    resetBeforeAndWillNode();
  };

  const toolsNode = useMemo(() => {
    return nodes?.filter(node => node?.nodeType === 'mcp');
  }, [nodes]);

  return {
    currentTab,
    setCurrentTab,
    toolOperate,
    setToolOperate,
    handleAddToolNodeThrottle,
    loading,
    setLoading,
    dataSource,
    setDataSource,
    handleClearMCPData,
    handleChangeTab,
    currentMcpInfo,
    setCurrentMcpInfo,
    getMcpServerList,
    renderParamsTooltip,
    toolsNode,
    closeMCPModal,
    expandedKeys,
    setExpandedKeys,
  };
};

const AddMcp = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    currentTab,
    handleClearMCPData,
    handleChangeTab,
    currentMcpInfo,
    setCurrentMcpInfo,
    toolOperate,
    setToolOperate,
    loading,
    dataSource,
    getMcpServerList,
    renderParamsTooltip,
    toolsNode,
    closeMCPModal,
    expandedKeys,
    setExpandedKeys,
  } = useAddMcp();
  const mcpModalInfo = useFlowsManager(state => state.mcpModalInfo);

  useEffect(() => {
    getMcpServerList();
  }, []);

  return (
    <>
      {mcpModalInfo?.open
        ? createPortal(
            <div
              className="mask w-full h-full"
              style={{
                zIndex: 1001,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-[#fff] text-second font-medium text-md flex w-full h-full overflow-hidden">
                <LeftNav
                  currentTab={currentTab}
                  handleChangeTab={handleChangeTab}
                  closeMCPModal={closeMCPModal}
                />
                <div
                  className="flex-1 h-full bg-[#FFF] overflow-hidden"
                  style={{
                    padding: '26px 0 43px',
                  }}
                >
                  {!toolOperate && (
                    <div className="h-full flex flex-col gap-5 overflow-hidden">
                      <div
                        className="mx-auto"
                        style={{
                          width: '90%',
                          minWidth: 1000,
                        }}
                      >
                        <h2 className="astron-h2-title">
                          {t('workflow.nodes.mcpNode.officalMcp')}
                        </h2>
                      </div>
                      <McpList
                        loading={loading}
                        dataSource={dataSource}
                        setToolOperate={setToolOperate}
                        expandedKeys={expandedKeys}
                        setExpandedKeys={setExpandedKeys}
                        setCurrentMcpInfo={setCurrentMcpInfo}
                        renderParamsTooltip={renderParamsTooltip}
                        toolsNode={toolsNode}
                      />
                    </div>
                  )}
                  {toolOperate === 'mcpDetail' && (
                    <MCPDetail
                      currentTool={currentMcpInfo}
                      handleClearMCPToolDetail={handleClearMCPData}
                    />
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default AddMcp;
