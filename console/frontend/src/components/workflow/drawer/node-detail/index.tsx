import React, { useMemo, useEffect, useState } from 'react';
import { Button, Drawer, Empty, Tabs, Tag } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useAuthoringDrawerStyle } from '../../hooks/use-authoring-drawer-style';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import NodeOperation from '@/components/workflow/nodes/components/node-operation';
import { Label } from '@/components/workflow/nodes/node-common';
import { nodeTypeComponentMap } from '@/components/workflow/constant';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

import type { WorkflowNode } from '@/components/workflow/types/domain';
import './index.scss';

const formatResult = (value: unknown): string =>
  typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? '');

function LastNodeRun({ node }: { node?: WorkflowNode }): React.ReactElement {
  const result = node?.data.debuggerResult;
  const status = node?.data.status;
  if (!status && !result) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="还没有运行记录。测试工作流或该节点后，可在这里查看输入和输出。"
      />
    );
  }
  const blocks: Array<[string, unknown]> = [
    ['输入', result?.input],
    ['输出', result?.output],
    ['原始输出', result?.rawOutput],
    ['思考过程', result?.reasoningContent],
    ['回复内容', result?.answerContent],
    ['错误信息', result?.errorOutputs],
  ];
  return (
    <div className="workflow-node-last-run">
      <div className="workflow-node-run-summary" role="status">
        {status && (
          <Tag
            color={
              status === 'success'
                ? 'success'
                : status === 'failed'
                  ? 'error'
                  : status === 'cancel'
                    ? 'default'
                    : 'processing'
            }
          >
            {status === 'success'
              ? '运行成功'
              : status === 'failed'
                ? '运行失败'
                : status === 'cancel'
                  ? '已停止'
                  : '运行中'}
          </Tag>
        )}
        {result?.timeCost != null && <span>{result.timeCost}s</span>}
        {result?.tokenCost != null && <span>{result.tokenCost} Tokens</span>}
      </div>
      {(result?.failedReason || result?.cancelReason) && (
        <p className="workflow-node-run-message" role="status">
          {result.failedReason || result.cancelReason}
        </p>
      )}
      {blocks
        .filter(
          ([, value]) => value !== undefined && value !== null && value !== ''
        )
        .map(([label, value]) => (
          <section key={label} className="workflow-node-result-section">
            <h3>{label}</h3>
            <pre tabIndex={0}>{formatResult(value)}</pre>
          </section>
        ))}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState('settings');
  const close = (): void =>
    setNodeInfoEditDrawerlInfo({ open: false, nodeId: '' });

  const nodeInfo = useMemo(() => {
    return nodes?.find(item => item?.id === nodeInfoEditDrawerlInfo.nodeId);
  }, [nodes, nodeInfoEditDrawerlInfo.nodeId]);

  useEffect(() => {
    setUpdateNodeInputData(updateNodeInputData => !updateNodeInputData);
    setActiveTab('settings');
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
      <div className="workflow-node-panel-header">
        <div className="workflow-node-panel-identity">
          <div className="workflow-node-panel-name">
            <img src={nodeIcon} className="workflow-node-panel-icon" alt="" />
            {nodeInfo && (
              <Label
                data={nodeInfo.data}
                id={nodeInfo.id}
                maxWidth={300}
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
        <p className="workflow-node-panel-description">{nodeDesciption}</p>
      </div>
      <Tabs
        className="workflow-node-panel-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'settings',
            label: '配置',
            children: (
              <div className="workflow-node-settings" key={nodeInfo?.id}>
                {renderComponent()}
              </div>
            ),
          },
          {
            key: 'last-run',
            label: '最近运行',
            children: <LastNodeRun node={nodeInfo} />,
          },
        ]}
      />
    </Drawer>
  );
}

export default index;
