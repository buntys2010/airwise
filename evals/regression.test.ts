import { describe, expect, it } from "vitest";

import { verify } from "../lib/guard";
import { ungroundedNumbers } from "../lib/guard";
import { runCases, summarise, type Verifier } from "./cases";

/**
 * Proof that the eval set has teeth: if the guard were weakened, `npm run eval` would fail.
 * Each test swaps in a deliberately broken verifier and requires the cases to notice.
 */
describe("the eval set catches a weakened guard", () => {
  const failed = (v: Verifier) => runCases(v).filter((r) => !r.passed);

  it("passes with the real guard", () => {
    expect(failed(verify)).toEqual([]);
  });
  it("a guard that accepts everything fails every rejection case", () => {
    const results = failed(() => ({ ok: true }));
    expect(results.length).toBeGreaterThanOrEqual(12);
    expect(results.some((r) => r.category === "guard: numbers")).toBe(true);
    expect(results.some((r) => r.category === "guard: claims")).toBe(true);
    expect(results.some((r) => r.category === "guard: Hindi")).toBe(true);
  });
  it("a guard that checks numbers but not attributions is caught by the claims cases", () => {
    const results = failed((text, facts) => ({ ok: ungroundedNumbers(text, facts).length === 0 }));
    expect(results.filter((r) => r.category === "guard: claims").length).toBeGreaterThanOrEqual(5);
  });
  it("a guard that rejects everything fails every acceptance case", () => {
    const results = failed(() => ({ ok: false }));
    expect(results.length).toBeGreaterThanOrEqual(8);
  });
  it("a numeric check that ignores Devanagari digits is caught by the Hindi cases", () => {
    const asciiOnly: Verifier = (text, facts) => ({
      ok:
        ungroundedNumbers(text.replace(/[०-९]/gu, ""), facts).length === 0 &&
        verify(text.replace(/[०-९]/gu, ""), facts).ok,
    });
    const results = failed(asciiOnly);
    expect(results.some((r) => r.id === "hin-03")).toBe(true); // an invented number written in Devanagari slips through
  });
  it("summarise counts pass and fail per category", () => {
    const summary = summarise(runCases(() => ({ ok: true })));
    expect(summary.passed).toBeLessThan(summary.total);
    expect(Object.keys(summary.byCategory)).toHaveLength(6);
  });
});
