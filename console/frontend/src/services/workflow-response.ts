import type { FlowType } from '@/components/workflow/types';

/** Keep the canvas's serialized fields at one API boundary. */
export function normalizeWorkflowResponse(value: FlowType): FlowType {
  const serialized = (config: unknown): string =>
    typeof config === 'string' ? config : JSON.stringify(config ?? {});
  const response = value as FlowType & { avatarColor?: string | null };
  return {
    ...response,
    color: response.avatarColor ?? response.color ?? '',
    advancedConfig: serialized(response.advancedConfig),
    ext: serialized(response.ext),
  };
}
