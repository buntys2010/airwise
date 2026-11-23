import { describe, expect, it } from "vitest";
import type { Profile } from "./engine";
import { STORE_KEY, clearSaved, readSaved, sanitizeSaved, writeSaved } from "./store";
import { must } from "../test-support/must";

const profile: Profile = {
  home: "leaky",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};
const saved = { city: "lucknow", profile };

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    m,
  };
}
const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("device-only save", () => {
  it("writes, reads back and clears", () => {
    const s = memory();
    expect(readSaved(s)).toEqual({ data: null, state: "empty" });
    expect(writeSaved(saved, s)).toBe("saved");
    expect(readSaved(s)).toEqual({ data: saved, state: "saved" });
    expect(clearSaved(s)).toBe("empty");
    expect(readSaved(s).data).toBeNull();
  });
  it("stores only choices, never a computed figure", () => {
    const s = memory();
    writeSaved(saved, s);
    const text = must(s.m.get(STORE_KEY));
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(["city", "profile"]);
    expect(text).not.toMatch(/cig|pm|exposure/i);
  });
  it("works, and reports blocked, when storage is unavailable or throws", () => {
    expect(readSaved(null).state).toBe("blocked");
    expect(readSaved(throwing).state).toBe("blocked");
    expect(writeSaved(saved, null)).toBe("blocked");
    expect(writeSaved(saved, throwing)).toBe("blocked");
    expect(clearSaved(null)).toBe("blocked");
    expect(clearSaved(throwing)).toBe("blocked");
  });
  it("ignores corrupt or tampered entries instead of trusting them", () => {
    const s = memory();
    s.setItem(STORE_KEY, "{not json");
    expect(readSaved(s)).toEqual({ data: null, state: "blocked" });
    s.setItem(STORE_KEY, JSON.stringify({ city: "atlantis", profile }));
    expect(readSaved(s)).toEqual({ data: null, state: "empty" });
    s.setItem(
      STORE_KEY,
      JSON.stringify({ city: "delhi", profile: { ...profile, home: "castle" } }),
    );
    expect(readSaved(s)).toEqual({ data: null, state: "empty" });
  });
});

describe("sanitizeSaved", () => {
  it("accepts a valid entry, clamps the distance and drops unknown fields", () => {
    expect(
      sanitizeSaved({ city: "delhi", profile: { ...profile, km: 500, extra: "x" }, junk: 1 }),
    ).toEqual({ city: "delhi", profile: { ...profile, km: 60 } });
  });
  it("rejects non-objects and incomplete entries", () => {
    for (const v of [null, 42, "x", {}, { city: "delhi" }, { city: "delhi", profile: {} }])
      expect(sanitizeSaved(v)).toBeNull();
  });
  it("treats anything other than true as not vulnerable", () => {
    expect(
      sanitizeSaved({ city: "delhi", profile: { ...profile, vulnerable: "yes" } })?.profile
        .vulnerable,
    ).toBe(false);
  });
});
