import React, { useState, useMemo, memo, useEffect } from 'react';
import { Panel, MiniMap } from 'reactflow';
import type { ReactFlowInstance } from 'reactflow';
import { Button, Dropdown, Tooltip, Popover } from 'antd';
import {
  EllipsisOutlined,
  FullscreenOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import dagre from 'dagre';
import { copyFlowAPI } from '@/services/flow';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { Icons } from '@/components/workflow/icons';
import type {
  WorkflowNode,
  WorkflowNodeData,
  WorkflowEdge,
  WorkflowSnapshot,
} from '@/components/workflow/types/domain';

interface FlowPanelProps {
  reactFlowInstance: ReactFlowInstance<WorkflowNodeData> | null;
  zoom: number;
  setZoom: (zoom: number) => void;
}

type EdgeLineType = 'curve' | 'polyline';

interface FlowControlsProps {
  positionStartNode: () => void;
  handleFlowReduction: () => void;
  handleCopyFlow: () => void;
  viewAbbreviation: () => void;
  viewAdaptive: () => void;
  optimizeLayout: () => void;
  changeEdgeLine: (edgeType: EdgeLineType) => void;
  historys: WorkflowSnapshot[];
  historyVersion: boolean;
  autonomousMode: boolean;
  handleSwitchMode: () => void;
  showNodeRemarks: boolean;
  handleRemarkNodeVisible: () => void;
}

interface FlowToolbarProps extends FlowPanelProps, FlowControlsProps {
  needGuide: boolean;
  showBeginnerGuide: boolean;
  setShowBeginnerGuide: (show: boolean) => void;
}

// 计算布局
function useFlowLayout(zoom: number): { optimizeLayout: () => void } {
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const edges = currentStore(state => state.edges);
  const setNodes = currentStore(state => state.setNodes);
  const setEdges = currentStore(state => state.setEdges);

  const getNodeDimensions = useMemoizedFn((id: string) => {
    const nodeElement = showIterativeModal
      ? document
          .getElementById('iterator-flow-container')
          ?.querySelector(`[data-id="${id}"]`)
      : document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      const { width, height } = nodeElement.getBoundingClientRect();
      return { width, height };
    }
    return { width: 172, height: 36 };
  });

  const getLayoutedElements = useMemoizedFn(
    (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });

      nodes
        .filter(node => showIterativeModal || !node?.data?.parentId)
        .forEach(node => {
          const { width, height } = getNodeDimensions(node.id);
          dagreGraph.setNode(node.id, {
            width: width || 172,
            height: height || 36,
          });
        });

      edges.forEach(edge => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      nodes
        .filter(node => showIterativeModal || !node?.data?.parentId)
        .forEach(node => {
          const nodeWithPosition = dagreGraph.node(node.id);
          const scaleZoom = zoom / 100;
          node.position = {
            x:
              nodeWithPosition.x / scaleZoom -
              nodeWithPosition.width / scaleZoom / 2,
            y:
              nodeWithPosition.y / scaleZoom -
              nodeWithPosition.height / scaleZoom / 2,
          };
        });

      return { newNodes: nodes, newEdges: edges };
    }
  );

  const optimizeLayout = useMemoizedFn(() => {
    const { newNodes, newEdges } = getLayoutedElements(nodes, edges);
    setNodes([...newNodes]);
    setEdges([...newEdges]);
  });

  return { optimizeLayout };
}

function ModeControls(): React.ReactElement {
  const { t } = useTranslation();
  const controlMode = useFlowsManager(state => state.controlMode);
  const setControlMode = useFlowsManager(state => state.setControlMode);
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const [showControlMode, setShowControlMode] = useState(false);
  const [hoverControlMode, setHoverControlMode] = useState(false);

  useEffect((): void | (() => void) => {
    function clickOutside(event: MouseEvent): void {
      const dom = document.querySelector('.flow-mouser-mode-popover');
      if (dom && event.target instanceof Node && !dom.contains(event.target)) {
        setShowControlMode(false);
      }
    }
    window.addEventListener('click', clickOutside);
    return (): void => {
      window.removeEventListener('click', clickOutside);
    };
  }, [showIterativeModal]);

  return (
    <Popover
      arrow={false}
      overlayClassName="flow-mouser-mode-popover"
      content={
        <div className="flex gap-3 mt-3 relative">
          <div
            className={`w-[240px] flex flex-col items-center rounded-lg cursor-pointer h-[182px] control-mode-item ${
              controlMode === 'mouse' ? 'active' : ''
            }`}
            style={{
              border: '1px solid #bcc0cc',
              padding: '13px 0px 20px',
            }}
            onClick={() => {
              setControlMode('mouse');
              localStorage.setItem('controlMode', 'mouse');
            }}
          >
            <img
              src={
                controlMode === 'mouse'
                  ? Icons.panel.mouseBigActive
                  : Icons.panel.mouseBig
              }
              className="w-[48px] h-[48px]"
              alt=""
            />
            <h1
              className="mt-2"
              style={{
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {t('workflow.promptDebugger.mouseFriendlyMode')}
            </h1>
            <p className="mt-1 px-3">
              {t('workflow.promptDebugger.mouseFriendlyModeDescription')}
            </p>
          </div>
          <div
            className={`w-[240px] flex flex-col items-center rounded-lg cursor-pointer h-[182px] control-mode-item ${
              controlMode === 'touch' ? 'active' : ''
            }`}
            style={{
              border: '1px solid #bcc0cc',
              padding: '13px 0px 20px',
            }}
            onClick={() => {
              setControlMode('touch');
              localStorage.setItem('controlMode', 'touch');
            }}
          >
            <img
              src={
                controlMode === 'touch'
                  ? Icons.panel.keyboardBigActive
                  : Icons.panel.keyboardBig
              }
              className="w-[48px] h-[48px]"
              alt=""
            />
            <h1
              className="mt-2"
              style={{
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {t('workflow.promptDebugger.touchFriendlyMode')}
            </h1>
            <p className="mt-1 px-3 text-center">
              {t('workflow.promptDebugger.touchFriendlyModeDescription')}
            </p>
          </div>
        </div>
      }
      open={showControlMode}
      title={t('workflow.promptDebugger.interactionMode')}
      placement="topLeft"
    >
      <Tooltip
        title={
          controlMode === 'mouse'
            ? t('workflow.promptDebugger.mouseFriendlyMode')
            : t('workflow.promptDebugger.touchFriendlyMode')
        }
        open={hoverControlMode && !showControlMode}
      >
        <img
          src={
            controlMode === 'mouse' ? Icons.panel.mouse : Icons.panel.keyboard
          }
          className="w-5 h-5 cursor-pointer"
          alt=""
          onClick={e => {
            e.stopPropagation();
            setShowControlMode(!showControlMode);
          }}
          onMouseEnter={() => setHoverControlMode(true)}
          onMouseLeave={() => setHoverControlMode(false)}
        />
      </Tooltip>
    </Popover>
  );
}

function ZoomControls({
  zoom,
  setZoom,
  reactFlowInstance,
}: FlowPanelProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3.5 bg-[#F6F6F7] px-3 py-2 rounded-md">
      <div
        className="flex items-center justify-between w-[15px] h-[15px] cursor-pointer"
        onClick={() => {
          if (!reactFlowInstance) return;
          let newZoom = zoom / 100 - 0.1;
          newZoom = newZoom <= 0 ? 0.1 : newZoom;
          reactFlowInstance.zoomTo(newZoom);
          setZoom(zoom - 10 <= 10 ? 10 : zoom - 10);
        }}
      >
        <img src={Icons.panel.zoomOut} className="w-[15px] h-[2px]" alt="" />
      </div>
      <span>{zoom}%</span>
      <img
        src={Icons.panel.zoomIn}
        className="w-[15px] h-[16px] cursor-pointer"
        alt=""
        onClick={() => {
          if (!reactFlowInstance) return;
          let newZoom = zoom / 100 + 0.1;
          newZoom = newZoom >= 2 ? 2 : newZoom;
          reactFlowInstance.zoomTo(newZoom);
          setZoom(zoom + 10 <= 200 ? zoom + 10 : 200);
        }}
      />
    </div>
  );
}

function FlowControls({
  positionStartNode,
  handleFlowReduction,
  handleCopyFlow,
  viewAbbreviation,
  viewAdaptive,
  optimizeLayout,
  changeEdgeLine,
  historys,
  historyVersion,
  autonomousMode,
  handleSwitchMode,
  showNodeRemarks,
  handleRemarkNodeVisible,
}: FlowControlsProps): React.ReactElement {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const edgeType = useFlowsManager(state => state.edgeType);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setClearFlowCanvasModalInfo = useFlowsManager(
    state => state.setClearFlowCanvasModalInfo
  );
  const undo = currentStore(state => state.undo);
  return (
    <div className="workflow-canvas-controls flex items-center gap-1">
      <Button
        type="text"
        aria-label={t('workflow.promptDebugger.viewThumbnail')}
        title={t('workflow.promptDebugger.viewThumbnail')}
        icon={<PictureOutlined />}
        onClick={viewAbbreviation}
      />
      <Button
        type="text"
        aria-label={t('workflow.promptDebugger.adaptiveView')}
        title={t('workflow.promptDebugger.adaptiveView')}
        icon={<FullscreenOutlined />}
        onClick={viewAdaptive}
      />
      <Dropdown
        trigger={['click']}
        placement="topRight"
        menu={{
          items: [
            {
              key: 'locate',
              label: t('workflow.promptDebugger.locateInitialNode'),
              onClick: positionStartNode,
            },
            {
              key: 'layout',
              label: t('workflow.promptDebugger.optimizeLayout'),
              onClick: optimizeLayout,
            },
            {
              key: 'edge',
              label:
                edgeType === 'curve'
                  ? t('workflow.promptDebugger.switchToPolyline')
                  : t('workflow.promptDebugger.switchToCurve'),
              onClick: () =>
                changeEdgeLine(edgeType === 'curve' ? 'polyline' : 'curve'),
            },
            {
              key: 'mode',
              label: autonomousMode
                ? t('workflow.promptDebugger.switchToFollowMode')
                : t('workflow.promptDebugger.switchToAutonomousMode'),
              onClick: handleSwitchMode,
            },
            {
              key: 'remarks',
              label: showNodeRemarks
                ? t('workflow.promptDebugger.hideNodeRemarks')
                : t('workflow.promptDebugger.showNodeRemarks'),
              onClick: handleRemarkNodeVisible,
            },
            ...(!historyVersion && historys?.length > 0
              ? [
                  {
                    key: 'undo',
                    label: t('workflow.promptDebugger.undo'),
                    onClick: undo,
                  },
                ]
              : []),
            ...(!canvasesDisabled
              ? [
                  { type: 'divider' as const },
                  {
                    key: 'copy',
                    label: t('workflow.promptDebugger.createCopy'),
                    onClick: handleCopyFlow,
                  },
                  ...(currentFlow?.publishedData
                    ? [
                        {
                          key: 'restore',
                          label: t(
                            'workflow.promptDebugger.restoreToOnlineVersion'
                          ),
                          onClick: handleFlowReduction,
                        },
                      ]
                    : []),
                  {
                    key: 'clear',
                    danger: true,
                    label: t('workflow.promptDebugger.clearCanvas'),
                    onClick: () => setClearFlowCanvasModalInfo({ open: true }),
                  },
                ]
              : []),
          ],
        }}
      >
        <Button
          type="text"
          aria-label="更多画布操作"
          title="更多画布操作"
          icon={<EllipsisOutlined />}
        />
      </Dropdown>
    </div>
  );
}

// ------------------ UI 工具栏组件 ------------------
function FlowToolbar({
  zoom,
  setZoom,
  reactFlowInstance,
  needGuide,
  showBeginnerGuide,
  setShowBeginnerGuide,
  positionStartNode,
  handleFlowReduction,
  handleCopyFlow,
  viewAbbreviation,
  viewAdaptive,
  optimizeLayout,
  changeEdgeLine,
  historys,
  historyVersion,
  autonomousMode,
  handleSwitchMode,
  showNodeRemarks,
  handleRemarkNodeVisible,
}: FlowToolbarProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Panel position="bottom-left" className="workflow-canvas-toolbar">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="workflow-canvas-toolbar-main flex-shrink-0 bg-[#fff] flex items-center gap-2">
          <ModeControls />
          <ZoomControls
            zoom={zoom}
            setZoom={setZoom}
            reactFlowInstance={reactFlowInstance}
          />
          <FlowControls
            positionStartNode={positionStartNode}
            handleFlowReduction={handleFlowReduction}
            handleCopyFlow={handleCopyFlow}
            viewAbbreviation={viewAbbreviation}
            viewAdaptive={viewAdaptive}
            optimizeLayout={optimizeLayout}
            changeEdgeLine={changeEdgeLine}
            historys={historys}
            historyVersion={historyVersion}
            autonomousMode={autonomousMode}
            handleSwitchMode={handleSwitchMode}
            showNodeRemarks={showNodeRemarks}
            handleRemarkNodeVisible={handleRemarkNodeVisible}
          />
        </div>
        <a
          href="https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html"
          target="_blank"
        >
          <Tooltip
            open={needGuide && showBeginnerGuide ? true : false}
            overlayClassName="blue-tooltip"
            title={
              <div className="relative text-xs">
                {t('workflow.promptDebugger.beginnerGuide')}
                <img
                  src={Icons.panel.beginnerGuideClose}
                  className="absolute w-2.5 h-2.5 cursor-pointer top-[-5px] right-[-20px]"
                  alt=""
                  onClick={() => setShowBeginnerGuide(false)}
                />
              </div>
            }
          >
            <Tooltip title={t('workflow.promptDebugger.helpDocument')}>
              <div className="workflow-canvas-help bg-[#fff] rounded-lg flex items-center justify-center flex-shrink-0">
                <img
                  src={Icons.panel.flowHelpDoc}
                  className="w-4 h-4 flex-shrink-0"
                  alt=""
                />
              </div>
            </Tooltip>
          </Tooltip>
        </a>
      </div>
    </Panel>
  );
}

function index({
  reactFlowInstance,
  zoom,
  setZoom,
}: FlowPanelProps): React.ReactElement {
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const currentStore = getCurrentStore();
  const setEdgeType = useFlowsManager(state => state.setEdgeType);
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const autonomousMode = useFlowsManager(state => state.autonomousMode);
  const setAutonomousMode = useFlowsManager(state => state.setAutonomousMode);
  const setNodes = currentStore(state => state.setNodes);
  const moveToPosition = currentStore(state => state.moveToPosition);
  const nodes = currentStore(state => state.nodes);
  const setEdges = currentStore(state => state.setEdges);
  const historys = currentStore(state => state.historys);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showBeginnerGuide, setShowBeginnerGuide] = useState(true);
  const [showNodeRemarks, setShowNodeRemarks] = useState(false);
  const { optimizeLayout } = useFlowLayout(zoom);

  const positionStartNode = useMemoizedFn(() => {
    const currentNode = nodes.find(
      node =>
        node.id?.startsWith('node-start') ||
        node.id?.startsWith('iteration-node-start') ||
        node.id?.startsWith('loop-node-start')
    );
    if (!currentNode) return;
    const zoom = 0.8;
    const xPos = currentNode.position.x;
    const yPos = currentNode.position.y;
    moveToPosition({ x: -xPos * zoom + 200, y: -yPos * zoom + 200, zoom });
  });

  const viewAbbreviation = useMemoizedFn(() => {
    setShowMiniMap(showMiniMap => !showMiniMap);
  });

  const viewAdaptive = useMemoizedFn(() => {
    reactFlowInstance?.fitView();
    const zoom = reactFlowInstance?.getViewport()?.zoom
      ? Math.round(reactFlowInstance?.getViewport()?.zoom * 100)
      : 80;
    setZoom(zoom);
  });

  const changeEdgeLine = useMemoizedFn((edgeType: EdgeLineType) => {
    setEdges(edges =>
      edges?.map(edge => ({
        ...edge,
        data: {
          edgeType: edgeType,
        },
      }))
    );
    setEdgeType(edgeType);
  });

  const handleFlowReduction = useMemoizedFn(() => {
    if (!currentFlow?.publishedData) return;
    takeSnapshot();
    const data: WorkflowSnapshot = JSON.parse(currentFlow.publishedData);
    setNodes(
      data.nodes?.map(node => ({
        ...node,
        selected: false,
        data: {
          ...node.data,
          status: '',
        },
      }))
    );
    setEdges(data.edges);
    canPublishSetNot();
  });

  const handleCopyFlow = useMemoizedFn(() => {
    if (currentFlow?.id == null) return;
    copyFlowAPI(currentFlow.id).then(flow => {
      if (flow.id == null) return;
      window.open(
        `${window?.location.origin}/work_flow/${flow.id}/arrange`,
        '_blank'
      );
    });
  });

  const handleSwitchMode = useMemoizedFn(() => {
    setAutonomousMode(!autonomousMode);
  });

  const handleRemarkNodeVisible = useMemoizedFn(() => {
    setShowNodeRemarks(!showNodeRemarks);
    setNodes(nodes =>
      nodes?.map(node => {
        const data = cloneDeep(node.data);
        if (Object.prototype.hasOwnProperty.call(data.nodeParam, 'remark')) {
          data.nodeParam.remarkVisible = !showNodeRemarks;
        }
        return {
          ...node,
          data,
        };
      })
    );
  });

  const needGuide = useMemo(() => {
    //存储是否引导过，引导过无需再次引导
    if (localStorage.getItem('flowGuide')) return false;
    localStorage.setItem('flowGuide', 'true');
    return true;
  }, []);

  return (
    <>
      <FlowToolbar
        zoom={zoom}
        setZoom={setZoom}
        reactFlowInstance={reactFlowInstance}
        positionStartNode={positionStartNode}
        handleFlowReduction={handleFlowReduction}
        handleCopyFlow={handleCopyFlow}
        viewAbbreviation={viewAbbreviation}
        viewAdaptive={viewAdaptive}
        optimizeLayout={optimizeLayout}
        changeEdgeLine={changeEdgeLine}
        historys={historys}
        historyVersion={historyVersion}
        autonomousMode={autonomousMode}
        handleSwitchMode={handleSwitchMode}
        showNodeRemarks={showNodeRemarks}
        handleRemarkNodeVisible={handleRemarkNodeVisible}
        needGuide={needGuide}
        showBeginnerGuide={showBeginnerGuide}
        setShowBeginnerGuide={setShowBeginnerGuide}
      />
      {showMiniMap && <MiniMap />}
    </>
  );
}

export default memo(index);
