import React, { useState } from 'react';
import { Node } from 'reactflow';

export const OpenClawNodeConfig: React.FC<{ node: Node; updateNode: (id: string, data: any) => void }> = ({ node, updateNode }) => {
  const [skillName, setSkillName] = useState(node.data.skillName || '');
  const [params, setParams] = useState<Record<string, string>>(node.data.parameters || {});

  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillName(e.target.value);
  };

  const addParam = () => {
    setParams(prev => ({ ...prev, '': '' }));
  };

  const updateParam = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...params };
    delete newParams[oldKey];
    newParams[newKey] = value;
    setParams(newParams);
  };

  const save = () => {
    updateNode(node.id, { ...node.data, skillName, parameters: params });
  };

  return (
    <div className="openclaw-config">
      <h3>OpenClaw Node Configuration</h3>
      <label>Skill Name:</label>
      <input type="text" value={skillName} onChange={handleSkillChange} />
      <div>
        <strong>Parameters:</strong>
        {Object.entries(params).map(([key, value], index) => (
          <div key={index}>
            <input type="text" placeholder="Key" value={key} onChange={e => updateParam(key, e.target.value, value)} />
            <input type="text" placeholder="Value" value={value} onChange={e => updateParam(key, key, e.target.value)} />
          </div>
        ))}
        <button onClick={addParam}>Add Parameter</button>
      </div>
      <button onClick={save}>Save</button>
    </div>
  );
};