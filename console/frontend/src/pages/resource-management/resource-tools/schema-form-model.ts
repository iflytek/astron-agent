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

/** Only explicit defaults are initial values; optional fields remain absent. */
export function fieldDefault(schema: JsonObject): unknown {
  if ('default' in schema && schema.default !== '******') return schema.default;
  if (schema.type === 'object' || schema.properties) return {};
  if (schema.type === 'array') return [];
  return undefined;
}
