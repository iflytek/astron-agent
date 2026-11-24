import './index.scss';
import type { NodeComponentProps } from '@/components/workflow/nodes/types';
import React from 'react';
import { InputNumber } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

export default function ChatHistory({
  id,
  data,
}: NodeComponentProps): React.ReactElement {
  const { handleChangeNodeParam } = useNodeCommon({ id, data });
  const disabled = useFlowsManager(state => state.canvasesDisabled);
  return (
    <div
      className="workflow-history-setting"
      onClick={event => event.stopPropagation()}
    >
      <div>
        <label htmlFor={`history-rounds-${id}`}>携带最近对话</label>
        <p>每轮包含一次用户输入和工作流回复，仅在当前会话内生效。</p>
      </div>
      <div className="workflow-history-rounds">
        <InputNumber
          id={`history-rounds-${id}`}
          aria-label="对话历史轮数"
          value={data.nodeParam.enableChatHistoryV2?.rounds ?? 1}
          min={1}
          max={20}
          precision={0}
          disabled={disabled}
          onChange={value => {
            if (value === null) return;
            handleChangeNodeParam((node, rounds) => {
              node.nodeParam.enableChatHistoryV2 = {
                isEnabled: true,
                rounds: Math.min(20, Math.max(1, Math.trunc(rounds))),
              };
            }, value);
          }}
        />
        <span>轮</span>
      </div>
    </div>
  );
}
