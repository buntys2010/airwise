import { afterEach, describe, expect, it, vi } from "vitest";
import { createCache } from "./cache";

afterEach(() => vi.useRealTimers());

describe("createCache", () => {
  it("returns stored values and misses unknown keys", () => {
    const cache = createCache<string>(1000);
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
  });
  it("expires entries after the ttl", () => {
    vi.useFakeTimers();
    const cache = createCache<string>(1000);
    cache.set("a", "1");
    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe("1");
    vi.advanceTimersByTime(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });
  it("evicts the oldest entries beyond the cap", () => {
    const cache = createCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});
