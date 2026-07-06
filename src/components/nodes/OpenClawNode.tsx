import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface OpenClawNodeData {
  label: string;
  skillId: string;
  inputParams?: Record<string, any>;
  outputParams?: Record<string, any>;
  preConditions?: string[];
  postConditions?: string[];
}

const OpenClawNode: React.FC<NodeProps<OpenClawNodeData>> = ({ data, selected }) => {
  return (
    <div className={`openclaw-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-icon">⚙️</span>
        <span className="node-label">{data.label || 'OpenClaw Action'}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>Skill ID:</label>
          <span>{data.skillId || 'Not set'}</span>
        </div>
        <div className="node-field">
          <label>Input Params:</label>
          <span>{data.inputParams ? Object.keys(data.inputParams).length : 0} configured</span>
        </div>
        <div className="node-field">
          <label>Output Params:</label>
          <span>{data.outputParams ? Object.keys(data.outputParams).length : 0} configured</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(OpenClawNode);