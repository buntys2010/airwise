import { describe, expect, it } from "vitest";

import { asRecord, finiteNumber, isRecord, oneOf } from "./json";

describe("isRecord and asRecord", () => {
  it("accept plain objects only", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    for (const value of [null, undefined, [], "text", 3, true]) expect(isRecord(value)).toBe(false);
  });
  it("turn anything else into an empty record, so field reads are safe", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null).anything).toBeUndefined();
    expect(asRecord([1, 2]).length).toBeUndefined();
  });
});

describe("finiteNumber", () => {
  it("returns finite numbers and null for everything else", () => {
    expect(finiteNumber(4.5)).toBe(4.5);
    expect(finiteNumber(0)).toBe(0);
    for (const value of [NaN, Infinity, "4", null, undefined, {}]) {
      expect(finiteNumber(value)).toBeNull();
    }
  });
});

describe("oneOf", () => {
  const colours = ["red", "green"] as const;
  it("returns the matching item from the list", () => {
    expect(oneOf(colours, "green")).toBe("green");
  });
  it("returns null for anything that is not exactly an item", () => {
    for (const value of ["blue", "Red", "", 1, null, undefined, ["red"]]) {
      expect(oneOf(colours, value)).toBeNull();
    }
  });
});
