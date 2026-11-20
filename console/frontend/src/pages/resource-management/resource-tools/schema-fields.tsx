import { useId, useRef, useState, type ReactElement } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import './schema-fields.css';
import {
  asObject,
  fieldDefault,
  fieldVariants,
  resolveField,
  updateProperty,
  variantIndex,
  variantLabel,
  variantValue,
} from './schema-form-model';
import { pretty, type JsonObject } from './mcp-tools';

type UnionDraft = {
  index: number;
  source: string | undefined;
  saved: Map<number, unknown>;
};
type FormDrafts = {
  source: string;
  schemaKey: string;
  unions: Map<string, UnionDraft>;
  arrays: Map<string, number[]>;
  nextItem: number;
};
const newDrafts = (source: string, schemaKey: string): FormDrafts => ({
  source,
  schemaKey,
  unions: new Map(),
  arrays: new Map(),
  nextItem: 0,
});
const inputKey = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
};
function arrayIds(drafts: FormDrafts, path: string, length: number): number[] {
  const ids = drafts.arrays.get(path) ?? [];
  while (ids.length < length) ids.push(drafts.nextItem++);
  ids.length = length;
  drafts.arrays.set(path, ids);
  return ids;
}
function forgetPath(drafts: FormDrafts, path: string): void {
  for (const map of [drafts.unions, drafts.arrays])
    for (const key of map.keys())
      if (key === path || key.startsWith(`${path}/`)) map.delete(key);
}

type FieldProps = {
  schema: JsonObject;
  root: JsonObject;
  value: unknown;
  onChange: (value: unknown) => void;
  name: string;
  required?: boolean;
  markRequired?: boolean;
  disabled?: boolean;
  depth?: number;
  drafts: FormDrafts;
  path: string;
  kindControl?: ReactElement;
};

function UnionField({
  variants,
  ...props
}: FieldProps & { variants: JsonObject[] }): ReactElement {
  const id = useId();
  const selection = props.drafts.unions.get(props.path);
  const saved = selection?.saved ?? new Map<number, unknown>();
  const index =
    selection && selection.source === JSON.stringify(props.value)
      ? selection.index
      : variantIndex(
          variants,
          props.value === undefined ? props.schema.default : props.value
        );
  const title =
    typeof props.schema.title === 'string' ? props.schema.title : props.name;
  const change = (next: unknown, selected = index): void => {
    props.drafts.unions.set(props.path, {
      index: selected,
      source: JSON.stringify(next),
      saved,
    });
    props.onChange(next);
  };
  const ownKindControl = (
    <div className="resource-field resource-field-type">
      <label htmlFor={id}>{title}类型</label>
      <select
        id={id}
        disabled={props.disabled}
        value={index}
        onChange={event => {
          const next = Number(event.target.value);
          saved.set(index, props.value);
          change(
            saved.has(next)
              ? saved.get(next)
              : variantValue(variants[next] ?? {}, props.value, props.root),
            next
          );
        }}
      >
        {variants.map((variant, i) => (
          <option key={i} value={i}>
            {variantLabel(variant)}
          </option>
        ))}
      </select>
    </div>
  );
  const kindControl = props.kindControl ? (
    <div className="resource-field-kind-stack">
      {props.kindControl}
      {ownKindControl}
    </div>
  ) : (
    ownKindControl
  );
  return (
    <div className="resource-field-union">
      <Field
        key={index}
        {...props}
        schema={{
          ...variants[index],
          title,
          description: variants[index]?.description ?? props.schema.description,
        }}
        kindControl={kindControl}
        path={`${props.path}/variant:${index}`}
        onChange={next => change(next)}
        depth={(props.depth ?? 0) + 1}
      />
    </div>
  );
}

function Field({
  schema: raw,
  root,
  value,
  onChange,
  name,
  required = false,
  markRequired = true,
  disabled = false,
  depth = 0,
  drafts,
  path,
  kindControl,
}: FieldProps): ReactElement {
  const id = useId();
  const schema = resolveField(raw, root);
  const variants = fieldVariants(schema, root);
  if (variants.length && depth <= 12 && !schema.$ref && !schema.allOf)
    return (
      <UnionField
        schema={schema}
        root={root}
        value={value}
        onChange={onChange}
        name={name}
        required={required}
        markRequired={markRequired}
        disabled={disabled}
        depth={depth}
        variants={variants}
        drafts={drafts}
        path={path}
        kindControl={kindControl}
      />
    );
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
      {required && markRequired && (
        <span className="resource-field-required"> *</span>
      )}
    </span>
  );
  const hint = (
    <small className="resource-field-hint" id={`${id}-hint`}>
      {description}
    </small>
  );
  const kind = kindControl || (
    <span
      className={`resource-field-kind resource-field-kind-${String(type || 'string')}`}
    >
      {Array.isArray(schema.enum)
        ? '枚举'
        : (
            {
              string: '文本',
              integer: '整数',
              number: '数字',
              boolean: '布尔',
              object: '对象',
              array: '列表',
              null: '空值',
            } as Record<string, string>
          )[String(type || 'string')] || '参数'}
    </span>
  );
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
      <div className="resource-field resource-schema-row">
        <label htmlFor={id}>{label}</label>
        {kind}
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
        {hint}
      </div>
    );
  if (Array.isArray(schema.enum) || type === 'boolean' || type === 'null') {
    const choices = Array.isArray(schema.enum)
      ? schema.enum
      : type === 'null'
        ? [null]
        : [true, false];
    return (
      <div className="resource-field resource-schema-row">
        <label htmlFor={id}>{label}</label>
        {kind}
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
        <div className="resource-field resource-schema-row">
          <label htmlFor={id}>{label}</label>
          {kind}
          <button
            id={id}
            type="button"
            className="resource-field-link"
            disabled={disabled}
            onClick={() =>
              onChange(
                fieldDefault(schema, root) ?? (type === 'array' ? [] : {})
              )
            }
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
        drafts={drafts}
        path={`${path}/property:${encodeURIComponent(key)}`}
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
    const items = Array.isArray(value) ? value : [];
    const ids = type === 'array' ? arrayIds(drafts, path, items.length) : [];
    return (
      <fieldset
        className={`resource-field-group${!markRequired ? ' resource-field-root' : ''}`}
        disabled={disabled}
      >
        <legend>{label}</legend>
        {kindControl && (
          <div className="resource-field-container-kind">{kindControl}</div>
        )}
        {!!description && hint}
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
            {items.map((item, index) => (
              <div className="resource-field-array-row" key={ids[index]}>
                <Field
                  schema={asObject(schema.items)}
                  root={root}
                  drafts={drafts}
                  path={`${path}/item:${ids[index]}`}
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
                  className="resource-field-icon resource-field-remove"
                  aria-label={`移除第 ${index + 1} 项`}
                  title={`移除第 ${index + 1} 项`}
                  onClick={() => {
                    forgetPath(drafts, `${path}/item:${ids[index]}`);
                    ids.splice(index, 1);
                    onChange(
                      (value as unknown[]).filter((_, i) => i !== index)
                    );
                  }}
                >
                  <DeleteOutlined aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="resource-field-icon resource-field-create"
              aria-label="添加一项"
              title="添加一项"
              onClick={() =>
                onChange([
                  ...(Array.isArray(value) ? value : []),
                  fieldDefault(resolveField(schema.items, root), root) ?? '',
                ])
              }
            >
              <PlusOutlined aria-hidden="true" />
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
                  drafts={drafts}
                  path={`${path}/property:${encodeURIComponent(key)}`}
                  value={item}
                  name={key}
                  disabled={disabled}
                  depth={depth + 1}
                  onChange={next => onChange(updateProperty(value, key, next))}
                />
                <button
                  type="button"
                  className="resource-field-icon resource-field-remove"
                  aria-label={`移除 ${key}`}
                  title={`移除 ${key}`}
                  onClick={() =>
                    onChange(updateProperty(value, key, undefined))
                  }
                >
                  <DeleteOutlined aria-hidden="true" />
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
    <div className="resource-field resource-schema-row">
      <label htmlFor={id}>{label}</label>
      {kind}
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
        className="resource-field-icon resource-field-create"
        disabled={disabled}
        aria-label="添加参数"
        title="添加参数"
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
        <PlusOutlined aria-hidden="true" />
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
  const [, refresh] = useState(0);
  const schemaKey = JSON.stringify(schema);
  const sourceKey = inputKey(value);
  const saved = useRef<FormDrafts>(newDrafts(sourceKey, schemaKey));
  // A raw editor update replaces the form input; its old inactive drafts must not win.
  if (
    saved.current.source !== sourceKey ||
    saved.current.schemaKey !== schemaKey
  )
    saved.current = newDrafts(sourceKey, schemaKey);
  const drafts = saved.current;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return <p role="alert">参数格式无效，请检查高级参数。</p>;
  }
  return (
    <div className="resource-schema-fields">
      <div className="resource-schema-table">
        <div className="resource-schema-columns" aria-hidden="true">
          <span>参数名</span>
          <span>类型</span>
          <span>值</span>
          <span>说明</span>
        </div>
        <Field
          key={JSON.stringify(schema)}
          schema={{ ...schema, title }}
          root={schema}
          drafts={drafts}
          path="form"
          value={parsed}
          name={title}
          required
          markRequired={false}
          disabled={disabled}
          onChange={next => {
            const source = pretty(next);
            drafts.source = inputKey(source);
            onChange(source);
            refresh(revision => revision + 1);
          }}
        />
      </div>
    </div>
  );
}
