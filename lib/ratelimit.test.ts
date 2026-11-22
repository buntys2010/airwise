import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, createBudget, createLimiter } from "./ratelimit";

afterEach(() => vi.useRealTimers());
const req = (h: Record<string, string>) => new Request("http://x", { headers: h });

describe("clientIp", () => {
  it("uses the last X-Forwarded-For entry, which the nearest trusted proxy appended", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("ignores spoofed leading entries: changing them does not change the key", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe(clientIp(req({ "x-forwarded-for": "2.2.2.2, 3.3.3.3, 9.9.9.9" })));
  });
  it("falls back to x-real-ip, then a fixed local key", () => {
    expect(clientIp(req({ "x-real-ip": "4.4.4.4" }))).toBe("4.4.4.4");
    expect(clientIp(req({}))).toBe("local");
    expect(clientIp(req({ "x-forwarded-for": " , " }))).toBe("local");
  });
});

describe("createLimiter", () => {
  it("allows up to the limit in the window, then blocks, then recovers", () => {
    vi.useFakeTimers();
    const l = createLimiter(3, 1000);
    expect([l("a"), l("a"), l("a"), l("a")]).toEqual([false, false, false, true]);
    vi.advanceTimersByTime(1001);
    expect(l("a")).toBe(false);
  });
  it("keeps keys separate", () => {
    const l = createLimiter(1, 1000);
    l("a"); expect(l("a")).toBe(true);
    expect(l("b")).toBe(false);
  });
  it("a flood of new keys does not wipe a blocked client's counter", () => {
    const l = createLimiter(2, 60_000, 50);
    l("attacker"); l("attacker");
    expect(l("attacker")).toBe(true);
    for (let i = 0; i < 500; i++) l(`flood-${i}`);
    expect(l("attacker")).toBe(true); // still blocked: eviction removed stale one-off keys, not the busy one
  });
  it("evicts stale keys by age so memory stays bounded", () => {
    vi.useFakeTimers();
    const l = createLimiter(5, 1000, 10);
    for (let i = 0; i < 10; i++) l(`k${i}`);
    vi.advanceTimersByTime(2000);
    for (let i = 0; i < 5; i++) l(`new${i}`); // triggers eviction without throwing or growing unbounded
    expect(l("k0")).toBe(false);
  });
});

describe("createBudget", () => {
  it("spends one unit per take and refuses when empty, reading the limit each time", () => {
    let limit = 2;
    const b = createBudget(() => limit, 1000);
    expect([b.take(), b.take(), b.take()]).toEqual([true, true, false]);
    limit = 3;
    expect(b.take()).toBe(true);
  });
  it("refills after the window and can be reset", () => {
    vi.useFakeTimers();
    const b = createBudget(() => 1, 1000);
    b.take();
    expect(b.take()).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(b.take()).toBe(true);
    b.reset();
    expect(b.take()).toBe(true);
  });
});
