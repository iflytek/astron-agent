import React, { useCallback, memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Edge } from 'reactflow';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';

// 类型导入
import { CustomEdgeProps } from '@/components/workflow/types';

// 使用 reactflow 的 Edge 类型
type ReactFlowEdge = Edge;

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Edge 模块的图标
const icons = Icons.edge;

const CustomEdge = ({
  data,
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = { strokeWidth: 2, stroke: '#6356EA' },
  markerEnd,
}: CustomEdgeProps): React.ReactElement => {
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const path: string =
    data?.edgeType === 'polyline'
      ? `M ${sourceX},${sourceY} H ${
          (sourceX + targetX) / 2
        } V ${targetY} H ${targetX}`
      : edgePath;

  const onEdgeClick = useCallback((): void => {
    takeSnapshot();
    const edge = edges.find((edge: ReactFlowEdge) => edge.id === id);
    if (
      edge &&
      edges?.filter(
        (item: ReactFlowEdge) =>
          item?.source === edge?.source && item?.target === edge?.target
      )?.length === 1
    ) {
      removeNodeRef(edge.source, edge.target);
    }
    setEdges((edges: ReactFlowEdge[]) =>
      edges.filter((edge: ReactFlowEdge) => edge.id !== id)
    );
  }, [edges, setEdges, takeSnapshot, id, removeNodeRef]);

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {!canvasesDisabled && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="bg-[#fff] w-[30px] h-[30px] rounded-full border border-[#f5f7fc] shadow-md cursor-pointer items-center flex justify-center relative"
              onClick={onEdgeClick}
              style={{
                zIndex: 9999,
              }}
            >
              <img src={icons.delete} className="w-[14px] h-[14px]" alt="" />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(CustomEdge);
