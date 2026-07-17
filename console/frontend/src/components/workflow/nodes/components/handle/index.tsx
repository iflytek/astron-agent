import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Tooltip } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';

import nodeListAdd from '@/assets/imgs/workflow/node-list-add.png';

export const TargetHandle = ({
  isConnectable,
  id = '',
}): React.ReactElement => {
  return (
    <Handle
      id={id}
      type="target"
      className="w-3 h-3 rounded-full bg-flow-handle border-2 border-[#6356EA]"
      position={Position.Left}
      isConnectable={isConnectable}
    />
  );
};

export const SourceHandle = ({
  isConnectable,
  nodeId,
  id = '',
}): React.ReactElement => {
  const { handleEdgeAddNode } = useFlowCommon();
  const nodeList = useFlowsManager(state => state.nodeList);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const nodes = currentStore(state => state.nodes);
  const setNodes = currentStore(state => state.setNodes);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);
  const [showNodesList, setShowNodesList] = useState(false);

  useEffect(() => {
    const handleClickOutside = (): void => {
      setShowNodesList(false);
    };
    window.addEventListener('click', handleClickOutside);
    return (): void => window.removeEventListener('click', handleClickOutside);
  }, []);
  const currentNode = useMemo(() => {
    return nodes?.find(node => node.id === nodeId);
  }, [nodeId, nodes]);

  const isLoopContainer = useMemo(() => {
    return nodes?.find(node => node.id === iteratorId)?.nodeType === 'loop';
  }, [iteratorId, nodes]);

  const canAddNodes = useMemo(() => {
    const hiddenNodeTypes = showIterativeModal
      ? isLoopContainer
        ? ['iteration', 'loop']
        : ['iteration', 'loop', 'loop-exit']
      : ['loop-exit'];

    return nodeList
      ?.filter(node => node?.name !== '固定节点')
      ?.flatMap(item => item?.nodes)
      ?.filter(item => !hiddenNodeTypes.includes(item?.idType));
  }, [nodeList, showIterativeModal, isLoopContainer]);

  const generatePosition = useCallback(() => {
    const nodeElement = showIterativeModal
      ? document
          .getElementById('iterator-flow-container')
          ?.querySelector(`[data-id= "${nodeId}"]`)
      : document.querySelector(`[data-id= "${nodeId}"]`);
    const { width = 0 } = nodeElement?.getBoundingClientRect() ?? {};
    const viewPoint = reactFlowInstance?.getViewport();
    const xPos = currentNode?.position.x;
    const yPos = currentNode?.position.y;
    const zoom = 1 / viewPoint.zoom;
    return {
      x: xPos + width * zoom + 100,
      y: yPos,
    };
  }, [currentNode, reactFlowInstance, showIterativeModal, nodeId]);

  const handleClickNode = useCallback(
    (node): void => {
      handleEdgeAddNode(node, generatePosition(), id, currentNode);
    },
    [currentNode, reactFlowInstance, showIterativeModal, nodeId, id]
  );

  const handleShowNodesList = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      e.stopPropagation();
      setShowNodesList(!showNodesList);
      setNodes(nodes =>
        nodes?.map(node => ({
          ...node,
          selected: !showNodesList && node?.id === nodeId ? true : false,
        }))
      );
    },
    [showNodesList, setShowNodesList, setNodes, nodeId]
  );

  const addNodeIcon = useMemo(() => {
    return (
      <div
        className="
    z-10 flex h-4
    w-4 cursor-pointer items-center justify-center rounded-full bg-components-button-primary-bg text-text-primary-on-surface hover:bg-components-button-primary-bg-hover
    hidden absolute top-[3px] left-[3px] pointer-events-none handle-add-icon"
        data-state="closed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          fill="none"
          version="1.1"
          width="8"
          height="8"
          viewBox="0 0 8 8"
        >
          <g>
            <g></g>
            <g>
              <path
                d="M0,4.99906875L1,4.99905875L7,4.99905875L8,4.99906875L8,2.9990567500000003L7,2.99906175L1,2.99906175L0,2.9990567500000003L0,4.99906875Z"
                fill-rule="evenodd"
                fill="#FFFFFF"
                fill-opacity="1"
              />
            </g>
            <g>
              <path
                d="M2.9999722773437503,0L2.99997727734375,1L2.99997727734375,7L2.9999722773437503,8L4.99998427734375,8L4.99997427734375,7L4.99997427734375,1L4.99998427734375,0L2.9999722773437503,0Z"
                fill-rule="evenodd"
                fill="#FFFFFF"
                fill-opacity="1"
              />
            </g>
          </g>
        </svg>
      </div>
    );
  }, []);
  return (
    <>
      <Tooltip
        title={
          <div>
            <div>点击添加节点</div>
            <div>拖拽连接节点</div>
          </div>
        }
        overlayClassName="black-tooltip config-secret"
      >
        <Handle
          id={id}
          type="source"
          className="w-3 h-3 rounded-full bg-flow-handle border-2 border-[#6356EA]"
          position={Position.Right}
          isConnectable={isConnectable}
          onClick={handleShowNodesList}
        >
          {addNodeIcon}
        </Handle>
      </Tooltip>
      {showNodesList && (
        <div
          className="absolute  top-1/2 right-[-20px] transform translate-x-full -translate-y-1/2 rounded-lg p-2 bg-[#fff]"
          style={{
            width: '280px',
            zIndex: 1001,
            boxShadow: '0px 2px 4px 0px rgba(46,51,68,0.04)',
            border: '1px solid #E0E3E7',
          }}
        >
          {canAddNodes?.map((node, index) => (
            <div
              key={index}
              className="flex items-center justify-between cursor-pointer p-2 pr-4 rounded-lg hover:bg-[#e6f4ff]"
              onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
                e.stopPropagation();
                setShowNodesList(false);
                handleClickNode(node);
              }}
            >
              <div className="flex items-center gap-1.5">
                <img src={node?.data?.icon} className="w-5 h-5" alt="" />
                <span>{node?.aliasName}</span>
              </div>
              <img src={nodeListAdd} className="w-[13px] h-[13px]" alt="" />
            </div>
          ))}
        </div>
      )}
    </>
  );
};
