import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => {
  return (
    <div style={{
      background: '#f0f4ff',
      border: '1px solid #3b82f6',
      borderRadius: 8,
      padding: 10,
      minWidth: 150,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <div style={{ fontWeight: 600, marginBottom: 5 }}>{data.label}</div>
      <div style={{ fontSize: 12, color: '#666' }}>
        Skill: {data.config?.skillName || 'Not configured'}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
