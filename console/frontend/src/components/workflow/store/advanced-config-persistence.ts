import { createSaveCoordinator } from './workflow-save-coordinator';
import type { AdvancedConfigUpdate } from '../types/drawer/advanced-config';

function mergePatch(
  previous: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...previous };
  for (const [key, value] of Object.entries(patch)) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? mergePatch(
            result[key] &&
              typeof result[key] === 'object' &&
              !Array.isArray(result[key])
              ? (result[key] as Record<string, unknown>)
              : {},
            value as Record<string, unknown>
          )
        : value;
  }
  return result;
}

function acknowledge(
  current: Record<string, unknown>,
  saved: Record<string, unknown>
): Record<string, unknown> {
  const remaining = { ...current };
  for (const [key, value] of Object.entries(saved)) {
    const latest = remaining[key];
    if (JSON.stringify(latest) === JSON.stringify(value)) {
      delete remaining[key];
    } else if (
      latest &&
      value &&
      typeof latest === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(latest) &&
      !Array.isArray(value)
    ) {
      const child = acknowledge(
        latest as Record<string, unknown>,
        value as Record<string, unknown>
      );
      if (Object.keys(child).length) remaining[key] = child;
      else delete remaining[key];
    }
  }
  return remaining;
}

/** Serialize this editor's patches; a debounce must not discard another field. */
export function createAdvancedConfigPersistence(
  persist: (patch: AdvancedConfigUpdate) => Promise<unknown>,
  onError: (error: unknown) => void
): {
  update: (patch: AdvancedConfigUpdate, delayed?: boolean) => void;
  flush: () => Promise<void>;
  hasPending: () => boolean;
  reset: () => void;
} {
  let pending: Record<string, unknown> = {};
  const coordinator = createSaveCoordinator({
    debounceMs: 500,
    captureSnapshot: () =>
      Object.keys(pending).length
        ? { value: pending, fingerprint: JSON.stringify(pending) }
        : undefined,
    persistSnapshot: persist,
    onPersisted: (_result, saved) => {
      pending = acknowledge(pending, saved);
    },
    onBackgroundError: onError,
  });
  return {
    update(patch: AdvancedConfigUpdate, delayed = false): void {
      pending = mergePatch(pending, patch);
      if (delayed) coordinator.schedule();
      else void coordinator.flush().catch(onError);
    },
    flush: (): Promise<void> => coordinator.flush(),
    hasPending: (): boolean => Object.keys(pending).length > 0,
    reset: (): void => {
      pending = {};
      coordinator.reset();
    },
  };
}
