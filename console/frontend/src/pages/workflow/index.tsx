import React, { useEffect, useState, memo } from 'react';
import { Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { useParams, useLocation } from 'react-router-dom';
import BtnGroups from './components/btn-groups';
import FlowHeader from './components/flow-header';
import MultipleCanvasesTip from './components/multiple-canvases-tip';
import NodeList from './components/node-list';
import FlowContainer from './components/flow-container';
import FlowModal from './components/flow-modal';
import FlowDrawer from './components/flow-drawer';
import CommunityQRCode from './components/community-qr-code';
import { cloneDeep } from 'lodash';

import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';

import chatResultClose from '@/assets/imgs/workflow/chat-result-close.png';

// ========= 组件 =========
const Index: React.ReactElement = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  // store hooks
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const setModels = useFlowsManager(state => state.setModels);
  const setCanvasesDisabled = useFlowsManager(
    state => state.setCanvasesDisabled
  );
  const showNodeList = useFlowsManager(state => state.showNodeList);
  const setShowNodeList = useFlowsManager(state => state.setShowNodeList);
  const setFlowChatResultOpen = useFlowsManager(
    state => state.setFlowChatResultOpen
  );
  const initFlowData = useFlowsManager(state => state.initFlowData);
  const resetFlowsManager = useFlowsManager(state => state.resetFlowsManager);
  const setFlowResult = useFlowsManager(state => state.setFlowResult);
  const setEdgeType = useFlowsManager(state => state.setEdgeType);
  const loadingModels = useFlowsManager(state => state.loadingModels);
  const singleNodeDebuggingInfo = useFlowsManager(
    state => state.singleNodeDebuggingInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setHistorys = useFlowStore(state => state.setHistorys);
  const setNodes = useFlowStore(state => state.setNodes);
  const setNode = currentStore(state => state.setNode);
  const setEdges = useFlowStore(state => state.setEdges);
  const zoom = useFlowStore(state => state.zoom);
  const setZoom = useFlowStore(state => state.setZoom);

  // 本地状态
  const [publishModal, setPublishModal] = useState<boolean>(false);
  const historyVersion = useFlowsManager(state => state.historyVersion);

  useEffect(() => {
    id && initFlowData(id);
  }, [id, location]);

  useEffect(() => {
    return (): void => resetFlowsManager();
  }, []);

  // 设置 nodes 和 edges
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

  // currentFlow 改变时，刷新 nodes/edges
  useEffect(() => {
    if (currentFlow?.data) {
      handleSetNodesAndEdges(currentFlow.data);
    }
    setHistorys([]);
  }, [currentFlow?.data, handleSetNodesAndEdges, setHistorys]);

  // 初始化清理
  useEffect(() => {
    setCanvasesDisabled(false);
    return (): void => {
      setNodes([]);
    };
  }, [setCanvasesDisabled, setNodes]);

  useEffect(() => {
    if (currentFlow?.appId) {
      setModels(currentFlow.appId);
    }
  }, [currentFlow?.appId, setModels]);

  const handleCancelBuildFlow = useMemoizedFn(() => {
    setFlowResult({
      status: '',
      timeCost: '',
      totalTokens: '',
    });
    setShowNodeList(true);
    setCanvasesDisabled(false);
    if (singleNodeDebuggingInfo?.controller) {
      singleNodeDebuggingInfo?.controller?.abort();
      setNode(singleNodeDebuggingInfo?.nodeId, old => {
        old.data.status = '';
        return cloneDeep(old);
      });
    }
  });

  return (
    <div className="flex flex-col w-full h-full flow-container">
      <FlowModal />
      <FlowDrawer />
      <CommunityQRCode />
      {/* 聊天结果按钮 */}
      <div
        className="fixed right-0 top-[80px] bg-[#EBEFF4] border border-[#DFE4ED] mt-5"
        style={{
          borderRadius: '21px 0 0 21px',
          padding: '10px 17px 10px 28px',
          zIndex: 998,
        }}
      >
        <div
          className="w-[22px] h-[22px] flex items-center justify-center bg-[#fff] shadow-sm rounded-md cursor-pointer"
          onClick={() => setFlowChatResultOpen(true)}
        >
          <img src={chatResultClose} className="w-[10px] h-[10px]" alt="" />
        </div>
      </div>
      {/* 顶部工具栏 */}
      <FlowHeader currentFlow={currentFlow}>
        {showNodeList ? (
          <BtnGroups
            publishModal={publishModal}
            setPublishModal={setPublishModal}
          />
        ) : (
          <Button
            type="text"
            className="origin-btn px-[36px]"
            onClick={() => handleCancelBuildFlow()}
          >
            {t('common.cancel')}
          </Button>
        )}
      </FlowHeader>
      {!historyVersion && <MultipleCanvasesTip />}
      <Spin spinning={loadingModels} wrapperClassName="flow-spin-wrapper">
        <div className="w-full h-full">
          <div className="flex items-start w-full h-full px-6">
            {showNodeList && <NodeList />}
            <FlowContainer zoom={zoom} setZoom={setZoom} />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default memo(Index);
