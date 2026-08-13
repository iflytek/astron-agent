export interface SaveSnapshot<TValue> {
  value: TValue;
  fingerprint: string;
}

interface SaveCoordinatorOptions<TValue, TResult> {
  captureSnapshot: () => SaveSnapshot<TValue> | undefined;
  persistSnapshot: (value: TValue) => Promise<TResult>;
  onPersisted?: (result: TResult, value: TValue) => void;
  onSavingChange?: (saving: boolean) => void;
  onBackgroundError?: (error: unknown) => void;
  isSnapshotCurrent?: (value: TValue) => boolean;
  debounceMs?: number;
  maxStabilizationAttempts?: number;
  setTimer?: (
    callback: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export interface SaveCoordinator {
  schedule: () => void;
  flush: () => Promise<void>;
  reset: () => void;
}

export const shouldPersistWorkflowDraft = (historyVersion: boolean): boolean =>
  !historyVersion;

export class SaveSnapshotDidNotStabilizeError extends Error {
  constructor() {
    super('Workflow snapshot kept changing while it was being saved');
    this.name = 'SaveSnapshotDidNotStabilizeError';
  }
}

/**
 * Serializes debounced draft writes and exposes a flush barrier. The barrier
 * resolves only after the last server write matches the latest captured
 * client snapshot, including edits made while an earlier write was in flight.
 */
export const createSaveCoordinator = <TValue, TResult>(
  options: SaveCoordinatorOptions<TValue, TResult>
): SaveCoordinator => {
  const debounceMs = options.debounceMs ?? 300;
  const maxStabilizationAttempts = options.maxStabilizationAttempts ?? 20;
  const setTimer = options.setTimer ?? globalThis.setTimeout;
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let requestedRevision = 0;
  let persistedRevision = 0;
  let persistedFingerprint: string | undefined;
  let activeRun:
    | {
        generation: number;
        promise: Promise<void>;
        scheduledDuringRun: boolean;
      }
    | undefined;

  const clearScheduledSave = (): void => {
    if (timer !== undefined) {
      clearTimer(timer);
      timer = undefined;
    }
  };

  const runUntilStable = async (runGeneration: number): Promise<void> => {
    let attempts = 0;

    while (runGeneration === generation) {
      const revision = requestedRevision;
      const snapshot = options.captureSnapshot();

      if (!snapshot) {
        persistedRevision = revision;
        persistedFingerprint = undefined;
        return;
      }

      if (
        revision <= persistedRevision &&
        snapshot.fingerprint === persistedFingerprint
      ) {
        return;
      }

      const result = await options.persistSnapshot(snapshot.value);
      if (runGeneration !== generation) return;

      const currentSnapshot = options.captureSnapshot();
      const isStable =
        revision === requestedRevision &&
        currentSnapshot?.fingerprint === snapshot.fingerprint;

      // Writes are serialized, so every successful response is safe to apply
      // in order. A later edit is persisted before the flush barrier resolves.
      if (options.isSnapshotCurrent?.(snapshot.value) !== false) {
        options.onPersisted?.(result, snapshot.value);
      }
      if (isStable) {
        persistedRevision = revision;
        persistedFingerprint = snapshot.fingerprint;
        return;
      }

      attempts += 1;
      if (attempts >= maxStabilizationAttempts) {
        throw new SaveSnapshotDidNotStabilizeError();
      }

      // If an edit changed the observable snapshot without explicitly
      // scheduling auto-save, the worker still treats it as a newer revision.
      if (revision === requestedRevision) {
        requestedRevision += 1;
      }
    }
  };

  const ensureRun = (): Promise<void> => {
    const runGeneration = generation;
    if (activeRun) {
      if (activeRun.generation === runGeneration) {
        return activeRun.promise;
      }
      return activeRun.promise.catch(() => undefined).then(() => ensureRun());
    }

    options.onSavingChange?.(true);
    const promise = runUntilStable(runGeneration);
    activeRun = {
      generation: runGeneration,
      promise,
      scheduledDuringRun: false,
    };

    void promise
      .finally(() => {
        if (activeRun?.promise === promise) {
          const shouldRescheduleQueuedEdit =
            activeRun.scheduledDuringRun && runGeneration === generation;
          activeRun = undefined;
          if (runGeneration === generation) {
            options.onSavingChange?.(false);
            if (shouldRescheduleQueuedEdit) {
              // A schedule can land after the worker resolves but before this
              // cleanup microtask clears activeRun. Requeue every edit seen
              // during that window (and after failed writes) using the normal
              // debounce. No new schedule means no automatic retry loop.
              timer = setTimer(() => {
                timer = undefined;
                void ensureRun().catch(error =>
                  options.onBackgroundError?.(error)
                );
              }, debounceMs);
            }
          }
        }
      })
      .catch(() => undefined);

    return promise;
  };

  const schedule = (): void => {
    requestedRevision += 1;
    clearScheduledSave();

    // The active serial worker observes requestedRevision after its current
    // request settles and immediately persists the newest snapshot.
    if (activeRun?.generation === generation) {
      activeRun.scheduledDuringRun = true;
      return;
    }

    timer = setTimer(() => {
      timer = undefined;
      void ensureRun().catch(error => options.onBackgroundError?.(error));
    }, debounceMs);
  };

  const flush = async (): Promise<void> => {
    const flushGeneration = generation;
    requestedRevision += 1;
    clearScheduledSave();

    let attempts = 0;
    while (flushGeneration === generation) {
      await ensureRun();

      if (flushGeneration !== generation) return;

      // Yield once so edits already queued by the same click/input event are
      // visible before declaring the persistence barrier stable.
      await Promise.resolve();

      if (flushGeneration !== generation) return;

      const currentSnapshot = options.captureSnapshot();
      const isCurrentSnapshotPersisted = currentSnapshot
        ? currentSnapshot.fingerprint === persistedFingerprint
        : persistedFingerprint === undefined;
      if (
        requestedRevision <= persistedRevision &&
        isCurrentSnapshotPersisted
      ) {
        return;
      }

      requestedRevision += 1;
      attempts += 1;
      if (attempts >= maxStabilizationAttempts) {
        throw new SaveSnapshotDidNotStabilizeError();
      }
    }
  };

  const reset = (): void => {
    clearScheduledSave();
    generation += 1;
    requestedRevision = 0;
    persistedRevision = 0;
    persistedFingerprint = undefined;
    // Keep an in-flight write as a serialization barrier. Its response is
    // invalidated by the generation change, but a new context must not start
    // another PUT until the old request settles (A -> B -> A could otherwise
    // let the stale A write arrive after the new A draft).
    options.onSavingChange?.(false);
  };

  return { schedule, flush, reset };
};
