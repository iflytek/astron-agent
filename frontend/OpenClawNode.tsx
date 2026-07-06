import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

export default function OpenClawNode({ data, isConnectable }: NodeProps) {
  return (
    <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div style={{ fontWeight: 'bold', marginBottom: 5 }}>🤖 OpenClaw Skill</div>
      <div style={{ fontSize: 12 }}>{data.label || '未命名技能'}</div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
