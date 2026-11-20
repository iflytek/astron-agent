export type JsonObject = Record<string, unknown>;
export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: JsonObject;
};

/** Preserve server-owned JSON Schema and falsy defaults when preparing a test. */
export function schemaExample(schema: JsonObject = {}): unknown {
  if ('default' in schema) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(
      Object.entries((schema.properties || {}) as Record<string, JsonObject>)
        .filter(
          ([name, value]) =>
            ((schema.required || []) as string[]).includes(name) ||
            'default' in value
        )
        .map(([name, value]) => [name, schemaExample(value)])
    );
  }
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return false;
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'null') return null;
  return '';
}

export function mcpTools(value: unknown): McpTool[] {
  const data = value as {
    tools?: McpTool[] | { servers?: { tools?: McpTool[] }[] };
  };
  if (Array.isArray(data?.tools)) return data.tools;
  return data?.tools?.servers?.flatMap(server => server.tools || []) || [];
}

export const pretty = (value: unknown): string =>
  JSON.stringify(value, null, 2);

export function parseArguments(value: string): JsonObject {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('调用参数必须是 JSON 对象。');
  }
  return parsed as JsonObject;
}

export function mcpResultFailed(value: unknown): boolean {
  return Boolean((value as { isError?: boolean } | null)?.isError);
}
