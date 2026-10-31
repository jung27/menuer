// Public image URLs only: never use this cache for sessions or user records.
export function createFoodImageCache(limit = 200, ttlMs = 60 * 60 * 1000) {
  const entries = new Map<string, { value: string | null; expires: number }>();
  const pending = new Map<string, Promise<string | null | undefined>>();
  return async (name: string, lookup: () => Promise<string | null | undefined>) => {
    const cached = entries.get(name);
    if (cached && cached.expires > Date.now()) return cached.value;
    entries.delete(name);
    const running = pending.get(name);
    if (running) return running;
    const request = Promise.resolve().then(lookup).then(value => {
      // Failed upstream calls return undefined and must remain retryable.
      if (value !== undefined) {
        if (entries.size >= limit) entries.delete(entries.keys().next().value!);
        entries.set(name, { value, expires: Date.now() + (value === null ? Math.min(ttlMs, 60000) : ttlMs) });
      }
      return value;
    }).finally(() => pending.delete(name));
    pending.set(name, request);
    return request;
  };
}
