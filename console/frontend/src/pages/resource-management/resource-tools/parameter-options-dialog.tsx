import { useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Input, Modal, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  asObject,
  defaultText,
  fieldType,
  FIELD_TYPES,
  nextFieldName,
  removeSchemaProperty,
  updateFieldSchema,
  updateSchemaProperty,
} from './http-config';
import ResourceSelect from './resource-select';
import type { JsonObject } from './mcp-tools';
import './parameter-options-dialog.css';

function ScalarDefault({
  schema,
  name,
  onChange,
}: {
  schema: JsonObject;
  name: string;
  onChange: (next: JsonObject) => void;
}): ReactElement {
  const [value, setValue] = useState(defaultText(schema));
  const [problem, setProblem] = useState('');
  const type = fieldType(schema);
  if (['object', 'array', '组合结构', '共享定义'].includes(type))
    return <span className="parameter-schema-muted">结构见下方</span>;
  return (
    <div>
      {type === 'boolean' ? (
        <ResourceSelect
          aria-label={`${name}默认值`}
          value={value}
          onChange={next => {
            setValue(next);
            onChange(updateFieldSchema(schema, 'default', next));
          }}
          options={[
            { value: '', label: '未设置' },
            { value: 'true', label: 'true' },
            { value: 'false', label: 'false' },
          ]}
        />
      ) : (
        <Input
          aria-label={`${name}默认值`}
          type={type === 'integer' || type === 'number' ? 'number' : 'text'}
          step={type === 'integer' ? 1 : 'any'}
          value={value}
          placeholder="未设置"
          status={problem ? 'error' : undefined}
          onChange={event => {
            const input = event.target;
            setValue(input.value);
            try {
              if (input.validity?.badInput)
                throw new Error('请填写完整、有效的数字。');
              const next = updateFieldSchema(
                schema,
                'default',
                (type === 'number' || type === 'integer') && input.value !== ''
                  ? String(Number(input.value))
                  : input.value
              );
              input.setCustomValidity('');
              setProblem('');
              onChange(next);
            } catch (reason) {
              const message =
                reason instanceof Error ? reason.message : '请检查默认值。';
              input.setCustomValidity(message);
              setProblem(message);
            }
          }}
        />
      )}
      {problem && (
        <span className="parameter-schema-error" role="alert">
          {problem}
        </span>
      )}
    </div>
  );
}

function StructureEditor({
  schema,
  name,
  onChange,
}: {
  schema: JsonObject;
  name: string;
  onChange: (next: JsonObject) => void;
}): ReactElement | null {
  const identities = useRef<Record<string, number>>({});
  const nextIdentity = useRef(0);
  const type = fieldType(schema);
  if (
    schema.$ref ||
    schema.oneOf ||
    schema.anyOf ||
    schema.allOf ||
    Array.isArray(schema.type)
  )
    return (
      <p className="resource-tool-hint">
        共享或组合结构保持原定义，可在高级设置中查看。
      </p>
    );
  if (type === 'array') {
    if (Array.isArray(schema.items) || typeof schema.items === 'boolean')
      return (
        <p className="resource-tool-hint">
          此数组使用特殊元素定义，原配置会保留。
        </p>
      );
    const items = asObject(schema.items);
    return (
      <div className="parameter-schema-array">
        <label className="parameter-schema-item-type">
          元素类型
          <ResourceSelect
            aria-label={`${name}元素类型`}
            value={fieldType(items)}
            disabled={
              !!items.$ref ||
              !!items.oneOf ||
              !!items.anyOf ||
              !!items.allOf ||
              Array.isArray(items.type)
            }
            options={FIELD_TYPES.map(value => ({ value, label: value }))}
            onChange={value =>
              onChange({
                ...schema,
                items: updateFieldSchema(items, 'type', value),
              })
            }
          />
        </label>
        {!['object', 'array', '组合结构', '共享定义'].includes(
          fieldType(items)
        ) && (
          <label className="parameter-schema-item-default">
            元素默认值（可选）
            <ScalarDefault
              key={fieldType(items)}
              schema={items}
              name={`${name}[]`}
              onChange={next => onChange({ ...schema, items: next })}
            />
          </label>
        )}
        <StructureEditor
          schema={items}
          name={`${name}[]`}
          onChange={next => onChange({ ...schema, items: next })}
        />
      </div>
    );
  }
  if (type !== 'object') return null;
  const properties = asObject(schema.properties);
  return (
    <div className="parameter-schema-object">
      <div className="parameter-schema-heading">
        <span>{name} · 子字段</span>
        <Tooltip title="添加子字段">
          <Button
            type="text"
            icon={<PlusOutlined />}
            aria-label={`添加 ${name} 子字段`}
            onClick={() => {
              const next = nextFieldName(Object.keys(properties));
              onChange(
                updateSchemaProperty(
                  schema,
                  next,
                  next,
                  { type: 'string' },
                  false
                )
              );
            }}
          />
        </Tooltip>
      </div>
      {!Object.keys(properties).length ? (
        <p className="resource-tool-hint">尚无子字段，点击右侧加号添加。</p>
      ) : (
        <div className="parameter-schema-table">
          <div
            className="parameter-schema-row parameter-schema-head"
            aria-hidden="true"
          >
            <span>字段名</span>
            <span>类型</span>
            <span>默认值</span>
            <span>说明</span>
            <span>必填</span>
            <span />
          </div>
          {Object.entries(properties).map(([key, entry]) => {
            const field = asObject(entry);
            const required =
              Array.isArray(schema.required) && schema.required.includes(key);
            const path = `${name}.${key}`;
            const update = (next: JsonObject): void =>
              onChange(updateSchemaProperty(schema, key, key, next, required));
            identities.current[key] ??= ++nextIdentity.current;
            const identity = identities.current[key];
            return (
              <div key={identity} className="parameter-schema-property">
                <div className="parameter-schema-row">
                  <Input
                    required
                    defaultValue={key}
                    aria-label={`${path}字段名`}
                    onChange={event => {
                      try {
                        const nextName = event.target.value;
                        const next = updateSchemaProperty(
                          schema,
                          key,
                          nextName,
                          field,
                          required
                        );
                        event.target.setCustomValidity('');
                        if (nextName !== key) {
                          identities.current[nextName] = identity;
                          delete identities.current[key];
                        }
                        onChange(next);
                      } catch (reason) {
                        event.target.setCustomValidity(
                          reason instanceof Error
                            ? reason.message
                            : '请检查字段名。'
                        );
                      }
                    }}
                  />
                  <ResourceSelect
                    aria-label={`${path}类型`}
                    value={fieldType(field)}
                    disabled={
                      !!field.$ref ||
                      !!field.oneOf ||
                      !!field.anyOf ||
                      !!field.allOf ||
                      Array.isArray(field.type)
                    }
                    options={FIELD_TYPES.map(value => ({
                      value,
                      label: value,
                    }))}
                    onChange={value =>
                      update(updateFieldSchema(field, 'type', value))
                    }
                  />
                  <ScalarDefault
                    key={fieldType(field)}
                    schema={field}
                    name={path}
                    onChange={update}
                  />
                  <Input
                    aria-label={`${path}说明`}
                    value={String(field.description || '')}
                    placeholder="字段说明"
                    onChange={event =>
                      update({ ...field, description: event.target.value })
                    }
                  />
                  <label className="parameter-schema-required">
                    <input
                      type="checkbox"
                      aria-label={`${path}必填`}
                      checked={required}
                      onChange={event =>
                        onChange(
                          updateSchemaProperty(
                            schema,
                            key,
                            key,
                            field,
                            event.target.checked
                          )
                        )
                      }
                    />
                  </label>
                  <Tooltip title="删除子字段">
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label={`删除 ${path}`}
                      onClick={() =>
                        onChange(removeSchemaProperty(schema, key))
                      }
                    />
                  </Tooltip>
                </div>
                <StructureEditor schema={field} name={path} onChange={update} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [draft, setDraft] = useState(schema);
  const [value, setValue] = useState(defaultText(schema));
  const [error, setError] = useState('');
  const type = fieldType(schema);
  const complex = ['object', 'array', '组合结构', '共享定义'].includes(type);
  const numeric = type === 'integer' || type === 'number';
  return (
    <Modal
      open
      centered
      title={`参数设置 · ${name || '未命名'}`}
      onCancel={onCancel}
      footer={null}
      width={complex ? 960 : 480}
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
              complex
                ? draft
                : value === defaultText(schema)
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
          <StructureEditor
            schema={draft}
            name={name || '参数'}
            onChange={setDraft}
          />
        ) : (
          <label>
            默认值（可选）
            {type === 'boolean' ? (
              <ResourceSelect
                className="resource-config-select"
                value={value}
                onChange={setValue}
                options={[
                  { value: '', label: '不设置' },
                  { value: 'true', label: '是' },
                  { value: 'false', label: '否' },
                ]}
              />
            ) : (
              <Input
                type={numeric ? 'number' : 'text'}
                step={type === 'integer' ? 1 : 'any'}
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
