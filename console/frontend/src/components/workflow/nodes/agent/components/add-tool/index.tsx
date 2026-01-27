import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import {
  listTools,
  listToolSquare,
  getMcpServerList as getMcpServerListAPI,
} from '@/services/plugin';
import { Button, Select, Spin, Tooltip, message } from 'antd';
import { FlowInput } from '@/components/workflow/ui';
import { debounce, throttle } from 'lodash';
import dayjs from 'dayjs';
import { isJSON } from '@/utils';
import { capitalizeFirstLetter } from '@/components/workflow/utils/reactflowUtils';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import DeletePlugin from '@/components/workflow/modal/add-plugin/delete-plugin';
import {
  CreateTool,
  ToolDebugger,
  ToolDetail,
} from '@/components/modal/plugin';
import MCPDetail from './components/mcp-detail';
import KnowledgeList from './components/knowledge-list';
import { configListRepos } from '@/services/knowledge';
import { useTranslation } from 'react-i18next';
import { useAddPluginType } from '@/components/workflow/types';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import search from '@/assets/imgs/knowledge/icon_zhishi_search.png';
import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import flowBackIcon from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import toolOperateMore from '@/assets/imgs/workflow/tool-operate-more.png';

const useToolData = ({
  setPagination,
  loader,
  loadingRef,
  hasMore,
  contentRef,
  setDataSource,
  setHasMore,
  orderFlag,
  orderBy,
  setLoading,
  toolRef,
  pagination,
  dataSource,
  currentTab,
  setStep,
}): void => {
  useEffect((): void | (() => void) => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        setPagination(pagination => ({
          ...pagination,
          pageNo: pagination?.pageNo + 1,
        }));
      }
    });
    if (loader.current) {
      observer.observe(loader.current);
    }
    return (): void => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [hasMore]);
  function renderTitle(param): React.ReactElement {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span>{param?.title}</span>
          <div className="bg-[#F0F0F0] py-1 px-2.5 rounded">
            {capitalizeFirstLetter(param?.type)}
          </div>
        </div>
        <p className="text-desc">{param?.description}</p>
      </div>
    );
  }
  function handleModifyToolUrlParams(toolRequestInput): unknown[] {
    const toolRequestOutputTreeData = [];
    toolRequestInput.forEach(item => {
      toolRequestOutputTreeData.push({
        title: renderTitle(item),
        key: item.key,
      });
    });
    return toolRequestOutputTreeData;
  }
  function getPersonTools(): void {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setLoading(true);
    loadingRef.current = true;
    const params = {
      ...pagination,
      content: contentRef?.current,
      status: 1,
    };
    listTools(params)
      .then(data => {
        const newData = data?.pageData.map(item => ({
          ...item,
          params: handleModifyToolUrlParams(
            (isJSON(item?.webSchema) &&
              JSON.parse(item.webSchema)?.toolRequestInput) ||
              []
          ),
        }));
        setDataSource(dataSource => [...dataSource, ...newData]);
        if (20 + dataSource?.length < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }

  function getOfficalTools(): void {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setLoading(true);
    loadingRef.current = true;
    const params = {
      ...pagination,
      orderFlag,
      content: contentRef?.current,
    };
    listToolSquare(params)
      .then(data => {
        const newData = data?.pageData.map(item => ({
          ...item,
          params: handleModifyToolUrlParams(
            (isJSON(item?.webSchema) &&
              JSON.parse(item.webSchema)?.toolRequestInput) ||
              []
          ),
        }));
        setDataSource(dataSource => [...dataSource, ...newData]);
        if (20 + dataSource?.length < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }

  function getKnowledgesList(): void {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setLoading(true);
    loadingRef.current = true;
    const params = {
      pageNo: 1,
      pageSize: 999,
      content: contentRef?.current,
      orderBy,
    };
    configListRepos(params)
      .then(data => {
        const newData = data?.pageData
          ?.filter(item => item?.tag !== 'SparkDesk-RAG')
          ?.map(item => ({
            ...item,
            toolId: item['server_url'],
            icon: item['logo_url'],
            updateTime: dayjs(item?.updateTime)?.format('YYYY-MM-DD HH:mm:ss'),
            createTime: dayjs(item?.createTime)?.format('YYYY-MM-DD HH:mm:ss'),
          }));
        setDataSource(() => [...newData]);
        setHasMore(false);
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }

  function getMcpServerList(): void {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setLoading(true);
    loadingRef.current = true;
    getMcpServerListAPI()
      .then(data => {
        const newData = data?.map(item => ({
          ...item,
          toolId: item['server_url'],
          description: item?.brief,
          icon: item['logo_url'],
          updateTime: dayjs(item['create_time'])?.format('YYYY-MM-DD HH:mm:ss'),
          isMcp: true,
        }));
        setDataSource(dataSource => [...dataSource, ...newData]);
        setHasMore(false);
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }
  useEffect(() => {
    if (currentTab) {
      setStep(1);
      if (currentTab === 'person') {
        getPersonTools();
      } else if (currentTab === 'offical') {
        getOfficalTools();
      } else if (currentTab === 'mcp') {
        getMcpServerList();
      } else if (currentTab === 'knowledge') {
        getKnowledgesList();
      }
    }
  }, [currentTab, orderFlag, pagination, orderBy]);
};

const useAddPlugin = ({
  checkedIds,
  nodes,
  currentTab,
  toolRef,
  setHasMore,
  setLoading,
  setDataSource,
  setPagination,
  contentRef,
  handleAddTool,
  orderFlag,
  setSearchValue,
  searchValue,
}): useAddPluginType => {
  const { t } = useTranslation();
  const handleCheckTool = useCallback(
    throttle((tool): unknown => {
      if (!checkedIds.includes(tool.toolId) && checkedIds?.length >= 30) {
        message.warning(t('workflow.nodes.common.maxAddWarning'));
        return;
      }
      handleThrottleAddTool(tool);
    }, 1000),
    [nodes, currentTab, checkedIds]
  );
  const fetchDataDebounce = useCallback(
    debounce((value): void => {
      if (toolRef.current) {
        toolRef.current.scrollTop = 0;
      }
      setHasMore(false);
      setLoading(true);
      setDataSource(() => []);
      setPagination({
        pageNo: 1,
        pageSize: 20,
      });
      contentRef.current = value;
    }, 500),
    [currentTab, orderFlag, searchValue]
  );
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const query = event.target.value;
      setSearchValue(query);
      fetchDataDebounce(query);
    },
    [currentTab, orderFlag]
  );
  const handleThrottleAddTool = useCallback(
    (tool): unknown => {
      handleAddTool({
        ...tool,
        type: currentTab === 'mcp' ? 'mcp' : 'tool',
        icon: tool?.icon,
      });
    },
    [nodes, currentTab, checkedIds]
  );
  function renderParamsTooltip(data): React.ReactElement {
    const params =
      (isJSON(data?.webSchema) &&
        JSON.parse(data.webSchema)?.toolRequestInput) ||
      [];
    return (
      <div>
        <div className="text-base font-semibold">{data?.name}</div>
        <p className="mt-1 text-desc">{data?.description}</p>
        <div className="mt-3">
          {params?.map(item => (
            <div
              key={item?.id}
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
  return {
    handleInputChange,
    renderParamsTooltip,
    handleCheckTool,
  };
};

const LeftNav = ({
  closeToolModal,
  handleChangeTab,
  currentTab,
  setCurrentTab,
  setOperate,
  setCurrentToolInfo,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="w-[240px] h-full bg-[#f8faff] px-4 py-6 flow-tool-modal-left">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <img
          src={flowBackIcon}
          width={28}
          className="cursor-pointer"
          alt=""
          onClick={() => closeToolModal()}
        />
        <span>{t('workflow.nodes.toolNode.addTool')}</span>
      </div>
      <div className="flex flex-col gap-2 mt-6">
        <div
          className={`create-tool-tab-normal ${currentTab === 'person' || currentTab === 'offical' ? 'create-tool-tab-active' : ''}`}
        >
          <i className="tool"></i>
          <span className="mt-0.5">{t('workflow.nodes.toolNode.tool')}</span>
        </div>
        <div
          className={`create-tool-tab-normal-child ${currentTab === 'person' ? 'create-tool-tab-active-child' : ''}`}
          onClick={() => handleChangeTab('person')}
        >
          <i className="person"></i>
          <span className="mt-0.5">
            {t('workflow.nodes.toolNode.myCreated')}
          </span>
        </div>
        <div
          className={`create-tool-tab-normal-child ${currentTab === 'offical' ? 'create-tool-tab-active-child' : ''}`}
          onClick={() => handleChangeTab('offical')}
        >
          <i className="offical"></i>
          <span>{t('workflow.nodes.toolNode.officialTools')}</span>
        </div>
        <div
          className="create-tool-tab-normal-child create-tool-tab-active-child"
          onClick={e => {
            e.stopPropagation();
            setCurrentTab('');
            setOperate('create');
            setCurrentToolInfo({
              id: '',
            });
          }}
        >
          <i className="add-plugin"></i>
          <span>{t('workflow.nodes.toolNode.createTool')}</span>
        </div>
        <div
          className={`create-tool-tab-normal ${currentTab === 'mcp' ? 'create-tool-tab-active' : ''}`}
          onClick={() => handleChangeTab('mcp')}
        >
          <i className="mcp"></i>
          <span className="mt-0.5">MCP</span>
        </div>
        <div
          className={`create-tool-tab-normal ${currentTab === 'knowledge' ? 'create-tool-tab-active' : ''}`}
          onClick={() => handleChangeTab('knowledge')}
        >
          <i className="knowledge"></i>
          <span className="mt-0.5">
            {t('workflow.nodes.knowledgeNode.knowledgeBase')}
          </span>
        </div>
      </div>
    </div>
  );
};

const RightHeader = ({
  currentTab,
  orderFlag,
  setOrderFlag,
  setLoading,
  setDataSource,
  setPagination,
  searchValue,
  handleInputChange,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center justify-between mx-auto"
      style={{
        width: '90%',
        minWidth: 1000,
      }}
    >
      <div className="flex items-center justify-end w-full gap-4">
        {currentTab === 'offical' ? (
          <Select
            suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
            className="p-0"
            style={{ height: 32, width: 160 }}
            value={orderFlag}
            onChange={value => {
              setOrderFlag(value);
              setLoading(true);
              setDataSource([]);
              setPagination({
                pageNo: 1,
                pageSize: 20,
              });
            }}
            options={[
              {
                label: t('workflow.nodes.toolNode.mostPopular'),
                value: 0,
              },
              {
                label: t('workflow.nodes.toolNode.recentlyUsed'),
                value: 1,
              },
            ]}
          />
        ) : null}
        {currentTab !== 'mcp' && (
          <div className="relative">
            <img
              src={search}
              className="w-4 h-4 absolute left-[10px] top-[7px] z-10"
              alt=""
            />
            <FlowInput
              value={searchValue}
              className="w-[320px] pl-8 h-[32px] text-sm"
              placeholder={t('workflow.nodes.common.inputPlaceholder')}
              onChange={handleInputChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ListItem = ({
  item,
  currentTab,
  setCurrentToolInfo,
  setOperate,
  operateId,
  setOperateId,
  checkedIds,
  optionsRef,
  renderParamsTooltip,
  handleCheckTool,
  setCurrentTool,
  setDeleteModal,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div
      key={item.id}
      className="px-4 py-2.5 hover:bg-[#EBEBF1] cursor-pointer border-t border-[#E5E5EC]"
      onClick={() => {
        setCurrentToolInfo({
          ...item,
        });
        if (currentTab === 'mcp') {
          setOperate('mcpDetail');
        } else {
          setOperate('toolDetail');
        }
      }}
    >
      <div className="flex justify-between gap-[52px]">
        <div className="flex-1 flex items-center gap-[30px] overflow-hidden">
          {currentTab === 'mcp' ? (
            <img
              src={item?.icon}
              className="w-[40px] h-[40px] rounded"
              alt=""
            />
          ) : (
            <span
              className="flex items-center justify-center w-12 h-12 rounded rounded-lg"
              style={{
                background: item?.avatarColor
                  ? item?.avatarColor
                  : `url(${item?.icon}) no-repeat center / cover`,
              }}
            >
              {item?.avatarColor && (
                <img
                  src={item?.icon || ''}
                  className="w-[28px] h-[28px]"
                  alt=""
                />
              )}
            </span>
          )}
          <div className="flex flex-col flex-1 gap-1 overflow-hidden">
            <div className="font-semibold">{item?.name}</div>
            <p
              className="text-[#757575] text-xs text-overflow flex-1"
              title={item?.description}
            >
              {item?.description}
            </p>
          </div>
        </div>
        <div className="w-2/5 flex items-center justify-between min-w-[500px]">
          <div className="w-1/3 flex items-center gap-1.5 flex-shrink-0">
            <img src={publishIcon} className="w-3 h-3" alt="" />
            <p className="text-[#757575] text-xs">
              {t('workflow.nodes.toolNode.publishedAt')} {item?.updateTime}
            </p>
          </div>
          {item?.params?.length > 0 ? (
            <Tooltip
              placement="right"
              title={renderParamsTooltip(item)}
              overlayClassName="white-tooltip tool-params-tooltip"
            >
              <div className="flex items-center cursor-pointer gap-1.5 text-[#6356EA] text-sm font-medium">
                <span>{t('workflow.nodes.toolNode.parameters')}</span>
              </div>
            </Tooltip>
          ) : (
            <span className="w-1 h-1"></span>
          )}
          <div
            className="flex items-center gap-2.5 relative"
            onClick={e => e.stopPropagation()}
          >
            {currentTab !== 'mcp' && (
              <div
                className="flex items-center gap-1 bg-[#fff] border border-[#E5E5E5] py-1 px-6 rounded-lg hover:text-[#FFF] hover:bg-[#6356EA]"
                onClick={e => {
                  e.stopPropagation();
                  setCurrentToolInfo({
                    ...item,
                  });
                  setOperate('test');
                }}
              >
                {t('workflow.nodes.toolNode.test')}
              </div>
            )}
            <div onClick={() => handleCheckTool(item)}>
              {checkedIds.includes(item.toolId) ? (
                <div
                  className="border border-[#D3DBF8] bg-[#fff] py-1 px-6 rounded-lg"
                  style={{
                    height: '32px',
                  }}
                >
                  {t('workflow.nodes.relatedKnowledgeModal.remove')}
                </div>
              ) : (
                <Button
                  type="primary"
                  className="px-6"
                  style={{
                    height: 32,
                  }}
                >
                  {t('workflow.nodes.toolNode.addTool')}
                </Button>
              )}
            </div>
            <div
              ref={optionsRef}
              onClick={e => {
                e.stopPropagation();
                setOperateId(item?.id);
              }}
              className="h-[34px] flex items-center"
            >
              {currentTab === 'person' && (
                <img
                  src={toolOperateMore}
                  className="w-[17px] h-[3px] cursor-pointer"
                  alt=""
                />
              )}
              {operateId === item?.id && (
                <div
                  className="z-10 absolute top-2 right-0 p-1 bg-[#fff] rounded-lg"
                  style={{
                    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.08)',
                  }}
                >
                  <div
                    className="hover:bg-[#E6F4FF] w-[80px] rounded-md"
                    style={{
                      padding: '6px 0px 6px 10px',
                    }}
                    onClick={() => {
                      setCurrentToolInfo({
                        ...item,
                      });
                      setOperateId('');
                      setOperate('edit');
                    }}
                  >
                    {t('workflow.nodes.toolNode.edit')}
                  </div>
                  <div
                    className="hover:bg-[#E6F4FF] w-[80px] rounded-md"
                    style={{
                      padding: '6px 0px 6px 10px',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      setOperateId('');
                      setDeleteModal(true);
                      setCurrentTool(item);
                    }}
                  >
                    {t('workflow.nodes.toolNode.delete')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RightContent = ({
  id,
  operate,
  currentTab,
  dataSource,
  loading,
  hasMore,
  loader,
  toolRef,
  orderBy,
  setOrderBy,
  searchValue,
  handleInputChange,
  toolsList,
  handleAddTool,
  setCurrentToolInfo,
  setOperate,
  operateId,
  setOperateId,
  checkedIds,
  optionsRef,
  renderParamsTooltip,
  handleCheckTool,
  setCurrentTool,
  setDeleteModal,
  orderFlag,
  setOrderFlag,
  setLoading,
  setDataSource,
  setPagination,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      {!operate && ['person', 'offical', 'mcp']?.includes(currentTab) && (
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            padding: '26px 0 43px',
          }}
        >
          <div className="flex flex-col h-full overflow-hidden">
            <RightHeader
              currentTab={currentTab}
              orderFlag={orderFlag}
              setOrderFlag={setOrderFlag}
              setLoading={setLoading}
              setDataSource={setDataSource}
              setPagination={setPagination}
              searchValue={searchValue}
              handleInputChange={handleInputChange}
            />
            <div className="flex flex-col mt-4 gap-1.5 flex-1 overflow-hidden">
              <div
                className="flex items-center px-4 mx-auto font-medium"
                style={{
                  width: '90%',
                  minWidth: 1000,
                }}
              >
                <span className="flex-1">
                  {currentTab === 'mcp'
                    ? 'MCP'
                    : t('workflow.nodes.toolNode.tool')}
                </span>
                <span className="w-2/5 min-w-[500px]">
                  {t('workflow.nodes.toolNode.publishTime')}
                </span>
              </div>
              <div className="flex-1 overflow-auto" ref={toolRef}>
                <div
                  className="h-full mx-auto"
                  style={{
                    width: '90%',
                    minWidth: 1000,
                  }}
                >
                  {dataSource.map((item: unknown) => (
                    <ListItem
                      item={item}
                      currentTab={currentTab}
                      setCurrentToolInfo={setCurrentToolInfo}
                      setOperate={setOperate}
                      operateId={operateId}
                      setOperateId={setOperateId}
                      checkedIds={checkedIds}
                      optionsRef={optionsRef}
                      renderParamsTooltip={renderParamsTooltip}
                      handleCheckTool={handleCheckTool}
                      setCurrentTool={setCurrentTool}
                      setDeleteModal={setDeleteModal}
                    />
                  ))}
                  {loading && <Spin className="mt-2" size="large" />}
                  {hasMore && <div ref={loader}></div>}
                  {!loading && dataSource.length === 0 && (
                    <p
                      className="mx-auto mt-3"
                      style={{
                        width: '90%',
                        minWidth: 1000,
                      }}
                    >
                      {t('workflow.nodes.toolNode.noPlugins')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!operate && currentTab === 'knowledge' && (
        <KnowledgeList
          id={id}
          dataSource={dataSource}
          toolRef={toolRef}
          orderBy={orderBy}
          setOrderBy={setOrderBy}
          searchValue={searchValue}
          handleInputChange={handleInputChange}
          toolsList={toolsList}
          loading={loading}
          handleAddTool={handleAddTool}
        />
      )}
    </>
  );
};

const OperationContent = ({
  operate,
  currentToolInfo,
  handleClearData,
  handleClearMCPData,
  dataSource,
  handleChangeTab,
  step,
  setStep,
  botIcon,
  setBotIcon,
  botColor,
  setBotColor,
  currentTab,
  setOperate,
}): React.ReactElement => {
  return (
    <>
      {operate && (
        <>
          {['create', 'edit']?.includes(operate) && (
            <CreateTool
              currentToolInfo={currentToolInfo}
              handleCreateToolDone={() => handleChangeTab('person')}
              step={step}
              setStep={setStep}
              botIcon={botIcon}
              setBotIcon={setBotIcon}
              botColor={botColor}
              setBotColor={setBotColor}
            />
          )}
          {operate === 'test' && (
            <ToolDebugger
              currentToolInfo={currentToolInfo}
              handleClearData={() => handleClearData()}
              offical={currentTab === 'offical'}
            />
          )}
          {operate === 'toolDetail' && (
            <ToolDetail
              currentToolInfo={currentToolInfo}
              handleClearData={handleClearData}
              handleToolDebugger={() => setOperate('test')}
            />
          )}
          {operate === 'mcpDetail' && (
            <MCPDetail
              currentTool={currentToolInfo}
              handleClearMCPToolDetail={handleClearMCPData}
            />
          )}
        </>
      )}
    </>
  );
};

function AddTools({
  closeToolModal,
  handleAddTool,
  toolsList,
  id,
}): React.ReactElement {
  const loader = useRef<null | HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  const contentRef = useRef<string>('');
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const nodes = currentStore(state => state.nodes);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const toolRef = useRef<HTMLDivElement | null>(null);
  const [dataSource, setDataSource] = useState([]);
  const [currentTab, setCurrentTab] = useState('offical');
  const [operate, setOperate] = useState('');
  const [orderFlag, setOrderFlag] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentToolInfo, setCurrentToolInfo] = useState({});
  const [operateId, setOperateId] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [currentTool, setCurrentTool] = useState({});
  const [step, setStep] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pagination, setPagination] = useState({
    pageNo: 1,
    pageSize: 20,
  });
  const [botIcon, setBotIcon] = useState<unknown>({});
  const [botColor, setBotColor] = useState('');
  const [orderBy, setOrderBy] = useState('create_time');
  const checkedIds = useMemo(() => {
    return toolsList?.map(item => item?.toolId) || [];
  }, [toolsList]);
  useToolData({
    setPagination,
    loader,
    loadingRef,
    hasMore,
    contentRef,
    setDataSource,
    setHasMore,
    orderFlag,
    orderBy,
    setLoading,
    toolRef,
    pagination,
    dataSource,
    currentTab,
    setStep,
  });
  const { handleInputChange, renderParamsTooltip, handleCheckTool } =
    useAddPlugin({
      checkedIds,
      nodes,
      currentTab,
      toolRef,
      setHasMore,
      setLoading,
      setDataSource,
      setPagination,
      contentRef,
      handleAddTool,
      orderFlag,
      setSearchValue,
      searchValue,
    });

  useEffect(() => {
    if (['create', 'edit']?.includes(operate)) {
      setStep(1);
    }
  }, [operate]);
  const handleClearData = (): void => {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setHasMore(false);
    setOrderFlag(0);
    setOperate('');
    setLoading(true);
    setDataSource([]);
    setPagination({
      pageNo: 1,
      pageSize: 20,
    });
    setSearchValue('');
    contentRef.current = '';
  };
  const handleClearMCPData = (): void => {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setHasMore(false);
    setOperate('');
    setCurrentTab('mcp');
    setLoading(true);
    setDataSource([]);
    setPagination({
      pageNo: 1,
      pageSize: 20,
    });
    setSearchValue('');
    contentRef.current = '';
  };
  const handleChangeTab = (tab): void => {
    setCurrentTab(tab);
    handleClearData();
  };

  return (
    <>
      {createPortal(
        <div
          className="w-full h-full mask"
          style={{
            zIndex: 1001,
          }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {deleteModal && (
            <DeletePlugin
              currentTool={currentTool}
              setDeleteModal={setDeleteModal}
              getPersonTools={handleClearData}
            />
          )}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-[#fff] text-second font-medium text-md flex w-full h-full overflow-hidden"
            onClick={() => setOperateId('')}
          >
            <LeftNav
              closeToolModal={closeToolModal}
              handleChangeTab={handleChangeTab}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              setOperate={setOperate}
              setCurrentToolInfo={setCurrentToolInfo}
            />
            <div className="flex-1 h-full bg-[#F7F7FA] overflow-hidden">
              <RightContent
                id={id}
                operate={operate}
                currentTab={currentTab}
                dataSource={dataSource}
                loading={loading}
                hasMore={hasMore}
                loader={loader}
                toolRef={toolRef}
                orderBy={orderBy}
                setOrderBy={setOrderBy}
                searchValue={searchValue}
                handleInputChange={handleInputChange}
                toolsList={toolsList}
                handleAddTool={handleAddTool}
                setCurrentToolInfo={setCurrentToolInfo}
                setOperate={setOperate}
                operateId={operateId}
                setOperateId={setOperateId}
                checkedIds={checkedIds}
                optionsRef={optionsRef}
                renderParamsTooltip={renderParamsTooltip}
                handleCheckTool={handleCheckTool}
                setCurrentTool={setCurrentTool}
                setDeleteModal={setDeleteModal}
                orderFlag={orderFlag}
                setOrderFlag={setOrderFlag}
                setLoading={setLoading}
                setDataSource={setDataSource}
                setPagination={setPagination}
              />
              <OperationContent
                operate={operate}
                currentToolInfo={currentToolInfo}
                handleClearData={handleClearData}
                handleClearMCPData={handleClearMCPData}
                dataSource={dataSource}
                handleChangeTab={handleChangeTab}
                step={step}
                setStep={setStep}
                botIcon={botIcon}
                setBotIcon={setBotIcon}
                botColor={botColor}
                setBotColor={setBotColor}
                currentTab={currentTab}
                setOperate={setOperate}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default AddTools;
