import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OpenClawNodeData } from '../types';

export const OpenClawNode: React.FC<NodeProps<OpenClawNodeData>> = ({ data, selected }) => {
  return (
    <div className={`openclaw-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="icon">⚡</span>
        <span className="label">OpenClaw Skill</span>
      </div>
      <div className="node-body">
        <p>{data.skillName || 'Select Skill'}</p>
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="parameters">
            <strong>Parameters:</strong>
            <ul>
              {Object.entries(data.parameters).map(([key, value]) => (
                <li key={key}>{key}: {value}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};