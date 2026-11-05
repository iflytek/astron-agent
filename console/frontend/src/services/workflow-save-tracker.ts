const pending = new Map<string, Set<Promise<unknown>>>();

/** Include direct metadata/media PUTs in the same workflow save barrier. */
export function trackWorkflowSave<T>(
  id: unknown,
  request: Promise<T>
): Promise<T> {
  if (id === undefined || id === null) return request;
  const key = String(id);
  const requests = pending.get(key) ?? new Set<Promise<unknown>>();
  pending.set(key, requests);
  requests.add(request);
  void request
    .finally(() => {
      requests.delete(request);
      if (!requests.size) pending.delete(key);
    })
    .catch(() => undefined);
  return request;
}

export async function waitForWorkflowSaves(id: unknown): Promise<void> {
  if (id === undefined || id === null) return;
  const key = String(id);
  while (pending.get(key)?.size) {
    await Promise.all([...pending.get(key)!]);
  }
}

export function hasPendingWorkflowSaves(id: unknown): boolean {
  return id !== undefined && id !== null && !!pending.get(String(id))?.size;
}
