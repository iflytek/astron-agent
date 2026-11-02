import type { ModelConfigParam } from '@/types/model';
import type {
  WorkflowModel,
  WorkflowNodeParameters,
} from '@/components/workflow/types/domain';

export type ModelSetting = Pick<
  ModelConfigParam,
  | 'key'
  | 'name'
  | 'desc'
  | 'constraintType'
  | 'constraintContent'
  | 'default'
  | 'precision'
>;
export type ModelSettingValue = number | boolean | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readModelSettings(
  model: Pick<WorkflowModel, 'config' | 'llmSource' | 'serviceId'> | undefined
): ModelSetting[] {
  if (!model) return [];
  try {
    const config: unknown =
      typeof model.config === 'string'
        ? JSON.parse(model.config || '[]')
        : model.config;
    let values: unknown = config;
    if (
      model.llmSource === 2 &&
      isRecord(config) &&
      isRecord(config.serviceBlock)
    ) {
      const blocks =
        config.serviceBlock[model.serviceId] ??
        config.serviceBlock['@@serviceId@@'];
      values =
        Array.isArray(blocks) && isRecord(blocks[0]) ? blocks[0].fields : [];
    }
    if (!Array.isArray(values)) return [];
    return values.flatMap((value: unknown): ModelSetting[] => {
      if (
        !isRecord(value) ||
        typeof value.key !== 'string' ||
        (value.constraintType !== 'range' &&
          value.constraintType !== 'switch') ||
        (typeof value.default !== 'number' &&
          typeof value.default !== 'boolean')
      )
        return [];
      const constraints = Array.isArray(value.constraintContent)
        ? value.constraintContent.flatMap((entry: unknown) =>
            isRecord(entry) &&
            (typeof entry.name === 'string' || typeof entry.name === 'number')
              ? [{ name: entry.name }]
              : []
          )
        : [];
      const key =
        model.llmSource !== 2
          ? value.key
          : value.key === 'max_tokens'
            ? 'maxTokens'
            : value.key === 'top_k'
              ? 'topK'
              : value.key;
      return [
        {
          key,
          name:
            model.llmSource === 2 && typeof value.name === 'string'
              ? value.name
              : value.key,
          desc:
            model.llmSource === 2
              ? typeof value.desc === 'string'
                ? value.desc
                : undefined
              : typeof value.name === 'string'
                ? value.name
                : undefined,
          constraintType: value.constraintType,
          default: value.default,
          constraintContent: constraints,
          precision:
            typeof value.precision === 'number' ? value.precision : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function readModelSetting(
  parameters: WorkflowNodeParameters,
  key: string
): ModelSettingValue | undefined {
  const value: unknown = Reflect.get(parameters, key);
  return value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? value
    : undefined;
}

export function writeModelSetting(
  parameters: WorkflowNodeParameters,
  key: string,
  value: ModelSettingValue
): void {
  Reflect.set(parameters, key, value);
}

export function numericConstraint(
  value: string | number | undefined
): number | undefined {
  if (value === undefined) return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}
