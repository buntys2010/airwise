import { afterEach, describe, expect, it, vi } from "vitest";

import { createCache } from "./cache";

afterEach(() => vi.useRealTimers());

describe("createCache", () => {
  it("returns stored values and misses unknown keys", () => {
    const c = createCache<string>(1000);
    c.set("a", "1");
    expect(c.get("a")).toBe("1");
    expect(c.get("b")).toBeUndefined();
  });
  it("expires entries after the ttl", () => {
    vi.useFakeTimers();
    const c = createCache<string>(1000);
    c.set("a", "1");
    vi.advanceTimersByTime(999);
    expect(c.get("a")).toBe("1");
    vi.advanceTimersByTime(2);
    expect(c.get("a")).toBeUndefined();
    expect(c.size).toBe(0);
  });
  it("evicts the oldest entries beyond the cap", () => {
    const c = createCache<number>(1000, 2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });
});
