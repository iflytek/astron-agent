import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Input, Select, Button, Collapse } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Option } = Select;

const OpenClawNode = ({ data, isConnectable }) => {
  const [skill, setSkill] = useState(data.skill || '');
  const [params, setParams] = useState(data.params || {});
  const [conditions, setConditions] = useState(data.conditions || { pre: '', post: '' });

  const handleSkillChange = (value) => {
    setSkill(value);
    data.skill = value;
  };

  const handleParamChange = (key, value) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    data.params = newParams;
  };

  const handleConditionChange = (type, value) => {
    const newConditions = { ...conditions, [type]: value };
    setConditions(newConditions);
    data.conditions = newConditions;
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #1890ff', borderRadius: 8, padding: 12, minWidth: 200 }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <SettingOutlined style={{ color: '#1890ff', marginRight: 8 }} />
        <strong>OpenClaw Node</strong>
      </div>
      <Collapse defaultActiveKey={['skill']} style={{ marginBottom: 8 }}>
        <Panel header="Skill" key="skill">
          <Select
            value={skill}
            onChange={handleSkillChange}
            style={{ width: '100%' }}
            placeholder="Select OpenClaw Skill"
          >
            <Option value="skill1">Skill 1</Option>
            <Option value="skill2">Skill 2</Option>
            <Option value="skill3">Skill 3</Option>
          </Select>
        </Panel>
        <Panel header="Parameters" key="params">
          <Input
            placeholder="Key"
            value={Object.keys(params)[0] || ''}
            onChange={(e) => handleParamChange(e.target.value, params[Object.keys(params)[0]])}
            style={{ marginBottom: 4 }}
          />
          <Input
            placeholder="Value"
            value={Object.values(params)[0] || ''}
            onChange={(e) => handleParamChange(Object.keys(params)[0], e.target.value)}
          />
        </Panel>
        <Panel header="Conditions" key="conditions">
          <div>
            <label>Pre-condition:</label>
            <Input
              value={conditions.pre}
              onChange={(e) => handleConditionChange('pre', e.target.value)}
              placeholder="Expression"
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Post-condition:</label>
            <Input
              value={conditions.post}
              onChange={(e) => handleConditionChange('post', e.target.value)}
              placeholder="Expression"
            />
          </div>
        </Panel>
      </Collapse>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export default OpenClawNode;