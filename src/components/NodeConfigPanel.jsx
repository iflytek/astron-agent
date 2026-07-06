import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const NodeConfigPanel = forwardRef(({ node, onUpdate }, ref) => {
  const [skillName, setSkillName] = useState(node.data.config?.skillName || '');
  const [inputParams, setInputParams] = useState(node.data.config?.inputParams || '');
  const [outputParams, setOutputParams] = useState(node.data.config?.outputParams || '');

  useEffect(() => {
    setSkillName(node.data.config?.skillName || '');
    setInputParams(node.data.config?.inputParams || '');
    setOutputParams(node.data.config?.outputParams || '');
  }, [node]);

  useImperativeHandle(ref, () => ({
    getConfig: () => ({ skillName, inputParams, outputParams }),
  }));

  const handleApply = () => {
    onUpdate({ skillName, inputParams, outputParams });
  };

  return (
    <div style={{
      width: 300,
      padding: 20,
      borderLeft: '1px solid #ddd',
      background: '#fafafa',
      overflowY: 'auto',
    }}>
      <h3 style={{ marginTop: 0 }}>OpenClaw Node Config</h3>
      <label style={{ display: 'block', marginBottom: 10 }}>
        Skill Name:
        <input
          type="text"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          style={{ width: '100%', marginTop: 5, padding: 5 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        Input Params (JSON):
        <textarea
          value={inputParams}
          onChange={(e) => setInputParams(e.target.value)}
          rows={3}
          style={{ width: '100%', marginTop: 5, padding: 5 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        Output Params (JSON):
        <textarea
          value={outputParams}
          onChange={(e) => setOutputParams(e.target.value)}
          rows={3}
          style={{ width: '100%', marginTop: 5, padding: 5 }}
        />
      </label>
      <button onClick={handleApply} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4 }}>
        Apply
      </button>
    </div>
  );
});

export default NodeConfigPanel;
