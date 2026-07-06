import React, { useState } from 'react';

interface Props {
  node: any;
  onUpdate: (data: any) => void;
}

const OpenClawPanel: React.FC<Props> = ({ node, onUpdate }) => {
  const [skillName, setSkillName] = useState(node.data?.skillName || '');
  const [inputParams, setInputParams] = useState(node.data?.inputParams || []);
  const [preCondition, setPreCondition] = useState(node.data?.preCondition || '');
  const [postCondition, setPostCondition] = useState(node.data?.postCondition || '');

  const handleSave = () => {
    onUpdate({ skillName, inputParams, preCondition, postCondition });
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3>OpenClaw Node Configuration</h3>
      <label>Skill Name</label>
      <input value={skillName} onChange={e => setSkillName(e.target.value)} style={{ width: '100%', marginBottom: '8px' }} />
      <label>Input Parameters (JSON)</label>
      <textarea
        value={JSON.stringify(inputParams, null, 2)}
        onChange={e => { try { setInputParams(JSON.parse(e.target.value)); } catch {} }}
        rows={4}
        style={{ width: '100%', marginBottom: '8px' }}
      />
      <label>Pre-condition (expression)</label>
      <input value={preCondition} onChange={e => setPreCondition(e.target.value)} style={{ width: '100%', marginBottom: '8px' }} />
      <label>Post-condition (expression)</label>
      <input value={postCondition} onChange={e => setPostCondition(e.target.value)} style={{ width: '100%', marginBottom: '8px' }} />
      <button onClick={handleSave} style={{ marginTop: '8px' }}>Save</button>
    </div>
  );
};

export default OpenClawPanel;