import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Icon } from '@arco-design/web-react';

const OpenClawNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={selected ? 'node selected' : 'node'}
      style={{
        padding: '12px 24px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: '14px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center',
      }}
    >
      <IconIconFont type="icon-openclaw" style={{ marginRight: 8 }} />
      {data.label || 'OpenClaw 节点'}
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
};

export default memo(OpenClawNode);