import { Handle, Position, NodeProps } from 'react-flow-renderer';
import { useNodeConfig } from '../hooks/useNodeConfig';

const OpenClawNode = ({ id, data }: NodeProps) => {
  const { openConfigPanel } = useNodeConfig(id);

  return (
    <div className="openclaw-node" onClick={() => openConfigPanel()}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">🤖</span>
        <span className="node-label">OpenClaw</span>
      </div>
      <div className="node-body">
        <p>{data.skillName || 'Select Skill'}</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default OpenClawNode;