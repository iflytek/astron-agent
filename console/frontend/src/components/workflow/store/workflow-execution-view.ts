import type { FlowType } from '../types';

type FrozenConfiguration = { flowConfig?: unknown; advancedConfig?: unknown };

/** Both media and chat UI must read the same immutable execution selection. */
export function workflowExecutionView(
  draft: FlowType | undefined,
  historical: boolean,
  version: FrozenConfiguration | null | undefined
): FlowType | undefined {
  if (!draft || !historical) return draft;
  const serialized = (value: unknown): string =>
    typeof value === 'string' ? value : JSON.stringify(value ?? {});
  return {
    ...draft,
    flowConfig: serialized(version?.flowConfig),
    advancedConfig: serialized(version?.advancedConfig),
  };
}
