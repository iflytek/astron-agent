import React, { useMemo, useEffect } from 'react';
import { Button, Drawer } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useAuthoringDrawerStyle } from '../../hooks/use-authoring-drawer-style';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import NodeOperation from '@/components/workflow/nodes/components/node-operation';
import { Label } from '@/components/workflow/nodes/node-common';
import { nodeTypeComponentMap } from '@/components/workflow/constant';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

// 类型导入

// 从统一的图标管理中导入

function index(): React.ReactElement {
  const nodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.nodeInfoEditDrawerlInfo
  );
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setUpdateNodeInputData = useFlowsManager(
    state => state.setUpdateNodeInputData
  );
  const nodes = currentStore(state => state.nodes);
  const rootStyle = useAuthoringDrawerStyle();
  const close = (): void =>
    setNodeInfoEditDrawerlInfo({ open: false, nodeId: '' });

  const nodeInfo = useMemo(() => {
    return nodes?.find(item => item?.id === nodeInfoEditDrawerlInfo.nodeId);
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
  } = useNodeCommon({
    id: nodeInfo?.id || '',
    data: nodeInfo?.data,
  });

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
      rootClassName={`workflow-authoring-drawer advanced-configuration-container node-info-edit-container ${
        isCodeNode ? 'code-node-edit-container' : ''
      }`}
      placement="right"
      open={nodeInfoEditDrawerlInfo?.open}
      rootStyle={rootStyle}
      mask={false}
      title="节点配置"
      onClose={close}
    >
      <div className="w-full p-[14px] pb-[6px] sticky top-0 bg-white z-10">
        <div className="w-full flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <img src={nodeIcon} className="w-[18px] h-[18px]" alt="" />
            {nodeInfo && (
              <Label
                data={nodeInfo.data}
                id={nodeInfo.id}
                maxWidth={250}
                labelInput="labelInput1"
              />
            )}
            {renderTypeOneClickUpdate()}
          </div>
          <div className="flex items-center gap-3">
            {showNodeOperation && nodeInfo && (
              <NodeOperation
                id={nodeInfo.id}
                data={nodeInfo.data}
                labelInput="labelInput1"
              />
            )}
            <Button
              type="text"
              aria-label="关闭节点配置"
              icon={<CloseOutlined />}
              onClick={close}
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
