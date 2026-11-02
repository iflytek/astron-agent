import type { WorkflowModel } from '@/components/workflow/types/domain';

type PromptModel = Partial<
  Pick<
    WorkflowModel,
    | 'id'
    | 'llmId'
    | 'domain'
    | 'serviceId'
    | 'url'
    | 'isThink'
    | 'provider'
    | 'llmSource'
    | 'icon'
    | 'name'
  >
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Prompt templates store their model selection as serialized JSON. */
export function parsePromptModel(serialized: string): PromptModel | undefined {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const result: PromptModel = {};
  for (const key of [
    'domain',
    'serviceId',
    'url',
    'provider',
    'icon',
    'name',
  ] as const) {
    if (key in value && typeof value[key] === 'string')
      result[key] = value[key];
  }
  for (const key of ['id', 'llmId'] as const) {
    if (
      key in value &&
      typeof value[key] === 'number' &&
      Number.isFinite(value[key])
    )
      result[key] = value[key];
  }
  if ('isThink' in value && typeof value.isThink === 'boolean')
    result.isThink = value.isThink;
  if (
    'llmSource' in value &&
    (value.llmSource === 0 || value.llmSource === 1 || value.llmSource === 2)
  )
    result.llmSource = value.llmSource;
  return result.id !== undefined || result.llmId !== undefined || result.domain
    ? result
    : undefined;
}
