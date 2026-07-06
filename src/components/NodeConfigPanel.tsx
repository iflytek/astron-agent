import React from 'react';

interface NodeConfigPanelProps {
  nodeType: string;
  config: {
    skillId?: string;
    inputParams?: Record<string, any>;
    outputParams?: string[];
    preConditions?: string[];
    postConditions?: string[];
  };
  onConfigChange: (config: any) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ nodeType, config, onConfigChange }) => {
  if (nodeType !== 'openclaw') return null;

  const handleAddParam = (field: string) => {
    const newParams = [...(config[field as keyof typeof config] as string[] || []), ''];
    onConfigChange({ ...config, [field]: newParams });
  };

  return (
    <div className="config-panel">
      <h3>OpenClaw Configuration</h3>
      <div>
        <label>Input Parameters</label>
        {(config.inputParams as any[] || []).map((param: any, idx: number) => (
          <input key={idx} value={param} onChange={e => {
            const newParams = [...(config.inputParams as any[])];
            newParams[idx] = e.target.value;
            onConfigChange({ ...config, inputParams: newParams });
          }} />
        ))}
        <button onClick={() => handleAddParam('inputParams')}>Add Input</button>
      </div>
      {/* Similar for outputParams, preConditions, postConditions */}
    </div>
  );
};

export default NodeConfigPanel;