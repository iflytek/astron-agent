import React, { useState } from 'react';

interface OpenClawNodeProps {
  id: string;
  data: {
    skillId: string;
    inputParams: Record<string, any>;
    outputParams: string[];
    preConditions: string[];
    postConditions: string[];
  };
}

const OpenClawNode: React.FC<OpenClawNodeProps> = ({ id, data }) => {
  const [config, setConfig] = useState(data);

  const handleInputChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="openclaw-node">
      <div className="node-header">OpenClaw Skill</div>
      <div className="node-body">
        <label>Skill ID</label>
        <input value={config.skillId} onChange={e => handleInputChange('skillId', e.target.value)} />
      </div>
    </div>
  );
};

export default OpenClawNode;