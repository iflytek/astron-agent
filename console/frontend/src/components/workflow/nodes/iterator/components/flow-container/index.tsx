import React, { useEffect, useCallback, useState } from 'react';
import { Background, Panel } from 'reactflow';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';

import fullScreenIcon from '@/assets/imgs/workflow/full-screen-icon.png';

function index(props): React.ReactElement {
  const { id } = props;

  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const setIteratorId = useFlowsManager(state => state.setIteratorId);
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const setShowIterativeModal = useFlowsManager(
    state => state.setShowIterativeModal
  );
  const setCurrentStore = useFlowsManager(state => state.setCurrentStore);
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const nodes = currentStore(state => state.nodes);
  const setNode = currentStore(state => state.setNode);
  const [style, setStyle] = useState({
    width: 0,
    height: 0,
  });

  const getDimensions = useCallback(positions => {
    if (!positions.length) return { width: 0, height: 0 };

    let minX = positions[0].position.x;
    let maxX = positions[0].position.x;
    let minY = positions[0].position.y;
    let maxY = positions[0].position.y;

    positions.forEach(item => {
      const { x, y } = item.position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const width = (maxX - minX) * 1.2;
    const height = (maxY - minY) * 1.3 + 60;

    return { width, height };
  }, []);

  useEffect(() => {
    const iterationNodes = nodes?.filter(node => node?.data?.parentId === id);
    const { width, height } = getDimensions(iterationNodes);
    setStyle({
      width,
      height,
    });
  }, []);

  useEffect(() => {
    if (iteratorId === id && !showIterativeModal) {
      const iterationNodes = nodes?.filter(
        node => node?.data?.parentId === iteratorId
      );
      const { width, height } = getDimensions(iterationNodes);
      setStyle({
        width,
        height,
      });
    }
  }, [showIterativeModal, iteratorId, nodes]);

  const handleFullScreen = useMemoizedFn(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setIteratorId(id);
      setShowIterativeModal(true);
      setCurrentStore('iterator');
      setNodeInfoEditDrawerlInfo({
        open: false,
        nodeId: '',
      });
      setNode(id, old => {
        return {
          ...old,
          selected: false,
        };
      });
    }
  );

  return (
    <div
      className="relative min-h-[158px] rounded-2xl px-[18px] pointer-events-none min-w-[312px]"
      style={{
        ...style,
      }}
    >
      <Background id={`iteration-background-${id}`}></Background>
      <Panel position="top-right">
        <div
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center bg-[#fff] shadow-md cursor-pointer"
          onClick={handleFullScreen}
        >
          <img src={fullScreenIcon} className="w-4 h-4" alt="" />
        </div>
      </Panel>
    </div>
  );
}

export default index;
