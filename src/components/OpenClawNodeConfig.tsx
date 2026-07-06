import React, { useState } from 'react';
import { Form, Input, TextArea, Select, Switch } from '@arco-design/web-react';

interface ConfigProps {
  nodeId: string;
  initialValues?: {
    skillUrl?: string;
    inputMapping?: string;
    outputMapping?: string;
    preCondition?: string;
    postCondition?: string;
  };
  onSave: (values: any) => void;
}

const OpenClawNodeConfig: React.FC<ConfigProps> = ({ nodeId, initialValues, onSave }) => {
  const [form] = Form.useForm();
  const [enablePre, setEnablePre] = useState(false);
  const [enablePost, setEnablePost] = useState(false);

  const handleSubmit = (values: any) => {
    onSave({ ...values, nodeId });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={(_, values) => handleSubmit(values)}
      style={{ padding: '16px' }}
    >
      <Form.Item label="Skill URL" field="skillUrl" rules={[{ required: true, message: '请输入 OpenClaw Skill URL' }]}>
        <Input placeholder="https://api.openclaw.com/skills/xxx" />
      </Form.Item>
      <Form.Item label="输入参数映射" field="inputMapping" extra="JSON 格式，例如：{"query":"$input"}">
        <TextArea rows={3} placeholder='{"query":"$input"}' />
      </Form.Item>
      <Form.Item label="输出参数映射" field="outputMapping" extra="JSON 格式，例如：{"result":"$output"}">
        <TextArea rows={3} placeholder='{"result":"$output"}' />
      </Form.Item>
      <Form.Item label="启用前置条件" >
        <Switch checked={enablePre} onChange={(v) => { setEnablePre(v); if (!v) form.setFieldValue('preCondition', ''); }} />
      </Form.Item>
      {enablePre && (
        <Form.Item label="前置条件表达式" field="preCondition" extra="SpEL 表达式或简单脚本">
          <Input placeholder="例如: #input != null" />
        </Form.Item>
      )}
      <Form.Item label="启用后置条件" >
        <Switch checked={enablePost} onChange={(v) => { setEnablePost(v); if (!v) form.setFieldValue('postCondition', ''); }} />
      </Form.Item>
      {enablePost && (
        <Form.Item label="后置条件表达式" field="postCondition" extra="SpEL 表达式或简单脚本">
          <Input placeholder="例如: #result.code == 200" />
        </Form.Item>
      )}
    </Form>
  );
};

export default OpenClawNodeConfig;