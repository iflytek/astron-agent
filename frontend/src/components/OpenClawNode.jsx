import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

const OpenClawNode = ({ data }) => {
  return (
    <div className="openclaw-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <strong>OpenClaw Action</strong>
      </div>
      <div className="node-body">
        <label>Skill:</label>
        <input value={data.skill || ''} onChange={(e) => data.onChange?.('skill', e.target.value)} />
        <label>Params:</label>
        <textarea value={data.params || ''} onChange={(e) => data.onChange?.('params', e.target.value)} />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default OpenClawNode;
