import { useWorkflowSaveNavigation } from '@/components/workflow/hooks/use-workflow-save-navigation';
import type { WorkflowSnapshot } from '@/components/workflow/types/domain';
import React, { useEffect, memo } from 'react';
import { Alert, Button, Modal, Spin } from 'antd';
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
import useChatStore from '@/components/workflow/store/use-chat-store';

// ========= 组件 =========
const Index = (): React.ReactElement => {
  const { id } = useParams();
  const location = useLocation();
  // store hooks
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const initializationError = useFlowsManager(
    state => state.initializationError
  );
  const setModels = useFlowsManager(state => state.setModels);
  const setCanvasesDisabled = useFlowsManager(
    state => state.setCanvasesDisabled
  );
  const showNodeList = useFlowsManager(state => state.showNodeList);
  const setShowNodeList = useFlowsManager(state => state.setShowNodeList);
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
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const debuggering = useChatStore(state => state.debuggering);
  const stopRequested = useChatStore(state => state.stopRequested);
  const paused = useChatStore(state => state.interruptChat.interrupt);
  const activeWorkflowRun = debuggering || paused || stopRequested;
  const navigation = useWorkflowSaveNavigation(
    activeWorkflowRun ||
      Boolean(singleNodeDebuggingInfo?.controller && !showNodeList)
  );
  const handleStopConversation = useChatStore(
    state => state.handleStopConversation
  );

  useEffect(() => {
    if (id) void initFlowData(id).catch(() => undefined);
  }, [id, location]);

  useEffect(() => {
    return (): void => resetFlowsManager();
  }, []);

  // 设置 nodes 和 edges
  const handleSetNodesAndEdges = useMemoizedFn((originData: string): void => {
    const data: WorkflowSnapshot = JSON.parse(originData);
    setNodes(
      data.nodes.map(node => ({
        ...node,
        type: 'custom',
        nodeType: node.id.split('::')[0] ?? node.nodeType,
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
    if (activeWorkflowRun) {
      handleStopConversation();
      return;
    }
    setFlowResult({
      status: 'interrupted',
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
    <div className="workflow-authoring flex flex-col w-full h-full flow-container">
      {initializationError && (
        <Alert
          type="error"
          showIcon
          message={initializationError}
          action={
            <Button
              onClick={() => {
                if (id) void initFlowData(id).catch(() => undefined);
              }}
            >
              重新加载
            </Button>
          }
        />
      )}
      <FlowModal />
      <Modal
        title="离开正在调试的工作流？"
        open={navigation.blocked && (activeWorkflowRun || !showNodeList)}
        okText="保存并离开"
        cancelText="留在工作流"
        onOk={navigation.proceed}
        onCancel={navigation.reset}
      >
        离开会断开当前调试反馈连接。服务端运行可能继续，可在运行追踪中查看；也可以留在页面先停止运行。
      </Modal>
      <FlowDrawer />
      <CommunityQRCode />
      {/* 顶部工具栏 */}
      <FlowHeader currentFlow={currentFlow}>
        {showNodeList ? (
          <BtnGroups />
        ) : (
          <Button
            danger
            loading={stopRequested}
            disabled={stopRequested}
            onClick={() => handleCancelBuildFlow()}
          >
            {activeWorkflowRun
              ? stopRequested
                ? '正在停止运行…'
                : '停止运行'
              : '取消节点调试'}
          </Button>
        )}
      </FlowHeader>
      {!historyVersion && <MultipleCanvasesTip />}
      <Spin spinning={loadingModels} wrapperClassName="flow-spin-wrapper">
        <div className="w-full h-full">
          <div className="workflow-canvas-workspace flex items-start w-full h-full px-6">
            {showNodeList && <NodeList />}
            <FlowContainer zoom={zoom} setZoom={setZoom} />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default memo(Index);
