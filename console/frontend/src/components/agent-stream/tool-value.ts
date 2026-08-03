export const TOOL_VALUE_LARGE_BYTES = 8192;

export interface ToolValueDescription {
  serialized: string;
  bytes: number;
  summary: string;
  large: boolean;
}

const serializeToolValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? null, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;

const describeKind = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `Array · ${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  }
  if (value !== null && typeof value === 'object') {
    const fields = Object.keys(value).length;
    return `Object · ${fields} ${fields === 1 ? 'field' : 'fields'}`;
  }
  if (value === null) return 'Null';
  return `${typeof value}`;
};

export const describeToolValue = (value: unknown): ToolValueDescription => {
  const serialized = serializeToolValue(value);
  const bytes = new TextEncoder().encode(serialized).byteLength;

  return {
    serialized,
    bytes,
    summary: `${describeKind(value)} · ${formatBytes(bytes)}`,
    large: bytes >= TOOL_VALUE_LARGE_BYTES,
  };
};
