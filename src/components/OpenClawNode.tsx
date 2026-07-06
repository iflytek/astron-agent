import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface OpenClawNodeData {
  skillId: string;
  inputParams: Record<string, any>;
  preConditions: string[];
  postConditions: string[];
}

const OpenClawNode: React.FC<NodeProps<OpenClawNodeData>> = ({ data, selected }) => {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className={`openclaw-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" onClick={() => setShowPanel(!showPanel)}>
        <span>🤖 OpenClaw</span>
      </div>
      {showPanel && (
        <div className="config-panel">
          <label>
            Skill ID:
            <input
              type="text"
              value={data.skillId}
              onChange={(e) => data.skillId = e.target.value}
            />
          </label>
          <label>
            Input Params:
            <textarea
              value={JSON.stringify(data.inputParams, null, 2)}
              onChange={(e) => { try { data.inputParams = JSON.parse(e.target.value); } catch {} }}
            />
          </label>
          {/* Pre/Post conditions omitted for brevity */}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default OpenClawNode;
