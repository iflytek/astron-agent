import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const OpenClawNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div style={{
      padding: '10px',
      borderRadius: '8px',
      border: `2px solid ${selected ? '#1890ff' : '#d9d9d9'}`,
      background: '#fff',
      minWidth: '150px',
      fontSize: '12px',
      color: '#333',
      boxShadow: selected ? '0 0 4px rgba(24,144,255,0.5)' : 'none'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🤖 OpenClaw</div>
      <div>{data.label || 'OpenClaw Skill'}</div>
      <div style={{ fontSize: '10px', color: '#999' }}>Skill: {data.skillName || 'N/A'}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
      <Handle type="target" position={Position.Top} id="condition" style={{ background: '#1890ff', top: 0 }} />
      <Handle type="source" position={Position.Bottom} id="condition-out" style={{ background: '#1890ff', bottom: 0 }} />
    </div>
  );
};

export default memo(OpenClawNode);