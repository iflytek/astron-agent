import { useState, type ReactElement } from 'react';
import { Alert, Button, Input, Modal } from 'antd';
import { defaultText, updateFieldSchema } from './http-config';
import type { JsonObject } from './mcp-tools';

export default function ParameterOptionsDialog({
  name,
  schema,
  description,
  onSave,
  onCancel,
}: {
  name: string;
  schema: JsonObject;
  description: string;
  onSave: (schema: JsonObject, description: string) => void;
  onCancel: () => void;
}): ReactElement {
  const [text, setText] = useState(description);
  const [value, setValue] = useState(defaultText(schema));
  const [error, setError] = useState('');
  const complex =
    schema.type === 'object' || schema.type === 'array' || !!schema.$ref;
  const numeric = schema.type === 'integer' || schema.type === 'number';
  return (
    <Modal
      open
      title={`参数设置 · ${name || '未命名'}`}
      onCancel={onCancel}
      footer={null}
      width={480}
      rootClassName="resource-param-modal"
      destroyOnClose
      maskClosable={false}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          event.stopPropagation();
          try {
            onSave(
              complex || value === defaultText(schema)
                ? schema
                : updateFieldSchema(schema, 'default', value),
              text
            );
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : '请检查默认值。'
            );
          }
        }}
      >
        {error && <Alert type="error" showIcon message={error} />}
        <label>
          参数说明
          <Input.TextArea
            autoFocus
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={text}
            onChange={event => setText(event.target.value)}
          />
        </label>
        {complex ? (
          <p className="resource-tool-hint">
            复杂结构及已有默认值会保留，可在高级设置中修改。
          </p>
        ) : (
          <label>
            默认值（可选）
            {schema.type === 'boolean' ? (
              <select
                className="resource-config-select"
                value={value}
                onChange={event => setValue(event.target.value)}
              >
                <option value="">不设置</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            ) : (
              <Input
                type={numeric ? 'number' : 'text'}
                step={schema.type === 'integer' ? 1 : 'any'}
                value={value}
                placeholder="不填则由调用者提供"
                onChange={event => {
                  setValue(event.target.value);
                  setError('');
                }}
              />
            )}
          </label>
        )}
        <div className="resource-param-modal-actions">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit">
            应用
          </Button>
        </div>
      </form>
    </Modal>
  );
}
