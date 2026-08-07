import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Button, Timeline, Card, Tabs, Empty } from 'antd';
import {
  getVersionList,
  restoreVersion,
  getPublicResult,
} from '@/services/common';
import { useMemoizedFn } from 'ahooks';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';

// 类型导入
import {
  VersionManagementProps,
  DrawerStyle,
  VersionItem,
  PublicResultItem,
  FeedbackItem,
  TabType,
  ReactFlowNode,
  FlowType,
  UseVersionManagementProps,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Version Management 模块的图标
const icons = Icons.versionManagement;

import './version-management.css';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import dayjs from 'dayjs';
import FeedbackDialog from '@/components/workflow/modal/feedback-dialog';
import { getFeedbackList } from '@/services/common';
import { useTranslation } from 'react-i18next';

const TAB_TYPE: TabType = {
  version: '1',
  feedback: '2',
};

const PublishResultModal = ({
  t,
  isOverlayVisible,
  setIsOverlayVisible,
  selectedVersionData,
  publicResultData,
}): React.ReactElement | null => {
  if (!isOverlayVisible) return null;
  const renderPlatformLogo = (type: number): React.ReactElement | null => {
    switch (type) {
      case 1:
        return <img src={icons.iflytek} alt="科大讯飞" className="w-12 h-12" />;
      case 2:
        return (
          <img src={icons.iflytekCloud} alt="讯飞云" className="w-12 h-12" />
        );
      case 3:
        return <img src={icons.wechat} alt="微信" className="w-12 h-12" />;

      case 4:
        return <img src={icons.mcp} alt="MCP" className="w-12 h-12" />;
      default:
        return null;
    }
  };
  const getPlatformLabel = (type: number): string => {
    switch (type) {
      case 1:
        return t('workflow.versionManagement.iflytekVoicePlatform');
      case 2:
        return t('workflow.versionManagement.iflytekCloudPlatform');
      case 3:
        return t('workflow.versionManagement.wechatOfficialAccount');
      case 4:
        return t('workflow.versionManagement.mcpPlatform');
      default:
        return t('workflow.versionManagement.unknownPlatform');
    }
  };
  return (
    <div className="absolute fixed inset-0 bg-[#000000] bg-opacity-40 z-[9999] flex items-center justify-center overflow-hidden">
      <div className="max-w-[90vw] max-h-[85vm] min-h-[420px] bg-white rounded-[16px] border-[1px] border-white p-6 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-semibold">
            {t('workflow.versionManagement.publishResultTitle')}
          </span>
          <img
            src={icons.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => {
              setIsOverlayVisible(false);
            }}
          />
        </div>
        <div className="flex text-[14px] text-[#7F7F7F] gap-8 mt-6">
          <span>
            {t('workflow.versionManagement.version')}
            {selectedVersionData?.name}
          </span>
          <span>
            {t('workflow.versionManagement.versionId')}
            {selectedVersionData?.versionNum}
          </span>
          <span>
            {t('workflow.versionManagement.publishTime')}
            {dayjs(selectedVersionData?.createdTime)?.format(
              'YYYY-MM-DD HH:mm:ss'
            )}
          </span>
        </div>
        <div className="flex mt-6 text-[14px] text-[#333333]">
          <span>{t('workflow.versionManagement.publishPlatform')}</span>
        </div>
        <div className="border border-[#E4EAFF] rounded-[8px] mt-2 flex flex-1 py-[17px] px-[24px] flex items-start overflow-y-auto">
          {publicResultData && publicResultData.length > 0 ? (
            <div className="flex flex-col gap-[18px] w-full">
              {publicResultData.map((item: PublicResultItem, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center w-full border-b border-[#E4EAFF] pb-[16px]"
                >
                  <div className="flex items-center gap-[15px]">
                    {renderPlatformLogo(item.publishChannel)}
                    <span className="text-[14px] text-[#333333] font-medium">
                      {getPlatformLabel(item.publishChannel)}
                    </span>
                  </div>
                  <span
                    className={`text-[14px] ${
                      item.publishResult === '成功'
                        ? 'text-[#1FC92D]'
                        : 'text-[#FF4D4F]'
                    }`}
                  >
                    {item.publishResult === '成功'
                      ? t('workflow.versionManagement.publishSuccess')
                      : item.publishResult === '审核中'
                        ? t('workflow.versionManagement.publishing')
                        : t('workflow.versionManagement.publishFailed')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#7F7F7F]">
              {t('workflow.versionManagement.noPublishRecord')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VersionList = ({
  selectedCardId,
  currentFlow,
  t,
  handleCardClick,
  restoreVerName,
  versionList,
  setSelectedVersionData,
  setIsOverlayVisible,
  handleDebugger,
}): React.ReactElement | null => {
  return (
    <div className="flex flex-1 overflow-auto version-list">
      <Timeline mode="left">
        <Timeline.Item
          dot={
            <img
              src={
                selectedCardId === currentFlow?.flowId
                  ? icons.selectedPoint
                  : icons.point
              }
              className="w-[14px] h-[14px] mt-1"
              alt=""
            />
          }
        >
          <Card
            title={t('workflow.versionManagement.draftVersion')}
            bordered={true}
            style={{
              borderColor:
                selectedCardId === currentFlow?.flowId ? '#6356EA' : '#e8e8e8',
            }}
            onClick={() => handleCardClick(currentFlow?.flowId)}
            hoverable
          >
            <div className="px-3 pb-[6px]">
              {restoreVerName != '' && (
                <span>
                  {t('workflow.versionManagement.restoredFrom')}
                  {restoreVerName}版本
                </span>
              )}
            </div>
          </Card>
        </Timeline.Item>
        {versionList.map(item => (
          <Timeline.Item
            key={item.id}
            dot={
              <img
                src={
                  selectedCardId === item.id ? icons.selectedPoint : icons.point
                }
                className="w-[14px] h-[14px]"
                alt=""
              />
            }
          >
            <Card
              title={`${t('workflow.versionManagement.version')}${item.name}`}
              bordered={true}
              style={{
                borderColor: selectedCardId === item.id ? '#6356EA' : '#e8e8e8',
                cursor: 'pointer',
              }}
              onClick={() => handleCardClick(item.id)}
              hoverable
            >
              <div className="px-3 pb-[6px]">
                <p>
                  {t('workflow.versionManagement.versionId')}
                  {item.versionNum}
                </p>
                <p>
                  {t('workflow.versionManagement.publishTime')}
                  {dayjs(item.createdTime)?.format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </div>
              <div className="flex justify-between border-t border-dashed border-[#E4EAFF] py-2 px-3 text-[#6356EA]">
                <div
                  className="flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    setSelectedVersionData(item);
                    setIsOverlayVisible(true);
                  }}
                >
                  <span>{t('workflow.versionManagement.publishResult')}</span>
                  <img
                    src={icons.releaseResult}
                    className="w-[14px] h-[14px] ml-1"
                    alt=""
                  />
                </div>
                <div className="flex">
                  <span
                    className="pr-2 cursor-pointer"
                    onClick={() => handleDebugger()}
                  >
                    {t('workflow.versionManagement.previewDebug')}
                  </span>
                </div>
              </div>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};

const FeedbackList = ({
  t,
  feedbackList,
  selectedQsId,
  setSelectedQsId,
  handleViewDetail,
}): React.ReactElement | null => {
  return (
    <>
      {!feedbackList.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex flex-1 overflow-auto version-list feedback-list">
          <Timeline mode="left" className="w-full">
            {feedbackList.map(item => (
              <Timeline.Item
                key={item.id}
                dot={
                  <img
                    src={
                      selectedQsId === item.id
                        ? icons.selectedPoint
                        : icons.point
                    }
                    className="w-[14px] h-[14px]"
                    alt=""
                  />
                }
              >
                <Card
                  bordered={true}
                  style={{
                    borderColor:
                      selectedQsId === item.id ? '#6356EA' : '#e8e8e8',
                    cursor: 'pointer',
                    width: '98%',
                  }}
                  onClick={() => setSelectedQsId(item.id)}
                  hoverable
                >
                  <div className="relative px-[16px] py-[12px] text-[#7F7F7F]">
                    <div className="mb-[4px] leading-[20px]">
                      {t('workflow.versionManagement.questionId')}
                      <span className="text-[#333333]">{item.id}</span>
                    </div>
                    <div className="leading-[20px]">
                      {t('workflow.versionManagement.publishTime')}
                      <span className="text-[#333333]">{item.createTime}</span>
                    </div>
                    <div
                      className="absolute right-[16px] top-[12px] text-[#6356EA]"
                      onClick={() => handleViewDetail(item)}
                    >
                      {t('workflow.versionManagement.detail')}
                    </div>
                  </div>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      )}
    </>
  );
};

const useVersionManagement = ({
  currentFlow,
  setSelectedCardId,
  feedbackItem,
  setVisible,
  setFeedbackList,
  setSelectedQsId,
  selectedCardId,
  versionList,
  setRestoreVerName,
  selectedVersionData,
  setPublicResultData,
}): UseVersionManagementProps => {
  const setEdgeType = useFlowsManager(state => state.setEdgeType);
  const setNodes = useFlowStore(state => state.setNodes);
  const setEdges = useFlowStore(state => state.setEdges);
  const setHistoryVersionData = useFlowsManager(
    state => state.setHistoryVersionData
  );
  const setHistoryVersion = useFlowsManager(state => state.setHistoryVersion);
  const setIsallowEdit = useFlowsManager(state => state.setCanvasesDisabled);
  const setUpdateNodeInputData = useFlowsManager(
    state => state.setUpdateNodeInputData
  );
  const initFlowData = useFlowsManager(state => state.initFlowData);

  const handleSetNodesAndEdges = useMemoizedFn((originData: string): void => {
    const data = JSON.parse(originData);
    setNodes(
      data.nodes?.map((node: unknown) => ({
        ...node,
        type: 'custom',
        nodeType: node?.id?.split('::')?.[0],
        selected: false,
        data: {
          ...node.data,
          status: '',
        },
      }))
    );
    setEdges(data.edges);
    setEdgeType(data.edges?.[0]?.data?.edgeType || 'curve');
  });

  // hand-card-click
  const handleCardClick = useMemoizedFn((cardId: string): void => {
    //default-workflow-container  or version-workflow-container
    if (cardId == currentFlow?.flowId) {
      setHistoryVersionData(null);
      handleSetNodesAndEdges(currentFlow?.originData || '');

      setHistoryVersion(false);
      //允许编辑
      setIsallowEdit(false);
    } else {
      setHistoryVersion(true);

      const versionData = versionList.find(
        (item: VersionItem) => item?.id === cardId
      );
      //全局设置历史版本数据
      setHistoryVersionData(versionData || null);
      //bu允许编辑
      setIsallowEdit(true);
      if (versionData) {
        handleSetNodesAndEdges(String(versionData.data));
      } else {
        setHistoryVersion(false);
      }
    }
    setSelectedCardId(cardId);
    setTimeout(() => {
      setUpdateNodeInputData(
        (updateNodeInputData: boolean) => !updateNodeInputData
      );
    }, 0);
  });

  const handleViewDetail = (detailItem: FeedbackItem): void => {
    feedbackItem.current = { ...detailItem };
    setVisible(true);
  };

  const queryFeedbackList = async (flowId: string): Promise<void> => {
    if (!flowId) return;
    const data: FeedbackItem[] = await getFeedbackList({ flowId });
    setFeedbackList(data);
    setSelectedQsId(data.length ? data[0]?.id || '' : '');
  };

  const handlegetRestoreVersion = (): void => {
    const params = {
      flowId: currentFlow?.flowId,
      id: selectedCardId,
    };
    restoreVersion(params).then((): void => {
      setSelectedCardId(String(currentFlow?.flowId || ''));
      const versionData = versionList.find(
        (item: VersionItem) => item?.id === selectedCardId
      );
      setRestoreVerName(versionData?.name ?? '');
      initFlowData(currentFlow?.id);
      setHistoryVersionData(null);
      setHistoryVersion(false);
      setIsallowEdit(false);
    });
  };
  const handlePublicResult = (): void => {
    if (selectedVersionData === null) {
      return;
    }
    const params = {
      flowId: selectedVersionData?.flowId,
      name: selectedVersionData?.name,
    };
    getPublicResult(params).then((data: PublicResultItem[]): void => {
      setPublicResultData(data);
    });
  };
  return {
    handleCardClick,
    handleViewDetail,
    handlePublicResult,
    handlegetRestoreVersion,
    queryFeedbackList,
  };
};

function VersionManagement({
  open,
  setOpen,
  operationResultOpen,
}: VersionManagementProps): React.ReactElement {
  const { t } = useTranslation();
  const { handleDebugger } = useFlowCommon();
  const currentFlow = useFlowsManager(state => state.currentFlow) as FlowType;
  const historyVersionData = useFlowsManager(state => state.historyVersionData);
  const [drawerStyle, setDrawerStyle] = useState<DrawerStyle>({
    height: (window?.innerHeight ?? 0) - 80,
    top: 80,
    right: 0,
    zIndex: 998,
  });
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>(''); //选中card的id
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [selectedVersionData, setSelectedVersionData] =
    useState<VersionItem | null>(null);
  const [publicResultData, setPublicResultData] = useState<
    PublicResultItem[] | null
  >(null);
  const [restoreVerName, setRestoreVerName] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string>(TAB_TYPE['version']);
  const [selectedQsId, setSelectedQsId] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const feedbackItem = useRef<FeedbackItem>({
    id: '',
    createTime: '',
    picUrl: '',
    description: '',
  });

  const {
    handleCardClick,
    handleViewDetail,
    handlePublicResult,
    handlegetRestoreVersion,
    queryFeedbackList,
  } = useVersionManagement({
    currentFlow,
    setSelectedCardId,
    feedbackItem,
    setVisible,
    setFeedbackList,
    setSelectedQsId,
    selectedCardId,
    versionList,
    setRestoreVerName,
    selectedVersionData,
    setPublicResultData,
  });
  useEffect(() => {
    setDrawerStyle((prev: DrawerStyle) => ({
      ...prev,
      right: operationResultOpen ? 530 : 0,
    }));
  }, [operationResultOpen]);

  useEffect(() => {
    const handleAdjustmentDrawerStyle = (): void => {
      setDrawerStyle((prev: DrawerStyle) => ({
        ...prev,
        height: (window?.innerHeight ?? 0) - 80,
      }));
    };
    window.addEventListener('resize', handleAdjustmentDrawerStyle);
    return (): void =>
      window.removeEventListener('resize', handleAdjustmentDrawerStyle);
  }, [drawerStyle]);

  // get-version-list
  useEffect(() => {
    const fetchVersionList = async (): Promise<void> => {
      if (!currentFlow?.flowId) return;
      const params = {
        flowId: currentFlow.flowId,
        size: 10000,
        current: 1,
      };
      const data = await getVersionList(params);
      setVersionList(data.records);
    };
    setActiveKey(TAB_TYPE['version']);
    if (open) {
      queryFeedbackList(currentFlow?.flowId || '');
    }
    fetchVersionList();
    setSelectedCardId(historyVersionData?.id || currentFlow?.flowId || '');
  }, [currentFlow?.flowId, open, historyVersionData]);
  useEffect(() => {
    handlePublicResult();
  }, [selectedVersionData]);

  return (
    <div>
      <Drawer
        rootClassName="advanced-configuration-container"
        rootStyle={drawerStyle}
        placement="right"
        open={open}
        mask={false}
        getContainer={() =>
          document.getElementById('flow-container') || document.body
        }
        onClose={() => {
          setActiveKey(TAB_TYPE['version']);
        }}
      >
        <div className="flex flex-col w-full h-full p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-[12px]">
            <div className="text-lg font-semibold">
              {t('workflow.versionManagement.title')}
            </div>
            <img
              src={icons.close}
              className="w-3 h-3 cursor-pointer"
              alt=""
              onClick={() => setOpen(false)}
            />
          </div>
          <Tabs
            activeKey={activeKey}
            size="small"
            className="flex flex-col flex-1 h-0 overflow-hidden version-feedback-tabs"
            tabBarStyle={{ margin: '0 0 24px 0' }}
            tabBarGutter={40}
            onChange={key => setActiveKey(key)}
          >
            <Tabs.TabPane
              tab={t('workflow.versionManagement.versionRecord')}
              key="1"
            >
              <VersionList
                selectedCardId={selectedCardId}
                currentFlow={currentFlow}
                t={t}
                handleCardClick={handleCardClick}
                restoreVerName={restoreVerName}
                versionList={versionList}
                setSelectedVersionData={setSelectedVersionData}
                setIsOverlayVisible={setIsOverlayVisible}
                handleDebugger={handleDebugger}
              />
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={t('workflow.versionManagement.feedbackRecord')}
              key="2"
            >
              <FeedbackList
                t={t}
                feedbackList={feedbackList}
                selectedQsId={selectedQsId}
                setSelectedQsId={setSelectedQsId}
                handleViewDetail={handleViewDetail}
              />
            </Tabs.TabPane>
          </Tabs>
          {activeKey === TAB_TYPE['version'] && (
            <div className="flex mt-[30px]">
              <Button
                type="primary"
                className="w-full h-[36px] rounded-lg text-base font-medium"
                onClick={() => {
                  handlegetRestoreVersion();
                }}
                disabled={
                  !selectedCardId || selectedCardId === currentFlow?.flowId
                }
              >
                {t('workflow.versionManagement.restoreThisVersion')}
              </Button>
            </div>
          )}
        </div>
      </Drawer>
      <PublishResultModal
        t={t}
        isOverlayVisible={isOverlayVisible}
        setIsOverlayVisible={setIsOverlayVisible}
        selectedVersionData={selectedVersionData}
        publicResultData={publicResultData}
      />
      <FeedbackDialog
        visible={visible}
        detail={{
          ...feedbackItem.current,
          picUrl: feedbackItem.current.picUrl || '',
          description: feedbackItem.current.description || '',
        }}
        onCancel={() => setVisible(false)}
        detailMode={true}
      />
    </div>
  );
}

export default VersionManagement;
