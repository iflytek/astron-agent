import { useState, type ReactElement } from 'react';
import { Alert, Button, Input } from 'antd';
import {
  asObject,
  configOperations,
  defaultText,
  FIELD_TYPES,
  HTTP_METHODS,
  moveOperation,
  nextFieldName,
  parseDocument,
  removeBodyProperty,
  updateBodyProperty,
  updateFieldSchema,
  updateOperation,
  updateServer,
} from './http-config';
import type { JsonObject } from './mcp-tools';

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
    <label>
      类型
      <select
        className="resource-config-select"
        aria-label={`${label}类型`}
        disabled={disabled || !!schema.$ref}
        value={String(schema.type || 'string')}
        onChange={event =>
          onUpdate(updateFieldSchema(schema, 'type', event.target.value))
        }
      >
        {FIELD_TYPES.map(type => (
          <option key={type} value={type}>
            {
              (
                {
                  string: '文本',
                  integer: '整数',
                  number: '数字',
                  boolean: '是 / 否',
                  object: '对象',
                  array: '列表',
                } as Record<string, string>
              )[type]
            }
          </option>
        ))}
      </select>
    </label>
  );
  const commitDefault = (
    schema: JsonObject,
    onUpdate: (next: JsonObject) => void,
    label: string
  ): ReactElement => {
    if (schema.type === 'boolean')
      return (
        <label>
          默认值（可选）
          <select
            className="resource-config-select"
            disabled={disabled || !!schema.$ref}
            aria-label={`${label}默认值`}
            value={
              Object.prototype.hasOwnProperty.call(schema, 'default')
                ? String(schema.default)
                : ''
            }
            onChange={event =>
              onUpdate(updateFieldSchema(schema, 'default', event.target.value))
            }
          >
            <option value="">不设置</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </label>
      );
    if (schema.type === 'object' || schema.type === 'array' || schema.$ref)
      return (
        <p className="resource-tool-hint">
          复杂结构及已有默认值会保留；需要修改结构时使用高级设置。
        </p>
      );
    const numeric = schema.type === 'number' || schema.type === 'integer';
    return (
      <label>
        默认值（可选）
        <Input
          key={`${operationKey}:${label}:${schema.type}:${defaultText(schema)}`}
          disabled={disabled}
          aria-label={`${label}默认值`}
          type={numeric ? 'number' : 'text'}
          step={schema.type === 'integer' ? 1 : 'any'}
          defaultValue={defaultText(schema)}
          placeholder="不填则由调用者提供"
          onBlur={event => {
            if (event.target.value === defaultText(schema)) return;
            try {
              onUpdate(
                updateFieldSchema(schema, 'default', event.target.value)
              );
              setProblem('');
            } catch (error) {
              setProblem(
                error instanceof Error ? error.message : '请检查默认值。'
              );
              event.target.setCustomValidity('默认值格式不正确');
            }
          }}
          onChange={event => event.target.setCustomValidity('')}
        />
      </label>
    );
  };
  const updateParam = (index: number, next: JsonObject): void =>
    patch({
      parameters: params.map((item, position) =>
        position === index ? next : item
      ),
    });
  return (
    <div className="resource-http-config">
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
          <label>
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
          <div className="resource-config-grid">
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
          <details
            className="resource-config-section"
            open={params.length > 0 || undefined}
          >
            <summary>
              请求参数{params.length ? `（${params.length}）` : '（可选）'}
            </summary>
            <p className="resource-tool-hint">
              添加接口需要的路径、查询或请求头参数。路径中的占位符需有同名参数。
            </p>
            {params.map((entry, index) => {
              const parameter = asObject(entry);
              const schema = asObject(parameter.schema);
              const name = String(parameter.name || '');
              return (
                <div
                  className="resource-config-row"
                  key={`${operationKey}:${index}`}
                >
                  {parameter.$ref ? (
                    <p>此参数使用共享定义，保持原配置。可在高级设置中修改。</p>
                  ) : (
                    <>
                      <div className="resource-config-grid">
                        <label>
                          参数名
                          <Input
                            required
                            disabled={disabled}
                            aria-label={`参数 ${index + 1} 名称`}
                            value={name}
                            onChange={event =>
                              updateParam(index, {
                                ...parameter,
                                name: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          位置
                          <select
                            className="resource-config-select"
                            disabled={disabled}
                            value={String(parameter.in || 'query')}
                            onChange={event =>
                              updateParam(index, {
                                ...parameter,
                                in: event.target.value,
                                required:
                                  event.target.value === 'path' ||
                                  parameter.required === true,
                              })
                            }
                          >
                            <option value="path">路径</option>
                            <option value="query">查询</option>
                            <option value="header">请求头</option>
                            <option value="cookie">
                              Cookie（保留现有配置）
                            </option>
                          </select>
                        </label>
                        {typeControl(
                          schema,
                          next =>
                            updateParam(index, { ...parameter, schema: next }),
                          name
                        )}
                        {commitDefault(
                          schema,
                          next =>
                            updateParam(index, { ...parameter, schema: next }),
                          name
                        )}
                      </div>
                      <label>
                        参数说明
                        <Input
                          disabled={disabled}
                          value={String(parameter.description || '')}
                          onChange={event =>
                            updateParam(index, {
                              ...parameter,
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="resource-config-check">
                        <input
                          type="checkbox"
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
                        必填
                      </label>
                    </>
                  )}
                  <Button
                    disabled={disabled}
                    onClick={() =>
                      patch({
                        parameters: params.filter(
                          (_, position) => position !== index
                        ),
                      })
                    }
                  >
                    删除参数
                  </Button>
                </div>
              );
            })}
            <Button
              disabled={disabled}
              onClick={() =>
                patch({
                  parameters: [
                    ...params,
                    {
                      name: nextFieldName(
                        params.map(item => String(asObject(item).name))
                      ),
                      in: 'query',
                      required: false,
                      schema: { type: 'string' },
                    },
                  ],
                })
              }
            >
              添加参数
            </Button>
          </details>
          <details
            className="resource-config-section"
            open={Object.keys(body).length > 0 || undefined}
          >
            <summary>
              请求内容{Object.keys(body).length ? '' : '（可选）'}
            </summary>
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
                {Object.entries(properties).map(([name, entry]) => {
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
                      className="resource-config-row"
                      key={`${operationKey}:${name}`}
                    >
                      <div className="resource-config-grid">
                        <label>
                          字段名
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
                        </label>
                        {typeControl(field, update, `内容 ${name}`)}
                        {commitDefault(field, update, `内容 ${name}`)}
                      </div>
                      <label>
                        字段说明
                        <Input
                          disabled={disabled}
                          value={String(field.description || '')}
                          onChange={event =>
                            update({
                              ...field,
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="resource-config-check">
                        <input
                          type="checkbox"
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
                        必填
                      </label>
                      <Button
                        disabled={disabled}
                        onClick={() =>
                          apply(removeBodyProperty(document, operation, name))
                        }
                      >
                        删除字段
                      </Button>
                    </div>
                  );
                })}
                <Button
                  disabled={disabled}
                  onClick={() => {
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
                >
                  添加内容字段
                </Button>
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
          </details>
          <details
            className="resource-config-section"
            open={activeSchemes.length > 0 || undefined}
          >
            <summary>身份验证（可选）</summary>
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
                <div className="resource-config-row" key={key}>
                  {scheme.type === 'apiKey' ? (
                    <>
                      <div className="resource-config-grid">
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
                          位置
                          <select
                            className="resource-config-select"
                            disabled={disabled}
                            value={String(scheme.in || 'header')}
                            onChange={event =>
                              change({ in: event.target.value })
                            }
                          >
                            <option value="header">请求头</option>
                            <option value="query">查询参数</option>
                          </select>
                        </label>
                      </div>
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
                disabled={disabled}
                onClick={() => patch({ security: [] })}
              >
                不使用身份验证
              </Button>
            )}
            {!activeSchemes.length && (
              <Button
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
          </details>
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="文档暂时无法转换为表单"
          description="请在高级设置中修正文档，或重新导入有效的 OpenAPI 文档。"
        />
      )}
      <details className="resource-config-section">
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
    </div>
  );
}
