import React, { useState, useEffect } from 'react';

interface ConfigPanelProps {
  nodeId: string;
  data: any;
  onDataChange: (nodeId: string, newData: any) => void;
  onClose: () => void;
}

const OpenClawConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, data, onDataChange, onClose }) => {
  const [skillId, setSkillId] = useState(data.skillId || '');
  const [inputParams, setInputParams] = useState(data.inputParams || {});
  const [outputParams, setOutputParams] = useState(data.outputParams || {});
  const [preConditions, setPreConditions] = useState(data.preConditions || []);
  const [postConditions, setPostConditions] = useState(data.postConditions || []);

  const handleSave = () => {
    onDataChange(nodeId, {
      ...data,
      skillId,
      inputParams,
      outputParams,
      preConditions,
      postConditions,
    });
    onClose();
  };

  return (
    <div className="config-panel">
      <h3>Configure OpenClaw Node</h3>
      <div className="config-field">
        <label>Skill ID</label>
        <input value={skillId} onChange={(e) => setSkillId(e.target.value)} placeholder="Enter OpenClaw Skill ID" />
      </div>
      <div className="config-field">
        <label>Input Parameters</label>
        <textarea
          value={JSON.stringify(inputParams, null, 2)}
          onChange={(e) => {
            try { setInputParams(JSON.parse(e.target.value)); } catch { /* ignore */ }
          }}
          rows={4}
        />
      </div>
      <div className="config-field">
        <label>Output Parameters (expected)</label>
        <textarea
          value={JSON.stringify(outputParams, null, 2)}
          onChange={(e) => {
            try { setOutputParams(JSON.parse(e.target.value)); } catch { /* ignore */ }
          }}
          rows={4}
        />
      </div>
      <div className="config-field">
        <label>Pre-conditions (one per line)</label>
        <textarea
          value={preConditions.join('\n')}
          onChange={(e) => setPreConditions(e.target.value.split('\n').filter(l => l.trim()))}
          rows={3}
        />
      </div>
      <div className="config-field">
        <label>Post-conditions (one per line)</label>
        <textarea
          value={postConditions.join('\n')}
          onChange={(e) => setPostConditions(e.target.value.split('\n').filter(l => l.trim()))}
          rows={3}
        />
      </div>
      <div className="config-actions">
        <button onClick={handleSave}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default OpenClawConfigPanel;