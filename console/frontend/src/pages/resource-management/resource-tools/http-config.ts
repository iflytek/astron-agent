import type { JsonObject } from './mcp-tools';

export const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
];
export const FIELD_TYPES = [
  'string',
  'integer',
  'number',
  'boolean',
  'object',
  'array',
];
export type ConfigOperation = {
  path: string;
  method: string;
  operation: JsonObject;
};
export const asObject = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
export function parseDocument(value: string): JsonObject | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
}
export function configOperations(document: JsonObject): ConfigOperation[] {
  return Object.entries(asObject(document.paths)).flatMap(([path, item]) =>
    Object.entries(asObject(item)).flatMap(([method, operation]) =>
      HTTP_METHODS.includes(method)
        ? [{ path, method, operation: asObject(operation) }]
        : []
    )
  );
}
export function updateOperation(
  document: JsonObject,
  current: ConfigOperation,
  change: JsonObject
): JsonObject {
  const paths = asObject(document.paths);
  const item = asObject(paths[current.path]);
  return {
    ...document,
    paths: {
      ...paths,
      [current.path]: {
        ...item,
        [current.method]: { ...current.operation, ...change },
      },
    },
  };
}
export function moveOperation(
  document: JsonObject,
  current: ConfigOperation,
  path: string,
  method: string
): JsonObject {
  if (path === current.path && method === current.method) return document;
  const paths = { ...asObject(document.paths) };
  const previous = { ...asObject(paths[current.path]) };
  const destination =
    path === current.path ? previous : { ...asObject(paths[path]) };
  if (
    destination[method] &&
    !(path === current.path && method === current.method)
  )
    throw new Error('此路径和方法已存在，请使用其他请求路径或方法。');
  delete previous[current.method];
  if (Object.keys(previous).length) paths[current.path] = previous;
  else delete paths[current.path];
  const inherited = Object.fromEntries(
    Object.entries(previous).filter(([key]) => !HTTP_METHODS.includes(key))
  );
  const movedOperation =
    path !== current.path && Array.isArray(inherited.parameters)
      ? {
          ...current.operation,
          parameters: [
            ...inherited.parameters,
            ...(Array.isArray(current.operation.parameters)
              ? current.operation.parameters
              : []),
          ],
        }
      : current.operation;
  // Preserve path-level metadata without applying another path's inherited parameters.
  paths[path] = {
    ...(path === current.path ? previous : destination),
    [method]: movedOperation,
  };
  return { ...document, paths };
}
export function updateServer(document: JsonObject, url: string): JsonObject {
  const servers = Array.isArray(document.servers) ? [...document.servers] : [];
  servers[0] = { ...asObject(servers[0]), url };
  return { ...document, servers };
}
export function defaultText(schema: JsonObject): string {
  if (!Object.prototype.hasOwnProperty.call(schema, 'default')) return '';
  return typeof schema.default === 'string'
    ? schema.default
    : JSON.stringify(schema.default);
}
/** Form edits retain enums, constraints and extension metadata unless the type changes. */
export function updateFieldSchema(
  schema: JsonObject,
  key: string,
  value: string
): JsonObject {
  if (key !== 'default') {
    const next = { ...schema, [key]: value };
    if (key === 'type' && value !== schema.type) {
      delete next.default;
      delete next.enum;
      if (value === 'array' && !next.items) next.items = { type: 'string' };
    }
    return next;
  }
  const next = { ...schema };
  if (value === '') {
    delete next.default;
    return next;
  }
  if (schema.type === 'string' || !schema.type) next.default = value;
  else {
    const parsed: unknown = JSON.parse(value);
    if (schema.type === 'boolean' && typeof parsed !== 'boolean')
      throw new Error('默认值需为 true 或 false。');
    if (
      (schema.type === 'number' || schema.type === 'integer') &&
      (typeof parsed !== 'number' ||
        !Number.isFinite(parsed) ||
        (schema.type === 'integer' && !Number.isInteger(parsed)))
    )
      throw new Error('默认值需为有效数字。');
    if (schema.type === 'array' && !Array.isArray(parsed))
      throw new Error('默认值需为数组。');
    if (
      schema.type === 'object' &&
      (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    )
      throw new Error('默认值需为对象。');
    next.default = parsed;
  }
  return next;
}
export function updateBodyProperty(
  document: JsonObject,
  operation: ConfigOperation,
  name: string,
  nextName: string,
  field: JsonObject,
  required: boolean
): JsonObject {
  if (!nextName.trim()) throw new Error('字段名不能为空。');
  const requestBody = asObject(operation.operation.requestBody);
  const content = asObject(requestBody.content);
  const media = asObject(content['application/json']);
  const schema = asObject(media.schema);
  const properties = { ...asObject(schema.properties) };
  if (
    nextName !== name &&
    Object.prototype.hasOwnProperty.call(properties, nextName)
  )
    throw new Error('参数名已存在。');
  const entries = Object.entries(properties).map(([key, value]) =>
    key === name ? [nextName, field] : [key, value]
  );
  if (!Object.prototype.hasOwnProperty.call(properties, name))
    entries.push([nextName, field]);
  const names = (Array.isArray(schema.required) ? schema.required : []).filter(
    key => key !== name && key !== nextName
  );
  if (required) names.push(nextName);
  return updateOperation(document, operation, {
    requestBody: {
      ...requestBody,
      content: {
        ...content,
        'application/json': {
          ...media,
          schema: {
            ...schema,
            type: 'object',
            properties: Object.fromEntries(entries),
            required: names,
          },
        },
      },
    },
  });
}
export function removeBodyProperty(
  document: JsonObject,
  operation: ConfigOperation,
  name: string
): JsonObject {
  const requestBody = asObject(operation.operation.requestBody);
  const content = asObject(requestBody.content);
  const media = asObject(content['application/json']);
  const schema = asObject(media.schema);
  const properties = { ...asObject(schema.properties) };
  delete properties[name];
  return updateOperation(document, operation, {
    requestBody: {
      ...requestBody,
      content: {
        ...content,
        'application/json': {
          ...media,
          schema: {
            ...schema,
            properties,
            required: (Array.isArray(schema.required)
              ? schema.required
              : []
            ).filter(key => key !== name),
          },
        },
      },
    },
  });
}
export function nextFieldName(names: string[]): string {
  let index = 1;
  while (names.includes(`parameter${index}`)) index++;
  return `parameter${index}`;
}
