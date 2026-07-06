import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface OpenClawNodeData {
  label: string;
  skillId?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  preconditions?: string[];
  postconditions?: string[];
}

const OpenClawNode: React.FC<NodeProps<OpenClawNodeData>> = ({ data, selected }) => {
  return (
    <div className={`openclaw-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-icon">🔧</span>
        <span className="node-title">{data.label || 'OpenClaw Skill'}</span>
      </div>
      <div className="node-body">
        {data.skillId && <div>Skill: {data.skillId}</div>}
        {data.inputMapping && <div>Inputs: {Object.keys(data.inputMapping).join(', ')}</div>}
        {data.outputMapping && <div>Outputs: {Object.keys(data.outputMapping).join(', ')}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(OpenClawNode);
