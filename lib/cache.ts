/** Tiny in-memory TTL cache with a size cap (oldest entries evicted first). Saves repeat model calls and quota. */
export function createCache<T>(ttlMs: number, max = 200) {
  const store = new Map<string, { value: T; at: number }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) { store.delete(key); return undefined; }
      return hit.value;
    },
    set(key: string, value: T): void {
      store.set(key, { value, at: Date.now() });
      while (store.size > max) store.delete(store.keys().next().value as string);
    },
    clear(): void { store.clear(); },
    get size() { return store.size; },
  };
}
