import React, { useMemo, useEffect, useState } from 'react';
import { Drawer } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import NodeOperation from '@/components/workflow/nodes/components/node-operation';
import { Label } from '@/components/workflow/nodes/node-common';
import cloneDeep from 'lodash/cloneDeep';
import { nodeTypeComponentMap } from '@/components/workflow/constant';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

// 类型导入
import {
  NodeInfoEditDrawerlInfo,
  RootStyle,
  NodeDetailComponent,
  NodeCommonResult,
  ReactFlowNode,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Node Detail 模块的图标
const icons = Icons.nodeDetail;

function index(): React.ReactElement {
  const nodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.nodeInfoEditDrawerlInfo
  ) as NodeInfoEditDrawerlInfo;
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  ) as (info: NodeInfoEditDrawerlInfo) => void;
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setUpdateNodeInputData = useFlowsManager(
    state => state.setUpdateNodeInputData
  );
  const nodes = currentStore(state => state.nodes) as ReactFlowNode[];
  const [rootStyle, setRootStyle] = useState<RootStyle>({
    height: (window?.innerHeight ?? 0) - 80,
    top: 80,
    right: 0,
  });

  useEffect(() => {
    const handleResize = (): void => {
      setRootStyle({
        height: (window?.innerHeight ?? 0) - 80,
        top: 80,
        right: 0,
      });
    };
    window.addEventListener('resize', handleResize);
    return (): void => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const nodeInfo = useMemo<NodeDetailComponent | undefined>(() => {
    return nodes?.find(
      (item: ReactFlowNode) => item?.id === nodeInfoEditDrawerlInfo.nodeId
    );
  }, [nodes, nodeInfoEditDrawerlInfo.nodeId]);

  useEffect(() => {
    setUpdateNodeInputData(updateNodeInputData => !updateNodeInputData);
  }, [nodeInfoEditDrawerlInfo.nodeId]);

  const {
    renderTypeOneClickUpdate,
    showNodeOperation,
    nodeDesciption,
    isCodeNode,
    nodeIcon,
  }: NodeCommonResult = useNodeCommon({
    id: nodeInfo?.id || '',
    data: nodeInfo?.data,
  });

  const data = useMemo<unknown>(() => {
    return nodeInfo?.data;
  }, [nodeInfo?.data]);

  const renderComponent = useMemoizedFn((): React.ReactElement | null => {
    if (!nodeInfo?.nodeType || !nodeInfo?.id) return null;

    // 通过映射表找到对应组件
    const Component = nodeTypeComponentMap[nodeInfo.nodeType];
    if (Component) {
      return <Component {...nodeInfo} id={nodeInfo.id} />;
    }
    return null;
  });

  return (
    <Drawer
      rootClassName={`advanced-configuration-container node-info-edit-container ${
        isCodeNode ? 'code-node-edit-container' : ''
      }`}
      placement="right"
      open={nodeInfoEditDrawerlInfo?.open}
      rootStyle={rootStyle}
      mask={false}
    >
      <div className="w-full p-[14px] pb-[6px] sticky top-0 bg-white z-10">
        <div className="w-full flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <img src={nodeIcon} className="w-[18px] h-[18px]" alt="" />
            <Label
              {...({
                data,
                id: nodeInfo?.id || '',
                maxWidth: 250,
                labelInput: 'labelInput1',
              } as unknown)}
            />
            {renderTypeOneClickUpdate()}
          </div>
          <div className="flex items-center gap-3">
            {showNodeOperation && (
              <NodeOperation
                id={nodeInfo?.id || ''}
                data={nodeInfo?.data}
                labelInput="labelInput1"
              />
            )}
            <img
              src={icons.close}
              className="w-3 h-3 cursor-pointer"
              alt=""
              onClick={(e: React.MouseEvent<HTMLImageElement>) => {
                e.stopPropagation();
                setNodeInfoEditDrawerlInfo(
                  cloneDeep({
                    open: false,
                    nodeId: '',
                  })
                );
              }}
            />
          </div>
        </div>
        <p className="text-desc max-w-[500px] ">{nodeDesciption}</p>
      </div>
      {renderComponent()}
    </Drawer>
  );
}

export default index;
