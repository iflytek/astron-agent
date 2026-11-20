import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Input, Tabs, Tooltip, type InputRef } from 'antd';
import { DeleteOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import ParameterOptionsDialog from './parameter-options-dialog';
import {
  asObject,
  configOperations,
  defaultText,
  FIELD_TYPES,
  HTTP_METHODS,
  moveOperation,
  nextFieldName,
  newRequestParameter,
  renameRequestParameter,
  parseDocument,
  removeBodyProperty,
  updateBodyProperty,
  updateFieldSchema,
  updateOperation,
  updateServer,
} from './http-config';
import type { JsonObject } from './mcp-tools';
import './http-config-form.css';

function DefaultValueCell({
  schema,
  name,
  disabled,
  onChange,
  onProblem,
  onAdvanced,
}: {
  schema: JsonObject;
  name: string;
  disabled: boolean;
  onChange: (next: JsonObject) => void;
  onProblem: (message: string) => void;
  onAdvanced: () => void;
}): ReactElement {
  const sourceText = defaultText(schema);
  const [draft, setDraft] = useState(sourceText);
  const publishedText = useRef(sourceText);
  const inputRef = useRef<InputRef>(null);
  useEffect(() => {
    if (sourceText !== publishedText.current) {
      setDraft(sourceText);
      publishedText.current = sourceText;
      inputRef.current?.input?.setCustomValidity('');
      onProblem('');
    }
  }, [sourceText, onProblem]);
  if (schema.type === 'object' || schema.type === 'array' || schema.$ref)
    return (
      <Button
        type="text"
        className="http-config-complex"
        disabled={disabled}
        onClick={onAdvanced}
      >
        查看设置
      </Button>
    );
  if (schema.type === 'boolean')
    return (
      <select
        className="resource-config-select http-config-cell-select"
        aria-label={`${name}默认值`}
        disabled={disabled}
        value={defaultText(schema)}
        onChange={event =>
          onChange(updateFieldSchema(schema, 'default', event.target.value))
        }
      >
        <option value="">未设置</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  const numeric = schema.type === 'number' || schema.type === 'integer';
  return (
    <Input
      ref={inputRef}
      disabled={disabled}
      aria-label={`${name}默认值`}
      type={numeric ? 'number' : 'text'}
      step={schema.type === 'integer' ? 1 : 'any'}
      value={draft}
      placeholder="未设置"
      onChange={event => {
        const input = event.target;
        setDraft(input.value);
        try {
          if (input.validity?.badInput)
            throw new Error('请填写完整、有效的数字。');
          const text =
            numeric && input.value !== ''
              ? String(Number(input.value))
              : input.value;
          const next = updateFieldSchema(schema, 'default', text);
          input.setCustomValidity('');
          publishedText.current = defaultText(next);
          onChange(next);
          onProblem('');
        } catch (reason) {
          const message =
            reason instanceof Error ? reason.message : '请检查默认值。';
          input.setCustomValidity(message);
          onProblem(message);
        }
      }}
    />
  );
}

export default function HttpConfigForm({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}): ReactElement {
  const [selected, setSelected] = useState(0);
  const [problem, setProblem] = useState('');
  const [tab, setTab] = useState('params');
  const [fieldEditor, setFieldEditor] = useState<{
    kind: 'parameter' | 'body';
    index: number;
    name: string;
  } | null>(null);
  const document = parseDocument(value);
  const operations = configOperations(document || {});
  const operation = operations[selected] || operations[0];
  const apply = (next: JsonObject): void => {
    setProblem('');
    onChange(JSON.stringify(next, null, 2));
  };
  const safely = (action: () => JsonObject): void => {
    try {
      apply(action());
    } catch (error) {
      setProblem(error instanceof Error ? error.message : '请检查输入。');
    }
  };
  const patch = (change: JsonObject): void => {
    if (document && operation)
      apply(updateOperation(document, operation, change));
  };
  const relocate = (path: string, method: string): void => {
    if (!document || !operation) return;
    safely(() => {
      const next = moveOperation(document, operation, path, method);
      setSelected(
        configOperations(next).findIndex(
          item => item.path === path && item.method === method
        )
      );
      return next;
    });
  };
  const params = Array.isArray(operation?.operation.parameters)
    ? operation.operation.parameters
    : [];
  const body = asObject(operation?.operation.requestBody);
  const bodySchema = asObject(
    asObject(asObject(body.content)['application/json']).schema
  );
  const properties = asObject(bodySchema.properties);
  const schemes = asObject(asObject(document?.components).securitySchemes);
  const requirements = operation?.operation.security ?? document?.security;
  const activeSchemeNames = new Set(
    (Array.isArray(requirements) ? requirements : []).flatMap(entry =>
      Object.keys(asObject(entry))
    )
  );
  const activeSchemes = Object.entries(schemes).filter(([key]) =>
    activeSchemeNames.has(key)
  );
  const operationKey = operation ? `${operation.path}:${operation.method}` : '';
  const typeControl = (
    schema: JsonObject,
    onUpdate: (next: JsonObject) => void,
    label: string
  ): ReactElement => (
    <select
      className="resource-config-select resource-config-type"
      aria-label={`${label}类型`}
      disabled={disabled || !!schema.$ref}
      data-type={String(schema.type || 'string')}
      value={String(schema.type || 'string')}
      onChange={event =>
        onUpdate(updateFieldSchema(schema, 'type', event.target.value))
      }
    >
      {FIELD_TYPES.map(type => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
  const updateParam = (index: number, next: JsonObject): void =>
    patch({
      parameters: params.map((item, position) =>
        position === index ? next : item
      ),
    });
  return (
    <div
      className="resource-http-config http-config-editor"
      onInvalidCapture={event => {
        const input = event.target as HTMLInputElement;
        const pane = input.closest<HTMLElement>('[data-http-pane]');
        if (pane?.hidden) {
          event.preventDefault();
          setTab(pane.dataset.httpPane || 'params');
          setProblem(input.validationMessage);
        }
      }}
    >
      {problem && <Alert type="error" showIcon message={problem} />}
      {document && operation ? (
        <>
          {operations.length > 1 && (
            <label>
              请求操作
              <select
                className="resource-config-select"
                disabled={disabled}
                value={operations.indexOf(operation)}
                onChange={event => setSelected(Number(event.target.value))}
              >
                {operations.map((item, index) => (
                  <option key={`${item.method}:${item.path}`} value={index}>
                    {item.method.toUpperCase()} {item.path}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="resource-config-grid resource-config-endpoint">
            <label className="http-config-server">
              服务地址
              <Input
                required
                type="url"
                disabled={disabled}
                value={String(
                  asObject(
                    Array.isArray(document.servers) ? document.servers[0] : {}
                  ).url || ''
                )}
                placeholder="https://api.example.com"
                onChange={event =>
                  apply(updateServer(document, event.target.value))
                }
              />
            </label>
            <label>
              请求方式
              <select
                className="resource-config-select"
                disabled={disabled}
                value={operation.method}
                onChange={event => relocate(operation.path, event.target.value)}
              >
                {HTTP_METHODS.map(method => (
                  <option key={method} value={method}>
                    {method.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              请求路径
              <Input
                required
                disabled={disabled}
                pattern="/.*"
                title="路径需以 / 开头"
                value={operation.path}
                onChange={event =>
                  relocate(event.target.value, operation.method)
                }
              />
            </label>
          </div>
          <label>
            调用名称
            <Input
              required
              disabled={disabled}
              value={String(operation.operation.operationId || '')}
              placeholder="如 getRepository，用于 Agent 识别工具"
              onChange={event => patch({ operationId: event.target.value })}
            />
          </label>
          <Tabs
            className="http-config-tabs"
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'params',
                label: `Params${params.length ? ` (${params.length})` : ''}`,
              },
              {
                key: 'body',
                label: `Body${Object.keys(properties).length ? ` (${Object.keys(properties).length})` : ''}`,
              },
              { key: 'auth', label: 'Auth' },
            ]}
          />
          <section
            className="http-config-panel"
            data-http-pane="params"
            hidden={tab !== 'params'}
            aria-label="请求参数"
          >
            <div className="http-config-panel-heading">
              <span>
                请求参数{params.length ? `（${params.length}）` : '（可选）'}
              </span>
              <Tooltip title="添加参数">
                <Button
                  type="text"
                  className="resource-config-icon-add"
                  aria-label="添加参数"
                  icon={<PlusOutlined />}
                  disabled={disabled}
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    patch({
                      parameters: [
                        ...params,
                        newRequestParameter(document, operation),
                      ],
                    });
                  }}
                />
              </Tooltip>
            </div>
            <p className="resource-tool-hint">
              路径中的 {'{name}'} 自动识别为路径参数，其余新增参数用于查询。
            </p>
            {!!params.length && (
              <div className="http-config-table-head" aria-hidden="true">
                <span>参数名</span>
                <span>类型</span>
                <span>默认值</span>
                <span>说明</span>
                <span>必填</span>
              </div>
            )}
            {params.map((entry, index) => {
              const parameter = asObject(entry);
              const schema = asObject(parameter.schema);
              const name = String(parameter.name || '');
              return (
                <div
                  className="http-config-row"
                  key={`${operationKey}:${index}`}
                >
                  {parameter.$ref ? (
                    <p className="resource-config-shared">
                      共享参数定义，原配置保留
                    </p>
                  ) : (
                    <>
                      <Input
                        required
                        disabled={disabled}
                        aria-label={`参数 ${index + 1} 名称`}
                        value={name}
                        onChange={event =>
                          updateParam(
                            index,
                            renameRequestParameter(
                              operation.path,
                              parameter,
                              event.target.value
                            )
                          )
                        }
                      />
                      {typeControl(
                        schema,
                        next =>
                          updateParam(index, { ...parameter, schema: next }),
                        name
                      )}
                      <DefaultValueCell
                        key={`${operationKey}:${index}:${name}:${schema.type}`}
                        schema={schema}
                        name={name}
                        disabled={disabled}
                        onChange={next =>
                          updateParam(index, { ...parameter, schema: next })
                        }
                        onProblem={setProblem}
                        onAdvanced={() =>
                          setFieldEditor({ kind: 'parameter', index, name })
                        }
                      />
                      <Input
                        disabled={disabled}
                        aria-label={`${name}说明`}
                        value={String(parameter.description || '')}
                        placeholder="参数说明"
                        onChange={event =>
                          updateParam(index, {
                            ...parameter,
                            description: event.target.value,
                          })
                        }
                      />
                      <label className="resource-config-check">
                        <input
                          type="checkbox"
                          aria-label={`${name}必填`}
                          disabled={disabled || parameter.in === 'path'}
                          checked={
                            parameter.in === 'path' ||
                            parameter.required === true
                          }
                          onChange={event =>
                            updateParam(index, {
                              ...parameter,
                              required: event.target.checked,
                            })
                          }
                        />
                      </label>
                      <Tooltip title="更多设置">
                        <Button
                          type="text"
                          className="resource-config-edit"
                          icon={<EditOutlined />}
                          aria-label={`编辑参数 ${name}`}
                          disabled={disabled}
                          onClick={() =>
                            setFieldEditor({ kind: 'parameter', index, name })
                          }
                        />
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="删除参数">
                    <Button
                      type="text"
                      className="resource-config-remove"
                      icon={<DeleteOutlined />}
                      aria-label={`删除参数 ${name || index + 1}`}
                      disabled={disabled}
                      onClick={() =>
                        patch({
                          parameters: params.filter(
                            (_, position) => position !== index
                          ),
                        })
                      }
                    />
                  </Tooltip>
                </div>
              );
            })}
          </section>
          <section
            className="http-config-panel"
            data-http-pane="body"
            hidden={tab !== 'body'}
            aria-label="请求内容"
          >
            <div className="http-config-panel-heading">
              <span>请求内容{Object.keys(body).length ? '' : '（可选）'}</span>
              {!body.$ref &&
              !bodySchema.$ref &&
              (!bodySchema.type || bodySchema.type === 'object') &&
              (!body.content || asObject(body.content)['application/json']) ? (
                <Tooltip title="添加内容字段">
                  <Button
                    type="text"
                    className="resource-config-icon-add"
                    aria-label="添加内容字段"
                    icon={<PlusOutlined />}
                    disabled={disabled}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      const name = nextFieldName(Object.keys(properties));
                      apply(
                        updateBodyProperty(
                          document,
                          operation,
                          name,
                          name,
                          { type: 'string' },
                          false
                        )
                      );
                    }}
                  />
                </Tooltip>
              ) : null}
            </div>
            {body.$ref ||
            bodySchema.$ref ||
            (bodySchema.type && bodySchema.type !== 'object') ||
            (body.content && !asObject(body.content)['application/json']) ? (
              <p className="resource-tool-hint">
                当前请求内容使用共享定义或特殊格式，保持原配置。可在高级设置中修改。
              </p>
            ) : (
              <>
                <p className="resource-tool-hint">
                  JSON 请求内容按字段配置；没有请求内容时无需添加。
                </p>
                {!!Object.keys(properties).length && (
                  <div className="http-config-table-head" aria-hidden="true">
                    <span>字段名</span>
                    <span>类型</span>
                    <span>默认值</span>
                    <span>说明</span>
                    <span>必填</span>
                  </div>
                )}
                {Object.entries(properties).map(([name, entry], index) => {
                  const field = asObject(entry);
                  const required =
                    Array.isArray(bodySchema.required) &&
                    bodySchema.required.includes(name);
                  const update = (next: JsonObject): void =>
                    apply(
                      updateBodyProperty(
                        document,
                        operation,
                        name,
                        name,
                        next,
                        required
                      )
                    );
                  return (
                    <div
                      className="http-config-row"
                      key={`${operationKey}:${name}`}
                    >
                      <Input
                        required
                        disabled={disabled}
                        defaultValue={name}
                        aria-label={`内容字段 ${name} 名称`}
                        onBlur={event =>
                          safely(() =>
                            updateBodyProperty(
                              document,
                              operation,
                              name,
                              event.target.value,
                              field,
                              required
                            )
                          )
                        }
                      />
                      {typeControl(field, update, `内容 ${name}`)}
                      <DefaultValueCell
                        key={`${operationKey}:${name}:${field.type}`}
                        schema={field}
                        name={`内容 ${name}`}
                        disabled={disabled}
                        onChange={update}
                        onProblem={setProblem}
                        onAdvanced={() =>
                          setFieldEditor({ kind: 'body', index, name })
                        }
                      />
                      <Input
                        disabled={disabled}
                        aria-label={`内容 ${name}说明`}
                        value={String(field.description || '')}
                        placeholder="字段说明"
                        onChange={event =>
                          update({ ...field, description: event.target.value })
                        }
                      />
                      <label className="resource-config-check">
                        <input
                          type="checkbox"
                          aria-label={`内容 ${name}必填`}
                          disabled={disabled}
                          checked={required}
                          onChange={event =>
                            apply(
                              updateBodyProperty(
                                document,
                                operation,
                                name,
                                name,
                                field,
                                event.target.checked
                              )
                            )
                          }
                        />
                      </label>
                      <Tooltip title="更多设置">
                        <Button
                          type="text"
                          className="resource-config-edit"
                          icon={<EditOutlined />}
                          aria-label={`编辑字段 ${name}`}
                          disabled={disabled}
                          onClick={() =>
                            setFieldEditor({ kind: 'body', index, name })
                          }
                        />
                      </Tooltip>
                      <Tooltip title="删除字段">
                        <Button
                          type="text"
                          className="resource-config-remove"
                          icon={<DeleteOutlined />}
                          aria-label={`删除字段 ${name}`}
                          disabled={disabled}
                          onClick={() =>
                            apply(removeBodyProperty(document, operation, name))
                          }
                        />
                      </Tooltip>
                    </div>
                  );
                })}
                {Object.keys(body).length > 0 && (
                  <label className="resource-config-check">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={body.required === true}
                      onChange={event =>
                        patch({
                          requestBody: {
                            ...body,
                            required: event.target.checked,
                          },
                        })
                      }
                    />
                    请求内容必填
                  </label>
                )}
              </>
            )}
          </section>
          <section
            className="http-config-panel"
            data-http-pane="auth"
            hidden={tab !== 'auth'}
            aria-label="身份验证"
          >
            <div className="http-config-panel-heading">身份验证（可选）</div>
            <p className="resource-tool-hint">
              公开接口无需填写。已有密钥显示为掩码，保持掩码可保留原值。
            </p>
            {activeSchemes.map(([key, entry]) => {
              const scheme = asObject(entry);
              const change = (patch: JsonObject): void =>
                apply({
                  ...document,
                  components: {
                    ...asObject(document.components),
                    securitySchemes: {
                      ...schemes,
                      [key]: { ...scheme, ...patch },
                    },
                  },
                });
              return (
                <div className="resource-config-auth" key={key}>
                  {scheme.type === 'apiKey' ? (
                    <>
                      <label>
                        鉴权字段
                        <Input
                          required
                          disabled={disabled}
                          value={String(scheme.name || '')}
                          onChange={event =>
                            change({ name: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        密钥
                        <Input
                          type="password"
                          required
                          autoComplete="new-password"
                          disabled={disabled}
                          value={String(scheme['x-value'] || '')}
                          onChange={event =>
                            change({ 'x-value': event.target.value })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <p>保留当前身份验证配置，可在高级设置中查看。</p>
                  )}
                </div>
              );
            })}
            {!!activeSchemes.length && (
              <Button
                type="text"
                className="resource-config-add"
                disabled={disabled}
                onClick={() => patch({ security: [] })}
              >
                不使用身份验证
              </Button>
            )}
            {!activeSchemes.length && (
              <Button
                type="text"
                className="resource-config-add"
                icon={<PlusOutlined />}
                disabled={disabled}
                onClick={() => {
                  let key = 'apiKey';
                  let suffix = 1;
                  while (schemes[key]) key = `apiKey${suffix++}`;
                  apply({
                    ...updateOperation(document, operation, {
                      security: [{ [key]: [] }],
                    }),
                    components: {
                      ...asObject(document.components),
                      securitySchemes: {
                        ...schemes,
                        [key]: {
                          type: 'apiKey',
                          in: 'header',
                          name: 'Authorization',
                          'x-value': '',
                        },
                      },
                    },
                  });
                }}
              >
                添加 API Key
              </Button>
            )}
          </section>
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="文档暂时无法转换为表单"
          description="请在高级设置中修正文档，或重新导入有效的 OpenAPI 文档。"
        />
      )}
      <details className="http-config-advanced">
        <summary>高级设置 · OpenAPI 文档</summary>
        <p className="resource-tool-hint">
          导入的响应定义、共享结构和扩展字段会保留。仅复杂接口需要编辑文档。
        </p>
        <Input.TextArea
          disabled={disabled}
          className="resource-tools-code"
          rows={10}
          spellCheck={false}
          aria-label="OpenAPI 文档"
          value={value}
          onChange={event => onChange(event.target.value)}
        />
      </details>
      {fieldEditor && document && operation && (
        <ParameterOptionsDialog
          key={`${operationKey}:${fieldEditor.kind}:${fieldEditor.index}:${fieldEditor.name}`}
          name={fieldEditor.name}
          schema={
            fieldEditor.kind === 'parameter'
              ? asObject(asObject(params[fieldEditor.index]).schema)
              : asObject(properties[fieldEditor.name])
          }
          description={String(
            (fieldEditor.kind === 'parameter'
              ? asObject(params[fieldEditor.index])
              : asObject(properties[fieldEditor.name])
            ).description || ''
          )}
          onCancel={() => setFieldEditor(null)}
          onSave={(next, description) => {
            if (fieldEditor.kind === 'parameter') {
              const parameter = asObject(params[fieldEditor.index]);
              updateParam(fieldEditor.index, {
                ...parameter,
                description,
                schema: next,
              });
            } else {
              apply(
                updateBodyProperty(
                  document,
                  operation,
                  fieldEditor.name,
                  fieldEditor.name,
                  { ...next, description },
                  Array.isArray(bodySchema.required) &&
                    bodySchema.required.includes(fieldEditor.name)
                )
              );
            }
            setFieldEditor(null);
          }}
        />
      )}
    </div>
  );
}
