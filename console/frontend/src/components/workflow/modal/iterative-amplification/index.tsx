import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { cloneDeep } from 'lodash';
import ReactFlow, {
  Background,
  Connection,
  Edge,
  NodeDragHandler,
  OnSelectionChangeParams,
  updateEdge,
  Panel,
  OnMove,
  Node,
  XYPosition,
} from 'reactflow';
import {
  ConnectionLineProps,
  FlowContainerProps,
  useIterativeAmplificationProps,
} from '@/components/workflow/types';
import { message } from 'antd';
import NodeList from '@/pages/workflow/components/node-list';
import useIteratorFlowStore from '@/components/workflow/store/use-iterator-flow-store';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import FlowPanel from '@/components/workflow/panel';
import { ReactFlowProvider } from 'reactflow';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import {
  AddNodeType,
  PositionType,
} from '@/components/workflow/types/drawer/chat-debugger';

import CustomNode from '@/components/workflow/nodes';
import CustomEdge from '@/components/workflow/edges';

import smallScreenIcon from '@/assets/imgs/workflow/small-screen-icon.png';
import { useMemoizedFn } from 'ahooks';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

const ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle = { strokeWidth: 2, stroke: '#6356EA' }, // provide a default value for connectionLineStyle
}: ConnectionLineProps): React.ReactElement => {
  return (
    <g>
      <path
        fill="none"
        // ! Replace hash # colors here
        className="animated stroke-connection "
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
        style={connectionLineStyle}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke="#222"
        className=""
        strokeWidth={1.5}
      />
    </g>
  );
};

const useKeyboardHandlers = ({
  lastSelection,
  startIterativeWorkflowKeydownEvent,
}): void => {
  const position = useRef({ x: 0, y: 0 });
  const takeSnapshot = useIteratorFlowStore(state => state.takeSnapshot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const edges = currentStore(state => state.edges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const deleteNode = currentStore(state => state.deleteNode);
  const setEdges = currentStore(state => state.setEdges);
  const undo = currentStore(state => state.undo);
  const paste = currentStore(state => state.paste);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const handleDelete = useMemoizedFn((): void => {
    takeSnapshot();
    lastSelection.nodes = lastSelection?.nodes?.filter(
      node =>
        node.nodeType !== 'iteration-node-start' &&
        node.nodeType !== 'iteration-node-end' &&
        node.nodeType !== 'loop-node-start' &&
        node.nodeType !== 'loop-node-end'
    );
    const edgeIds = lastSelection?.edges?.map(edge => edge?.id);
    const leftEdges = edges.filter(edge => !edgeIds?.includes(edge?.id));
    lastSelection?.edges?.forEach(edge => {
      if (
        leftEdges?.filter(
          item => item?.source === edge?.source && item?.target === edge?.target
        )?.length === 0
      ) {
        removeNodeRef(edge.source, edge.target);
      }
    });
    lastSelection?.nodes?.map(node => deleteNode(node?.id));
    setEdges(edges => edges.filter(edge => !edgeIds?.includes(edge?.id)));
    canPublishSetNot();
  });

  useEffect((): void | (() => void) => {
    const handleKeyDown = async (event: KeyboardEvent): void => {
      event.stopPropagation();
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'c' &&
        lastSelection
      ) {
        const cloneLastSelection = cloneDeep(lastSelection);
        cloneLastSelection.nodes = cloneLastSelection.nodes?.filter(node => {
          if (node?.data?.parentId) {
            return true;
          }
          return (
            node.nodeType !== 'iteration-node-start' &&
            node.nodeType !== 'iteration-node-end' &&
            node.nodeType !== 'loop-node-start' &&
            node.nodeType !== 'loop-node-end'
          );
        });
        try {
          await navigator.clipboard.writeText(
            JSON.stringify(cloneLastSelection)
          );
          message.success('复制成功');
        } catch (err) {
          message.error('[Clipboard] 复制失败', err);
        }
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'v' &&
        lastSelection
      ) {
        event.preventDefault();
        paste();
      } else if (
        ['Backspace', 'Delete']?.includes(event.key) &&
        lastSelection
      ) {
        handleDelete();
      }
    };

    const handleMouseMove = (event: MouseEvent): void => {
      position.current = { x: event.clientX, y: event.clientY };
    };

    startIterativeWorkflowKeydownEvent &&
      window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);

    return (): void => {
      startIterativeWorkflowKeydownEvent &&
        window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [lastSelection, startIterativeWorkflowKeydownEvent, edges]);
};

const useIterativeAmplification = ({
  lastSelection,
  setLastSelection,
  handleAddNode,
}): useIterativeAmplificationProps => {
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const setFlowNodes = useFlowStore(state => state.setNodes);
  const setFlowEdges = useFlowStore(state => state.setEdges);
  const switchNodeRef = useIteratorFlowStore(state => state.switchNodeRef);
  const takeSnapshot = useIteratorFlowStore(state => state.takeSnapshot);
  const edgeType = useFlowsManager(state => state.edgeType);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const setCurrentStore = useFlowsManager(state => state.setCurrentStore);
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const setShowIterativeModal = useFlowsManager(
    state => state.setShowIterativeModal
  );
  const reactFlowInstance = useIteratorFlowStore(
    state => state.reactFlowInstance
  );
  const beforeNodes = useRef<Node[]>([]);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const setZoom = currentStore(state => state.setZoom);
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };

  const handleDropAllowed = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropZoneRect = dropZoneRef.current?.getBoundingClientRect() ?? {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    };
    const x = event.clientX - dropZoneRect.left;
    const y = event.clientY - dropZoneRect.top;
    const viewPoint = reactFlowInstance?.getViewport() ?? {
      x: 0,
      y: 0,
      zoom: 1,
    };
    const zoom = 1 / viewPoint.zoom;
    handleAddNode(willAddNode, {
      x: (x - viewPoint.x) * zoom,
      y: (y - viewPoint.y) * zoom,
    });
  };

  const onEdgeUpdate = useMemoizedFn(
    (oldEdge: Edge, newConnection: Connection) => {
      const isExistEdge = edges?.some(
        item =>
          item.target === newConnection.target &&
          item.source === newConnection.source
      );
      if (!isExistEdge) {
        switchNodeRef({ ...newConnection }, { ...oldEdge });
        setEdges(els => updateEdge(oldEdge, newConnection, els));
      }
    }
  );

  const onSelectionChange = useMemoizedFn(
    (flow: OnSelectionChangeParams): void => {
      setLastSelection(flow);
    }
  );

  const onNodeDragStart: NodeDragHandler = useMemoizedFn(() => {
    takeSnapshot(false);
  });

  const onMoveEnd: OnMove = useMemoizedFn((event, viewport): void => {
    const zoom = viewport?.zoom || 0.8;
    setZoom(Math.round(zoom * 100));
  });
  const generateIteratorPosition = useMemoizedFn(
    (
      basePosition: { x: number; y: number },
      position: { x: number; y: number },
      offsetY: number
    ) => {
      const currentPositionX = (position?.x - basePosition?.x) / 4 + 30;
      const currentPositionY =
        (position?.y - basePosition?.y + offsetY) / 4 + 150;
      return {
        x: currentPositionX ? currentPositionX : 20,
        y: currentPositionY ? currentPositionY : 20,
      };
    }
  );

  const getDimensions = useMemoizedFn(
    (positions: Node[]): XYPosition | undefined => {
      if (!positions.length) return null;
      let minXPosition = positions[0];

      positions.forEach(item => {
        if (item.position.x < minXPosition.position.x) {
          minXPosition = item;
        }
      });
      return minXPosition?.position;
    }
  );

  const getOffsetY = useMemoizedFn((y: number, positions: Node[]): number => {
    let offsetY = 0;
    positions.forEach(item => {
      if (y - item.position.y > offsetY) {
        offsetY = y - item.position.y;
      }
    });
    return offsetY;
  });

  const addNodeToFlow = useMemoizedFn((): void => {
    const nodeIds = beforeNodes?.current?.map(node => node?.id);
    const basePosition = getDimensions(nodes);
    const offsetY = getOffsetY(basePosition?.y || 0, nodes);
    setShowIterativeModal(false);
    setCurrentStore('flow');
    setFlowNodes(flowNodes =>
      cloneDeep([
        ...flowNodes.filter(node => node?.data?.parentId !== iteratorId),
        ...nodes.map(node => ({
          ...node,
          parentId: iteratorId,
          extent: 'parent',
          zIndex: 1,
          draggable: false,
          position: generateIteratorPosition(
            basePosition || { x: 0, y: 0 },
            node?.position,
            offsetY
          ),
          data: {
            ...node.data,
            originPosition: node?.position,
            parentId: iteratorId,
          },
        })),
      ])
    );
    setFlowEdges(flowEdges =>
      cloneDeep([
        ...flowEdges
          .filter(
            edge =>
              !nodeIds?.includes(edge?.target) &&
              !nodeIds?.includes(edge?.source)
          )
          .map(edge => ({
            ...edge,
            data: {
              edgeType: edgeType,
            },
          })),
        ...edges.map(edge => ({
          ...edge,
          zIndex: 1001,
          data: {
            edgeType: edgeType,
          },
        })),
      ])
    );
    autoSaveCurrentFlow();
  });

  return {
    beforeNodes,
    dropZoneRef,
    lastSelection,
    addNodeToFlow,
    onEdgeUpdate,
    onSelectionChange,
    onNodeDragStart,
    onMoveEnd,
    handleDragOver,
    handleDropAllowed,
  };
};

function FlowContainer({
  zoom,
  setZoom,
  handleAddNode,
}: FlowContainerProps): React.ReactElement {
  const { startIterativeWorkflowKeydownEvent } = useFlowCommon();
  const reactFlowInstance = useIteratorFlowStore(
    state => state.reactFlowInstance
  );
  const nodes = useIteratorFlowStore(state => state.nodes);
  const edges = useIteratorFlowStore(state => state.edges);
  const setReactFlowInstance = useIteratorFlowStore(
    state => state.setReactFlowInstance
  );
  const onNodesChange = useIteratorFlowStore(state => state.onNodesChange);
  const onEdgesChange = useIteratorFlowStore(state => state.onEdgesChange);
  const setNodes = useIteratorFlowStore(state => state.setNodes);
  const setEdges = useIteratorFlowStore(state => state.setEdges);
  const onConnect = useIteratorFlowStore(state => state.onConnect);
  const flowNodes = useFlowStore(state => state.nodes);
  const flowEdges = useFlowStore(state => state.edges);
  const setHistorys = useIteratorFlowStore(state => state.setHistorys);
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const controlMode = useFlowsManager(state => state.controlMode);
  const [lastSelection, setLastSelection] =
    useState<OnSelectionChangeParams | null>(null);
  useKeyboardHandlers({
    lastSelection,
    startIterativeWorkflowKeydownEvent,
  });
  const {
    beforeNodes,
    dropZoneRef,
    handleDragOver,
    handleDropAllowed,
    onEdgeUpdate,
    onNodeDragStart,
    onSelectionChange,
    onMoveEnd,
    addNodeToFlow,
  } = useIterativeAmplification({
    lastSelection,
    setLastSelection,
    handleAddNode,
  });

  useEffect(() => {
    if (iteratorId) {
      const nodes = flowNodes
        .filter(node => node?.data?.parentId === iteratorId)
        .map(node => ({
          ...node,
          draggable: !canvasesDisabled,
          position: node?.data?.originPosition,
          data: {
            ...node?.data,
            parentId: '',
          },
          parentId: '',
          extent: undefined,
          zIndex: 0,
        }));
      const nodeIds = nodes.map(node => node?.id);
      const edges = flowEdges.filter(
        edge =>
          nodeIds?.includes(edge?.target) || nodeIds?.includes(edge?.source)
      );
      beforeNodes.current = nodes;
      setNodes(cloneDeep(nodes));
      setEdges(cloneDeep(edges.map(edge => ({ ...edge, zIndex: 0 }))));
      setHistorys([]);
    }
  }, [iteratorId, flowNodes, flowEdges, canvasesDisabled]);

  useEffect(() => {
    const zoom = reactFlowInstance?.getViewport?.()?.zoom
      ? Math.round(reactFlowInstance?.getViewport?.()?.zoom * 100)
      : 80;
    setZoom(zoom);
  }, [reactFlowInstance]);

  //在非对话和非多开的情况下才允许编辑画布
  const canUseCanvases = useMemo(() => {
    return !canvasesDisabled;
  }, [canvasesDisabled]);

  return (
    <div
      id="iterator-flow-container"
      className="relative flex-1 h-full flow-container"
      onDragOver={handleDragOver}
      onDrop={handleDropAllowed}
      ref={dropZoneRef}
    >
      <ReactFlow
        minZoom={0.01}
        maxZoom={2}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodes}
        edges={edges}
        onInit={setReactFlowInstance}
        onEdgeUpdate={onEdgeUpdate}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineComponent={ConnectionLineComponent}
        nodeDragThreshold={3}
        onNodeDragStart={onNodeDragStart}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        nodesDraggable={canUseCanvases}
        elementsSelectable={canUseCanvases}
        nodesConnectable={canUseCanvases}
        deleteKeyCode={[]}
        multiSelectionKeyCode="Shift"
        panOnDrag={controlMode === 'mouse'}
        selectionOnDrag={controlMode === 'touch'}
        panOnScroll={controlMode === 'touch'}
      >
        <Background />
        <Panel position="top-right">
          <div
            className="w-[28px] h-[28px] bg-[#fff] rounded-md justify-center items-center cursor-pointer shadow-md"
            onClick={() => addNodeToFlow()}
          >
            <img src={smallScreenIcon} className="w-6 h-6" alt="" />
          </div>
        </Panel>
        <FlowPanel
          reactFlowInstance={reactFlowInstance}
          zoom={zoom}
          setZoom={setZoom}
        />
      </ReactFlow>
    </div>
  );
}

function IterativeAmplificationModal(): React.ReactElement {
  const { t } = useTranslation();
  const zoom = useIteratorFlowStore(state => state.zoom);
  const setZoom = useIteratorFlowStore(state => state.setZoom);
  const setShowIterativeModal = useFlowsManager(
    state => state.setShowIterativeModal
  );
  const showNodeList = useFlowsManager(state => state.showNodeList);
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const mainFlowNodes = useFlowStore(state => state.nodes);
  const setWillAddNode = useFlowsManager(state => state.setWillAddNode);
  const { handleAddNode: handleAddNodeBase } = useFlowCommon();

  const isParallelIterator = useMemo(() => {
    if (!iteratorId) return false;
    const iteratorNode = mainFlowNodes?.find(n => n?.id === iteratorId);
    return iteratorNode?.data?.nodeParam?.runMode === 'parallel';
  }, [iteratorId, mainFlowNodes]);

  const isLoopContainer = useMemo(() => {
    if (!iteratorId) return false;
    const iteratorNode = mainFlowNodes?.find(n => n?.id === iteratorId);
    return iteratorNode?.nodeType === 'loop';
  }, [iteratorId, mainFlowNodes]);

  const handleAddNode = useMemoizedFn(
    (addNode: AddNodeType, position: PositionType) => {
      if (isParallelIterator && addNode?.idType === 'question-answer') {
        message.warning(
          t('workflow.nodes.iteratorNode.parallelModeNoQaInSubCanvas')
        );
        setWillAddNode(null);
        return;
      }
      return handleAddNodeBase(addNode, position);
    }
  );

  return (
    <>
      {createPortal(
        <div className="mask">
          <div
            className="flex items-start modalContent"
            style={{
              height: '87vh',
              width: '90%',
            }}
          >
            {showNodeList && (
              <NodeList
                noIterator={true}
                hiddenIdTypes={
                  isLoopContainer
                    ? ['iteration', 'loop']
                    : ['iteration', 'loop', 'loop-exit']
                }
                hiddenAliasNames={isParallelIterator ? ['问答节点'] : []}
                handleAddNode={handleAddNode}
              />
            )}
            <FlowContainer
              zoom={zoom}
              setZoom={setZoom}
              setShowIterativeModal={setShowIterativeModal}
              handleAddNode={handleAddNode}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function IterativeAmplificationModalReactFlowProvider(): React.ReactElement {
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);

  return (
    <>
      {showIterativeModal ? (
        <ReactFlowProvider>
          <IterativeAmplificationModal />
        </ReactFlowProvider>
      ) : null}
    </>
  );
}

export default IterativeAmplificationModalReactFlowProvider;
