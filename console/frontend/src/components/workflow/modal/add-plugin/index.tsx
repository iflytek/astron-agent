import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { listTools, listToolSquare } from '@/services/plugin';
import { Button, Select, Spin, Tooltip } from 'antd';
import { FlowInput } from '@/components/workflow/ui';
import { debounce, throttle } from 'lodash';
import { isJSON } from '@/utils';
import {
  handleModifyToolUrlParams,
  filterTreeNodes,
} from '@/components/workflow/utils/reactflowUtils';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import DeletePlugin from './delete-plugin';
import {
  ToolDebugger,
  CreateTool,
  ToolDetail,
} from '@/components/modal/plugin';
import { useTranslation } from 'react-i18next';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import {
  ToolListItem,
  Pagination,
  BotIcon,
  PluginTabType,
  ToolOperateType,
  ToolNode,
  useAddAgentPluginType,
} from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';
import { useMemoizedFn } from 'ahooks';

const LeftNav = ({
  setToolModalInfo,
  resetBeforeAndWillNode,
  t,
  setCurrentTab,
  setToolOperate,
  setCurrentToolInfo,
  currentTab,
  handleChangeTab,
}): React.ReactElement => {
  return (
    <div className="w-[240px] h-full bg-[#f8faff] px-4 py-6 flow-tool-modal-left">
      <div className="text-lg font-semibold flex items-center gap-2">
        <img
          src={Icons.addPlugin.flowBack}
          width={28}
          className="cursor-pointer"
          alt=""
          onClick={() => {
            setToolModalInfo({ open: false });
            resetBeforeAndWillNode();
          }}
        />
        <span>{t('workflow.nodes.toolNode.addTool')}</span>
      </div>
      <Button
        type="primary"
        className="w-full text-[#fff] mt-6 flex items-center gap-2"
        onClick={e => {
          e.stopPropagation();
          setCurrentTab('');
          setToolOperate('create');
          setCurrentToolInfo({
            id: '',
          });
        }}
      >
        <img
          className="w-3.5 h-3.5"
          src={Icons.addPlugin.toolModalAdd}
          alt=""
        />
        <span>{t('workflow.nodes.toolNode.createTool')}</span>
      </Button>
      <div className="flex flex-col gap-2 mt-6">
        <div
          className={`create-tool-tab-normal ${
            currentTab === 'person' ? 'create-tool-tab-active' : ''
          }`}
          onClick={() => handleChangeTab('person')}
        >
          <i className="person"></i>
          <span className="mt-0.5">
            {t('workflow.nodes.toolNode.myCreated')}
          </span>
        </div>
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

const ToolItem = ({
  item,
  setCurrentToolInfo,
  setToolOperate,
  handleAddToolNodeThrottle,
  currentTab,
  operateId,
  setOperateId,
  handleDeleteModalShow,
}): React.ReactElement => {
  const { t } = useTranslation();
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const renderParamsTooltip = useMemoizedFn((data: ToolListItem) => {
    const params =
      currentTab === 'offical'
        ? filterTreeNodes(
            (isJSON(data?.webSchema) &&
              JSON.parse(data.webSchema)?.toolRequestInput) ||
              []
          )
        : (isJSON(data?.webSchema) &&
            JSON.parse(data.webSchema)?.toolRequestInput) ||
          [];
    return (
      <div>
        <div className="text-base font-semibold">{data?.name}</div>
        <p className="text-desc mt-1">{data?.description}</p>
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
  });
  const toolsNode = useMemo((): ToolNode[] => {
    return nodes?.filter((node: ToolNode) => node?.nodeType === 'plugin');
  }, [nodes]);
  return (
    <div
      key={item.id}
      className="px-4 py-2.5 hover:bg-[#EBEBF1] cursor-pointer border-t border-[#E5E5EC]"
      onClick={() => {
        setCurrentToolInfo({
          ...item,
        });
        setToolOperate('detail');
      }}
    >
      <div className="flex justify-between gap-[52px]">
        <div className="flex-1 flex items-center gap-[30px] overflow-hidden">
          <span
            className="w-12 h-12 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              background: item?.avatarColor
                ? item?.avatarColor
                : `url(${item?.icon}) no-repeat center / cover`,
            }}
          >
            {item?.avatarColor && (
              <img src={item?.icon} className="w-[28px] h-[28px]" alt="" />
            )}
          </span>
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="font-semibold">{item?.name}</div>
            <p
              className="w-full text-[#757575] text-xs text-overflow"
              title={item?.description}
            >
              {item?.description}
            </p>
          </div>
        </div>
        <div className="w-2/5 flex items-center justify-between min-w-[500px]">
          <div className="w-1/3 flex items-center gap-1.5 flex-shrink-0">
            <img src={Icons.addPlugin.publish} className="w-3 h-3" alt="" />
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
            <div
              className="flex items-center gap-1 bg-[#fff] border border-[#E5E5E5] py-1 px-6 rounded-lg hover:text-[#FFF] hover:bg-[#6356EA]"
              onClick={() => {
                setCurrentToolInfo({
                  ...item,
                });
                setToolOperate('test');
              }}
            >
              {t('workflow.nodes.toolNode.test')}
            </div>
            <div
              className="flex items-center gap-1 bg-[#fff] border border-[#E5E5E5] py-1 px-6 rounded-lg hover:text-[#FFF] hover:bg-[#6356EA]"
              onClick={() => handleAddToolNodeThrottle(item)}
            >
              <span>{t('workflow.nodes.common.add')}</span>
              <span>
                {toolsNode.filter(
                  toolnode =>
                    toolnode?.data?.nodeParam?.pluginId === item.toolId
                )?.length > 0
                  ? toolsNode.filter(
                      toolnode =>
                        toolnode?.data?.nodeParam?.pluginId === item.toolId
                    )?.length
                  : ''}
              </span>
            </div>
            <div
              className="h-[34px] flex items-center"
              onClick={e => {
                e.stopPropagation();
                setOperateId(item?.id);
              }}
            >
              {currentTab === 'person' && (
                <img
                  src={Icons.addPlugin.toolOperateMore}
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
                    onClick={e => {
                      e.stopPropagation();
                      setCurrentToolInfo({
                        ...item,
                      });
                      setOperateId('');
                      setToolOperate('edit');
                    }}
                  >
                    {t('workflow.nodes.toolNode.edit')}
                  </div>
                  <div
                    className="hover:bg-[#E6F4FF] w-[80px] rounded-md"
                    style={{
                      padding: '6px 0px 6px 10px',
                    }}
                    onClick={e => handleDeleteModalShow(e, item)}
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

const PluginList = ({
  toolRef,
  loader,
  currentTab,
  orderFlag,
  setOrderFlag,
  setToolOperate,
  handleAddToolNodeThrottle,
  loading,
  setLoading,
  hasMore,
  setPagination,
  searchValue,
  dataSource,
  setDataSource,
  handleInputChange,
  setCurrentToolInfo,
  handleDeleteModalShow,
  operateId,
  setOperateId,
}): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        padding: '26px 0 43px',
      }}
    >
      <div className="h-full overflow-hidden flex flex-col">
        <div
          className="flex items-center justify-between mx-auto"
          style={{
            width: '90%',
            minWidth: 1000,
          }}
        >
          <div className="w-full flex items-center gap-4 justify-end">
            {currentTab === 'offical' ? (
              <Select
                suffixIcon={
                  <img src={Icons.addPlugin.formSelect} className="w-4 h-4 " />
                }
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
            <div className="relative">
              <img
                src={Icons.addPlugin.search}
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
          </div>
        </div>
        <div className="flex flex-col mt-4 gap-1.5 flex-1 overflow-hidden">
          <div className="flex flex-col gap-[18px] overflow-hidden h-full">
            <div
              className="flex items-center font-medium mx-auto"
              style={{
                width: '90%',
                minWidth: 1000,
              }}
            >
              <span className="flex-1">
                {t('workflow.nodes.toolNode.tool')}
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
                {dataSource.map((item: ToolListItem) => (
                  <ToolItem
                    key={item.id}
                    item={item}
                    setCurrentToolInfo={setCurrentToolInfo}
                    operateId={operateId}
                    setOperateId={setOperateId}
                    setToolOperate={setToolOperate}
                    handleAddToolNodeThrottle={handleAddToolNodeThrottle}
                    currentTab={currentTab}
                    handleDeleteModalShow={handleDeleteModalShow}
                  />
                ))}
                {loading && <Spin className="mt-2" size="large" />}
                {hasMore && <div ref={loader}></div>}
                {!loading && dataSource.length === 0 && (
                  <p className="mt-3">
                    {t('workflow.nodes.toolNode.noPlugins')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const useAddPlugin = (): useAddAgentPluginType => {
  const { handleAddToolNode } = useFlowCommon();
  const loader = useRef<null | HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  const contentRef = useRef<string>('');
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const nodes = currentStore(state => state.nodes);
  const toolRef = useRef<HTMLDivElement | null>(null);
  const [dataSource, setDataSource] = useState<ToolListItem[]>([]);
  const [currentTab, setCurrentTab] = useState<PluginTabType>('offical');
  const [toolOperate, setToolOperate] = useState<ToolOperateType>('');
  const [orderFlag, setOrderFlag] = useState<number>(0);
  const [searchValue, setSearchValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
  });
  const [currentToolInfo, setCurrentToolInfo] = useState<ToolListItem>({});
  const [operateId, setOperateId] = useState<string>('');

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const query = event.target.value;
      setSearchValue(query);
      fetchDataDebounce(query);
    },
    [currentTab, orderFlag]
  );

  const fetchDataDebounce = useCallback(
    debounce((value: string) => {
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

  const handleAddToolNodeThrottle = useCallback(
    throttle((tool: ToolListItem) => {
      handleAddToolNode(tool);
    }, 1000),
    [nodes]
  );

  const handleClearData = (): void => {
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    setHasMore(false);
    setOrderFlag(0);
    setToolOperate('');
    setLoading(true);
    setDataSource([]);
    setPagination({
      pageNo: 1,
      pageSize: 20,
    });
    setSearchValue('');
    contentRef.current = '';
  };

  const handleChangeTab = (tab: PluginTabType): void => {
    setCurrentTab(tab);
    handleClearData();
  };

  return {
    loader,
    loadingRef,
    toolRef,
    currentTab,
    setCurrentTab,
    toolOperate,
    setToolOperate,
    orderFlag,
    setOrderFlag,
    handleAddToolNodeThrottle,
    loading,
    setLoading,
    hasMore,
    pagination,
    setPagination,
    searchValue,
    setSearchValue,
    dataSource,
    setDataSource,
    handleInputChange,
    operateId,
    setOperateId,
    getPersonTools,
    getOfficalTools,
    handleClearData,
    handleChangeTab,
    currentToolInfo,
    setCurrentToolInfo,
  };
};

const AddPlugin = (): React.ReactElement => {
  const { resetBeforeAndWillNode } = useFlowCommon();
  const {
    loader,
    loadingRef,
    currentTab,
    setCurrentTab,
    orderFlag,
    operateId,
    setOperateId,
    getPersonTools,
    getOfficalTools,
    handleClearData,
    handleChangeTab,
    pagination,
    setPagination,
    currentToolInfo,
    setCurrentToolInfo,
    toolRef,
    toolOperate,
    setToolOperate,
    setOrderFlag,
    handleAddToolNodeThrottle,
    loading,
    setLoading,
    hasMore,
    searchValue,
    dataSource,
    setDataSource,
    handleInputChange,
  } = useAddPlugin();
  const { t } = useTranslation();
  const toolModalInfo = useFlowsManager(state => state.toolModalInfo);
  const setToolModalInfo = useFlowsManager(state => state.setToolModalInfo);
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [botIcon, setBotIcon] = useState<BotIcon>({});
  const [botColor, setBotColor] = useState<string>('');

  useEffect(() => {
    if (['create', 'edit']?.includes(toolOperate)) {
      setStep(1);
    }
  }, [toolOperate]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        setPagination(pagination => ({
          ...pagination,
          page: pagination?.page + 1,
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
  }, []);

  useEffect(() => {
    if (currentTab) {
      setStep(1);
      if (currentTab === 'person') {
        getPersonTools();
      } else {
        getOfficalTools();
      }
    }
  }, [currentTab, orderFlag, pagination]);

  const handleDeleteModalShow = useMemoizedFn((e, item) => {
    e.stopPropagation();
    setOperateId('');
    setDeleteModal(true);
    setCurrentToolInfo(item);
  });

  return (
    <>
      {toolModalInfo.open
        ? createPortal(
            <div
              className="mask w-full h-full"
              style={{
                zIndex: 1001,
              }}
              onClick={e => e.stopPropagation()}
            >
              {deleteModal && (
                <DeletePlugin
                  currentTool={currentToolInfo}
                  setDeleteModal={setDeleteModal}
                  getPersonTools={() => handleClearData()}
                />
              )}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-[#fff] text-second font-medium text-md flex w-full h-full overflow-hidden"
                onClick={() => setOperateId('')}
              >
                <LeftNav
                  setToolModalInfo={setToolModalInfo}
                  resetBeforeAndWillNode={resetBeforeAndWillNode}
                  t={t}
                  setCurrentTab={setCurrentTab}
                  setToolOperate={setToolOperate}
                  setCurrentToolInfo={setCurrentToolInfo}
                  currentTab={currentTab}
                  handleChangeTab={handleChangeTab}
                />
                <div className="flex-1 h-full bg-[#F7F7FA] overflow-hidden">
                  {!toolOperate && (
                    <PluginList
                      toolRef={toolRef}
                      loader={loader}
                      currentTab={currentTab}
                      orderFlag={orderFlag}
                      setOrderFlag={setOrderFlag}
                      setToolOperate={setToolOperate}
                      handleAddToolNodeThrottle={handleAddToolNodeThrottle}
                      loading={loading}
                      setLoading={setLoading}
                      hasMore={hasMore}
                      setPagination={setPagination}
                      searchValue={searchValue}
                      dataSource={dataSource}
                      setDataSource={setDataSource}
                      handleInputChange={handleInputChange}
                      setCurrentToolInfo={setCurrentToolInfo}
                      handleDeleteModalShow={handleDeleteModalShow}
                      operateId={operateId}
                      setOperateId={setOperateId}
                    />
                  )}
                  {toolOperate && (
                    <>
                      {['create', 'edit']?.includes(toolOperate) && (
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
                      {toolOperate === 'test' && (
                        <ToolDebugger
                          offical={currentTab === 'offical'}
                          currentToolInfo={currentToolInfo}
                          handleClearData={() => handleClearData()}
                        />
                      )}
                      {toolOperate === 'detail' && (
                        <ToolDetail
                          currentToolInfo={currentToolInfo}
                          handleClearData={handleClearData}
                          handleToolDebugger={() => setToolOperate('test')}
                        />
                      )}
                    </>
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

export default AddPlugin;
