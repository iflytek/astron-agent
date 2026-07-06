import React, { useState } from 'react';
import { useNodeConfig } from '../hooks/useNodeConfig';
import { OpenClawSkill } from '../types';

interface Props {
  nodeId: string;
  onClose: () => void;
}

const OpenClawConfigPanel = ({ nodeId, onClose }: Props) => {
  const { config, updateConfig } = useNodeConfig(nodeId);
  const [skill, setSkill] = useState<OpenClawSkill>(config.skill || {});
  const [preconditions, setPreconditions] = useState(config.preconditions || []);

  const handleSave = () => {
    updateConfig({ skill, preconditions });
    onClose();
  };

  return (
    <div className="config-panel">
      <h3>OpenClaw Node Configuration</h3>
      <div className="form-group">
        <label>Skill</label>
        <select value={skill.id} onChange={(e) => setSkill({ ...skill, id: e.target.value })}>
          <option value="skill1">Skill 1</option>
          <option value="skill2">Skill 2</option>
        </select>
      </div>
      <div className="form-group">
        <label>Input Parameters</label>
        <textarea
          value={JSON.stringify(skill.inputParams || {}, null, 2)}
          onChange={(e) => setSkill({ ...skill, inputParams: JSON.parse(e.target.value) })}
        />
      </div>
      <div className="form-group">
        <label>Preconditions</label>
        {preconditions.map((cond, idx) => (
          <div key={idx}>
            <input value={cond.field} placeholder="Field" />
            <input value={cond.operator} placeholder="Operator" />
            <input value={cond.value} placeholder="Value" />
          </div>
        ))}
        <button onClick={() => setPreconditions([...preconditions, { field: '', operator: '', value: '' }])}>
          Add Condition
        </button>
      </div>
      <button onClick={handleSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default OpenClawConfigPanel;