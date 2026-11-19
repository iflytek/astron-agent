import { pretty, schemaExample, type JsonObject } from './mcp-tools';

type HttpTool = {
  schema?: JsonObject | string;
  method?: string;
  endPoint?: string;
};
type Template = { input: string; hint: string };
const methods = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);
const object = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

/** Only adapts saved OpenAPI defaults to Console's debug argument envelope. */
export function httpTestTemplate(tool: HttpTool = {}): Template {
  const args: JsonObject = { path: {}, query: {}, header: {} };
  const missing: string[] = [];
  let document: JsonObject;
  try {
    document = object(
      typeof tool.schema === 'string' ? JSON.parse(tool.schema) : tool.schema
    );
  } catch {
    return {
      input: pretty(args),
      hint: '参数定义格式无效，请在工具管理中修复。',
    };
  }
  // Resolve document-local JSON Pointers only; never fetch remote definitions.
  const resolve = (value: unknown): JsonObject => {
    let current = object(value);
    const seen = new Set<string>();
    while (typeof current.$ref === 'string') {
      const ref = current.$ref;
      if (!ref.startsWith('#/') || seen.has(ref)) return {};
      seen.add(ref);
      current = object(
        ref
          .slice(2)
          .split('/')
          .reduce<unknown>(
            (part, key) =>
              object(part)[key.replace(/~1/g, '/').replace(/~0/g, '~')],
            document
          )
      );
    }
    return current;
  };
  const containsMask = (value: unknown): boolean =>
    value === '******' ||
    (Boolean(value) &&
      typeof value === 'object' &&
      Object.values(value as JsonObject).some(containsMask));

  // Unlike MCP examples, HTTP tests must not invent executable required values.
  const defaults = (
    value: unknown,
    path: string,
    required: boolean,
    ancestors = new Set<JsonObject>()
  ): unknown => {
    const schema = resolve(value);
    if ('default' in schema && !containsMask(schema.default))
      return schemaExample(schema);
    if (ancestors.has(schema)) {
      if (required) missing.push(path);
      return undefined;
    }
    const next = new Set(ancestors).add(schema);
    const localMissing = missing.length;
    const properties = Object.entries(object(schema.properties));
    const result = Object.fromEntries(
      properties.flatMap(([name, child]) => {
        const childValue = defaults(
          child,
          `${path}.${name}`,
          Array.isArray(schema.required) && schema.required.includes(name),
          next
        );
        return childValue === undefined ? [] : [[name, childValue]];
      })
    );
    if (Object.keys(result).length) return result;
    // Absent optional objects do not require their nested fields yet.
    if (!required) missing.splice(localMissing);
    else if (missing.length === localMissing) missing.push(path);
    return undefined;
  };

  let operation: JsonObject | undefined;
  let pathItem: JsonObject = {};
  for (const [path, definition] of Object.entries(object(document.paths))) {
    const item = resolve(definition);
    for (const [method, value] of Object.entries(item)) {
      if (!methods.has(method.toLowerCase())) continue;
      if (tool.method && method.toLowerCase() !== tool.method.toLowerCase())
        continue;
      const server = object(
        Array.isArray(document.servers) ? document.servers[0] : undefined
      ).url;
      if (
        tool.endPoint &&
        `${typeof server === 'string' ? server.replace(/\/$/, '') : ''}${path}` !==
          tool.endPoint
      )
        continue;
      operation = resolve(value);
      pathItem = item;
      break;
    }
    if (operation) break;
  }
  if (!operation)
    return {
      input: pretty(args),
      hint: '未找到测试操作，请检查已保存的工具定义。',
    };

  const parameters = new Map<string, JsonObject>();
  for (const owner of [pathItem, operation]) {
    for (const value of Array.isArray(owner.parameters)
      ? owner.parameters
      : []) {
      const parameter = resolve(value);
      parameters.set(`${parameter.in}:${parameter.name}`, parameter);
    }
  }
  for (const parameter of parameters.values()) {
    const location = parameter.in;
    const name = parameter.name;
    if (
      typeof location !== 'string' ||
      !['path', 'query', 'header'].includes(location) ||
      typeof name !== 'string'
    )
      continue;
    const value = defaults(
      parameter.schema,
      `${location}.${name}`,
      parameter.required === true || location === 'path'
    );
    if (value !== undefined)
      args[location] = { ...object(args[location]), [name]: value };
  }
  const body = resolve(operation.requestBody);
  const media = object(object(body.content)['application/json']);
  if (Object.keys(body).length) {
    const value = defaults(media.schema, 'body', body.required === true);
    if (value !== undefined) args.body = value;
  }
  return {
    input: pretty(args),
    hint: missing.length
      ? `已填入定义中的默认值。运行前请补充必填参数：${missing.join('、')}。`
      : '已填入定义中的默认值；修改后的 JSON 将按原样提交。',
  };
}
