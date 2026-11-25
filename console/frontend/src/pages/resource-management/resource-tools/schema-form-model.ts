import type { JsonObject } from './mcp-tools';

export const asObject = (value: unknown): JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

/** Resolve document-local references without network access or recursive expansion. */
export function resolveField(value: unknown, root: JsonObject): JsonObject {
  let field = asObject(value);
  const seen = new Set<string>();
  while (typeof field.$ref === 'string') {
    const ref = field.$ref;
    if (!ref.startsWith('#/') || seen.has(ref)) return field;
    seen.add(ref);
    const resolved = ref
      .slice(2)
      .split('/')
      .reduce<unknown>(
        (part, key) =>
          asObject(part)[key.replace(/~1/g, '/').replace(/~0/g, '~')],
        root
      );
    field = {
      ...asObject(resolved),
      ...Object.fromEntries(
        Object.entries(field).filter(([key]) => key !== '$ref')
      ),
    };
  }
  return field;
}

/** Schema for Console's existing debug envelope, with operation overrides intact. */
export function httpInputSchema(tool: {
  schema?: unknown;
  method?: string;
  endPoint?: string;
}): JsonObject {
  let document: JsonObject;
  try {
    document = asObject(
      typeof tool.schema === 'string' ? JSON.parse(tool.schema) : tool.schema
    );
  } catch {
    return { type: 'object', additionalProperties: true };
  }
  const resolve = (value: unknown): JsonObject => resolveField(value, document);
  for (const [path, definition] of Object.entries(asObject(document.paths))) {
    const item = resolve(definition);
    for (const [method, raw] of Object.entries(item)) {
      if (
        !['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(
          method.toLowerCase()
        )
      )
        continue;
      if (tool.method && method.toLowerCase() !== tool.method.toLowerCase())
        continue;
      const server = asObject(
        Array.isArray(document.servers) ? document.servers[0] : undefined
      ).url;
      if (
        tool.endPoint &&
        `${typeof server === 'string' ? server.replace(/\/$/, '') : ''}${path}` !==
          tool.endPoint
      )
        continue;
      const operation = resolve(raw);
      const groups: Record<string, JsonObject> = {};
      const parameters = new Map<string, JsonObject>();
      for (const owner of [item, operation]) {
        for (const rawParameter of Array.isArray(owner.parameters)
          ? owner.parameters
          : []) {
          const parameter = resolve(rawParameter);
          parameters.set(`${parameter.in}:${parameter.name}`, parameter);
        }
      }
      for (const parameter of parameters.values()) {
        const location = String(parameter.in),
          name = String(parameter.name);
        if (!['path', 'query', 'header'].includes(location)) continue;
        const group = (groups[location] ||= {
          type: 'object',
          title: { path: '路径参数', query: '查询参数', header: '请求头' }[
            location
          ],
          properties: {},
          required: [],
        });
        asObject(group.properties)[name] = {
          ...resolve(parameter.schema),
          description:
            parameter.description ?? resolve(parameter.schema).description,
        };
        if (parameter.required === true || location === 'path')
          (group.required as string[]).push(name);
      }
      const body = resolve(operation.requestBody);
      const media = asObject(asObject(body.content)['application/json']);
      if (media.schema)
        groups.body = { ...resolve(media.schema), title: '请求内容' };
      return {
        ...document,
        type: 'object',
        'x-console-http-input': true,
        properties: groups,
        required: [
          ...Object.keys(groups).filter(
            key => key !== 'body' && (groups[key]?.required as string[])?.length
          ),
          ...(body.required === true ? ['body'] : []),
        ],
      };
    }
  }
  return { type: 'object', additionalProperties: true };
}

export function updateProperty(
  value: unknown,
  key: string,
  next: unknown
): JsonObject {
  const result = { ...asObject(value) };
  if (next === undefined) delete result[key];
  else
    Object.defineProperty(result, key, {
      value: next,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  return result;
}

/** Presentation branches only: the server remains responsible for schema validation. */
export function fieldVariants(
  schema: JsonObject,
  root: JsonObject
): JsonObject[] {
  if (Array.isArray(schema.enum)) return [];
  const variants = Array.isArray(schema.oneOf)
    ? schema.oneOf
    : Array.isArray(schema.anyOf)
      ? schema.anyOf
      : Array.isArray(schema.type)
        ? schema.type.map(type => ({ type }))
        : [];
  const base = Object.fromEntries(
    Object.entries(schema).filter(
      ([key]) => !['oneOf', 'anyOf', 'type', 'default', 'title'].includes(key)
    )
  );
  return variants.map(raw => ({
    ...base,
    ...(Array.isArray(schema.type) ? {} : { type: schema.type }),
    ...resolveField(raw, root),
  }));
}

export function fieldType(schema: JsonObject): string {
  return typeof schema.type === 'string'
    ? schema.type
    : schema.properties
      ? 'object'
      : schema.items
        ? 'array'
        : 'string';
}

/** Infer a useful editor from the value's JSON type, without coercing saved data. */
export function variantIndex(variants: JsonObject[], value: unknown): number {
  const type =
    value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const index = variants.findIndex(schema => {
    const variantType = fieldType(schema);
    return (
      (variantType === type ||
        (variantType === 'integer' &&
          type === 'number' &&
          Number.isInteger(value))) &&
      (!Array.isArray(schema.enum) ||
        schema.enum.some(
          choice => JSON.stringify(choice) === JSON.stringify(value)
        ))
    );
  });
  if (index >= 0) return index;
  const withDefault = variants.findIndex(schema => 'default' in schema);
  return withDefault >= 0
    ? withDefault
    : Math.max(
        0,
        variants.findIndex(schema => fieldType(schema) !== 'null')
      );
}

export function variantLabel(schema: JsonObject): string {
  if (typeof schema.title === 'string') return schema.title;
  return (
    {
      string: '文本',
      array: '列表',
      object: '对象',
      number: '数字',
      integer: '整数',
      boolean: '是 / 否',
      null: '空值',
    }[fieldType(schema)] || '参数'
  );
}

/** Moving a single text value between text/list editors should not require retyping. */
export function variantValue(
  schema: JsonObject,
  value: unknown,
  root: JsonObject
): unknown {
  const type = fieldType(schema);
  if (
    type === 'array' &&
    typeof value === 'string' &&
    fieldType(resolveField(schema.items, root)) === 'string'
  )
    return value ? [value] : [];
  if (
    type === 'string' &&
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === 'string'
  )
    return value[0];
  if (type === 'null') return null;
  return fieldDefault(schema, root);
}

/** Only explicit defaults are initial values; optional fields remain absent. */
export function fieldDefault(
  definition: JsonObject,
  root = definition,
  depth = 0
): unknown {
  if (depth > 12) return undefined;
  const schema = resolveField(definition, root);
  if ('default' in schema && schema.default !== '******') return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  const variants = fieldVariants(schema, root);
  if (variants.length)
    return fieldDefault(
      variants[variantIndex(variants, undefined)] ?? {},
      root,
      depth + 1
    );
  if (schema.type === 'object' || schema.properties) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    return Object.fromEntries(
      Object.entries(asObject(schema.properties)).flatMap(([key, child]) => {
        const field = resolveField(child, root);
        if (!required.includes(key) && !('default' in field)) return [];
        const value = fieldDefault(field, root, depth + 1);
        return value === undefined ? [] : [[key, value]];
      })
    );
  }
  if (schema.type === 'array') return [];
  return undefined;
}
