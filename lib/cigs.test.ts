import { describe, expect, it } from "vitest";
import { CITIES, estimateHourly } from "./data";
import { NO_PLAN, cigsSoFar, fullPlan, simulate, type Profile } from "./engine";
import { MAX_CIGS, cigaretteRow } from "./cigs";

describe("cigaretteRow", () => {
  it("draws one cigarette per whole cigarette-equivalent with the last one partial", () => {
    const { slots } = cigaretteRow(3.4, 3.4, 0);
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => +s.length.toFixed(2))).toEqual([1, 1, 1, 0.4]);
  });
  it("burns from the first cigarette on: ash is what has burned so far, the rest is still to come", () => {
    const { slots } = cigaretteRow(4, 4, 1.5);
    expect(slots.map((s) => s.ash)).toEqual([1, 0.5, 0, 0]);
    expect(slots.map((s) => s.toCome)).toEqual([0, 0.5, 1, 1]);
    expect(slots.map((s) => s.burning)).toEqual([false, true, false, false]);
  });
  it("ash plus what is to come always equals the length, and ash never exceeds it", () => {
    for (const soFar of [0, 0.3, 1, 2.7, 5, 50]) {
      for (const s of cigaretteRow(5.2, 3.1, soFar).slots) {
        expect(s.ash + s.toCome).toBeCloseTo(s.length, 12);
        expect(s.ash).toBeLessThanOrEqual(s.length + 1e-12);
        expect(s.toCome).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("a fix shortens the same cigarettes and keeps the do-nothing outline as a ghost", () => {
    const before = cigaretteRow(6.3, 6.3, 0).slots, after = cigaretteRow(6.3, 2.2, 0).slots;
    expect(after).toHaveLength(before.length);
    expect(after.every((s) => s.ghost)).toBe(true);
    expect(after.map((s) => +s.length.toFixed(2))).toEqual([1, 1, 0.2, 0, 0, 0, 0]);
    for (let i = 0; i < before.length; i++) expect(after[i].length).toBeLessThanOrEqual(before[i].length);
  });
  it("caps the row at ten and says how many more there are", () => {
    const row = cigaretteRow(14.2, 14.2, 0);
    expect(row.slots).toHaveLength(MAX_CIGS);
    expect(row.extra).toBe(5);
    expect(cigaretteRow(14.2, 7.5, 0).extra).toBe(0);
    expect(cigaretteRow(10, 10, 0).extra).toBe(0);
  });
  it("always draws at least one slot and survives bad input", () => {
    expect(cigaretteRow(0, 0, 0).slots).toHaveLength(1);
    expect(() => cigaretteRow(NaN, NaN, NaN)).not.toThrow();
    for (const s of cigaretteRow(2, NaN, NaN).slots) expect(Number.isFinite(s.length)).toBe(true);
  });
  it("uses the engine's own figures: the total drawn equals the day figure, the burnt part equals the so-far figure", () => {
    const hourly = estimateHourly(CITIES[0]);
    const profile: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };
    const plan = fullPlan(profile);
    const base = simulate(hourly, profile, NO_PLAN).cigs, day = simulate(hourly, profile, plan).cigs, now = cigsSoFar(hourly, profile, plan, 15.5);
    const { slots } = cigaretteRow(base, day, now);
    expect(slots.reduce((a, s) => a + s.length, 0)).toBeCloseTo(Math.min(day, slots.length), 9);
    expect(slots.reduce((a, s) => a + s.ash, 0)).toBeCloseTo(Math.min(now, day), 9);
  });
});
