import { describe, expect, it } from "vitest";

import { must } from "../test-support/must";
import type { Profile } from "./engine";
import { clearSaved, readSaved, sanitizeSaved, STORE_KEY, writeSaved } from "./store";

const profile: Profile = {
  home: "leaky",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};
const saved = { city: "lucknow", profile };

function memory() {
  const entries = new Map<string, string>();
  return {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => {
      entries.set(k, v);
    },
    removeItem: (k: string) => {
      entries.delete(k);
    },
    m: entries,
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
    const storage = memory();
    expect(readSaved(storage)).toEqual({ data: null, state: "empty" });
    expect(writeSaved(saved, storage)).toBe("saved");
    expect(readSaved(storage)).toEqual({ data: saved, state: "saved" });
    expect(clearSaved(storage)).toBe("empty");
    expect(readSaved(storage).data).toBeNull();
  });
  it("stores only choices, never a computed figure", () => {
    const storage = memory();
    writeSaved(saved, storage);
    const text = must(storage.m.get(STORE_KEY));
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
    const storage = memory();
    storage.setItem(STORE_KEY, "{not json");
    expect(readSaved(storage)).toEqual({ data: null, state: "blocked" });
    storage.setItem(STORE_KEY, JSON.stringify({ city: "atlantis", profile }));
    expect(readSaved(storage)).toEqual({ data: null, state: "empty" });
    storage.setItem(
      STORE_KEY,
      JSON.stringify({ city: "delhi", profile: { ...profile, home: "castle" } }),
    );
    expect(readSaved(storage)).toEqual({ data: null, state: "empty" });
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
