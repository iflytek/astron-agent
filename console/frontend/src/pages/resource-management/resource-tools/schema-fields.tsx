import { useId, type ReactElement } from 'react';
import {
  asObject,
  fieldDefault,
  resolveField,
  updateProperty,
} from './schema-form-model';
import { pretty, type JsonObject } from './mcp-tools';

type FieldProps = {
  schema: JsonObject;
  root: JsonObject;
  value: unknown;
  onChange: (value: unknown) => void;
  name: string;
  required?: boolean;
  disabled?: boolean;
  depth?: number;
};

function Field({
  schema: raw,
  root,
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  depth = 0,
}: FieldProps): ReactElement {
  const id = useId();
  const schema = resolveField(raw, root);
  const title = typeof schema.title === 'string' ? schema.title : name;
  const type = Array.isArray(schema.type)
    ? schema.type.find(item => item !== 'null')
    : schema.type;
  const object = type === 'object' || !!schema.properties;
  const description =
    typeof schema.description === 'string' ? schema.description : '';
  const label = (
    <span>
      {title}
      {required && <span className="resource-field-required"> *</span>}
    </span>
  );
  const hint = description && <small id={`${id}-hint`}>{description}</small>;
  const common = {
    id,
    disabled,
    'aria-describedby': description ? `${id}-hint` : undefined,
  };
  const unsupported =
    depth > 12 ||
    !!schema.$ref ||
    !!schema.oneOf ||
    !!schema.anyOf ||
    !!schema.allOf;
  if (unsupported)
    return (
      <div className="resource-field">
        <label htmlFor={id}>{label}</label>
        {hint}
        <textarea
          {...common}
          defaultValue={value === undefined ? '' : pretty(value)}
          placeholder="复杂参数，可在高级参数中填写"
          onBlur={event => {
            try {
              onChange(
                event.target.value ? JSON.parse(event.target.value) : undefined
              );
              event.target.setCustomValidity('');
            } catch {
              event.target.setCustomValidity('请输入有效的 JSON 值');
              event.target.reportValidity();
            }
          }}
        />
      </div>
    );
  if (Array.isArray(schema.enum) || type === 'boolean' || type === 'null') {
    const choices = Array.isArray(schema.enum)
      ? schema.enum
      : type === 'null'
        ? [null]
        : [true, false];
    return (
      <div className="resource-field">
        <label htmlFor={id}>{label}</label>
        <select
          {...common}
          required={required}
          value={value === undefined ? '' : JSON.stringify(value)}
          onChange={event =>
            onChange(
              event.target.value === ''
                ? undefined
                : JSON.parse(event.target.value)
            )
          }
        >
          <option value="">请选择</option>
          {choices.map((choice, i) => (
            <option key={i} value={JSON.stringify(choice)}>
              {choice === true
                ? '是'
                : choice === false
                  ? '否'
                  : choice === null
                    ? '空值'
                    : typeof choice === 'object'
                      ? JSON.stringify(choice)
                      : String(choice)}
            </option>
          ))}
        </select>
        {hint}
      </div>
    );
  }
  if (object || type === 'array') {
    if (value === undefined && !required)
      return (
        <div className="resource-field">
          <button
            type="button"
            className="resource-field-link"
            disabled={disabled}
            onClick={() => onChange(type === 'array' ? [] : {})}
          >
            填写{title}
          </button>
          {hint}
        </div>
      );
    const properties = asObject(schema.properties);
    const current = asObject(value);
    const requiredNames = Array.isArray(schema.required) ? schema.required : [];
    const visible = Object.entries(properties).filter(
      ([key, child]) =>
        requiredNames.includes(key) ||
        key in current ||
        'default' in asObject(child)
    );
    const optional = Object.entries(properties).filter(
      ([key, child]) =>
        !requiredNames.includes(key) &&
        !(key in current) &&
        !('default' in asObject(child))
    );
    const render = ([key, child]: [string, unknown]): ReactElement => (
      <Field
        key={key}
        schema={asObject(child)}
        root={root}
        value={current[key]}
        name={key}
        required={requiredNames.includes(key)}
        disabled={disabled}
        depth={depth + 1}
        onChange={next => onChange(updateProperty(value, key, next))}
      />
    );
    const entries = Object.entries(current).filter(
      ([key, item]) =>
        !(key in properties) &&
        !(
          schema['x-console-http-input'] &&
          ['path', 'query', 'header'].includes(key) &&
          Object.keys(asObject(item)).length === 0
        )
    );
    const additional = schema.additionalProperties;
    return (
      <fieldset className="resource-field-group" disabled={disabled}>
        <legend>{label}</legend>
        {hint}
        {!required && (
          <button
            type="button"
            className="resource-field-link"
            onClick={() => onChange(undefined)}
          >
            不填写{title}
          </button>
        )}
        {type === 'array' ? (
          <>
            {(Array.isArray(value) ? value : []).map((item, index) => (
              <div className="resource-field-array-row" key={index}>
                <Field
                  schema={asObject(schema.items)}
                  root={root}
                  value={item}
                  name={`第 ${index + 1} 项`}
                  required
                  disabled={disabled}
                  depth={depth + 1}
                  onChange={next =>
                    onChange(
                      (value as unknown[]).map((old, i) =>
                        i === index ? next : old
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="resource-field-link"
                  onClick={() =>
                    onChange((value as unknown[]).filter((_, i) => i !== index))
                  }
                >
                  移除第 {index + 1} 项
                </button>
              </div>
            ))}
            <button
              type="button"
              className="resource-field-link"
              onClick={() =>
                onChange([
                  ...(Array.isArray(value) ? value : []),
                  fieldDefault(resolveField(schema.items, root)) ?? '',
                ])
              }
            >
              添加一项
            </button>
          </>
        ) : (
          <>
            {!visible.length &&
              !optional.length &&
              !entries.length &&
              !additional && (
                <p className="resource-tool-hint">无需填写参数。</p>
              )}
            {visible.map(render)}
            {!!optional.length && (
              <details className="resource-field-optional">
                <summary>可选参数（{optional.length}）</summary>
                {optional.map(render)}
              </details>
            )}
            {entries.map(([key, item]) => (
              <div className="resource-field-array-row" key={key}>
                <Field
                  schema={
                    asObject(additional).type
                      ? asObject(additional)
                      : {
                          type:
                            typeof item === 'string'
                              ? 'string'
                              : typeof item === 'number'
                                ? 'number'
                                : typeof item === 'boolean'
                                  ? 'boolean'
                                  : Array.isArray(item)
                                    ? 'array'
                                    : 'object',
                        }
                  }
                  root={root}
                  value={item}
                  name={key}
                  disabled={disabled}
                  depth={depth + 1}
                  onChange={next => onChange(updateProperty(value, key, next))}
                />
                <button
                  type="button"
                  className="resource-field-link"
                  onClick={() =>
                    onChange(updateProperty(value, key, undefined))
                  }
                >
                  移除 {key}
                </button>
              </div>
            ))}
            {additional !== false && additional && (
              <AddProperty
                disabled={disabled}
                existing={Object.keys(current)}
                onAdd={key =>
                  onChange(
                    updateProperty(
                      value,
                      key,
                      fieldDefault(asObject(additional)) ?? ''
                    )
                  )
                }
              />
            )}
          </>
        )}
      </fieldset>
    );
  }
  const numeric = type === 'number' || type === 'integer';
  return (
    <div className="resource-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...common}
        type={
          numeric
            ? 'number'
            : schema.format === 'password'
              ? 'password'
              : 'text'
        }
        step={type === 'integer' ? 1 : 'any'}
        min={typeof schema.minimum === 'number' ? schema.minimum : undefined}
        max={typeof schema.maximum === 'number' ? schema.maximum : undefined}
        minLength={
          typeof schema.minLength === 'number' ? schema.minLength : undefined
        }
        maxLength={
          typeof schema.maxLength === 'number' ? schema.maxLength : undefined
        }
        required={required}
        value={value === undefined || value === null ? '' : String(value)}
        placeholder={
          schema.default !== undefined ? String(schema.default) : undefined
        }
        onChange={event =>
          onChange(
            numeric
              ? event.target.value === ''
                ? undefined
                : event.target.valueAsNumber
              : event.target.value === '' && !required
                ? undefined
                : event.target.value
          )
        }
      />
      {hint}
    </div>
  );
}

function AddProperty({
  disabled,
  existing,
  onAdd,
}: {
  disabled: boolean;
  existing: string[];
  onAdd: (key: string) => void;
}): ReactElement {
  const id = useId();
  return (
    <div className="resource-field-add">
      <label htmlFor={id}>参数名</label>
      <input id={id} disabled={disabled} placeholder="如 API_KEY" />
      <button
        type="button"
        className="resource-field-link"
        disabled={disabled}
        onClick={() => {
          const input = document.getElementById(id) as HTMLInputElement;
          const key = input.value.trim();
          input.setCustomValidity(
            !key ? '请输入参数名' : existing.includes(key) ? '参数名已存在' : ''
          );
          if (input.reportValidity()) {
            onAdd(key);
            input.value = '';
          }
        }}
      >
        添加参数
      </button>
    </div>
  );
}

export function SchemaFields({
  schema,
  value,
  onChange,
  disabled = false,
  title = '调用参数',
}: {
  schema: JsonObject;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
}): ReactElement {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return <p role="alert">参数格式无效，请检查高级参数。</p>;
  }
  return (
    <div className="resource-schema-fields">
      <Field
        schema={{ ...schema, title }}
        root={schema}
        value={parsed}
        name={title}
        required
        disabled={disabled}
        onChange={next => onChange(pretty(next))}
      />
    </div>
  );
}
