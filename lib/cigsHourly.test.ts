import { describe, expect, it } from "vitest";
import { cigsSoFar, sticksFor } from "./cigsHourly";
import { NO_PLAN, simulate } from "./engine";
import type { Profile } from "./engine";

const hourly = Array.from({ length: 24 }, (_, h) => 40 + (h % 6) * 5);
const profile: Profile = {
  home: "leaky",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};

describe("cigarettes so far today", () => {
  const sim = simulate(hourly, profile, NO_PLAN);
  it("hourly exposure sums to the daily figure", () => {
    expect(sim.perHour).toHaveLength(24);
    expect(sim.perHour.reduce((a, b) => a + b, 0) / 24).toBeCloseTo(sim.meanPm, 6);
    expect(cigsSoFar(sim, 23)).toBeCloseTo(sim.cigs, 6);
  });
  it("grows with the hour and is zero before the day starts", () => {
    expect(cigsSoFar(sim, -1)).toBe(0);
    let prev = 0;
    for (let h = 0; h < 24; h++) {
      const v = cigsSoFar(sim, h);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("a plan lowers the day's figure and the part so far", () => {
    const plan = simulate(hourly, profile, { ...NO_PLAN, purifier: true, sealGaps: true });
    expect(plan.cigs).toBeLessThan(sim.cigs);
    expect(cigsSoFar(plan, 12)).toBeLessThan(cigsSoFar(sim, 12));
  });
});

describe("sticksFor", () => {
  it("draws a partial last stick", () => {
    const s = sticksFor(2.4, 0);
    expect(s.map((x) => Number(x.total.toFixed(2)))).toEqual([1, 1, 0.4]);
  });
  it("burns from the first stick onward and never past the total", () => {
    const s = sticksFor(2.4, 1.5);
    expect(s.map((x) => Number(x.burned.toFixed(2)))).toEqual([1, 0.5, 0]);
    expect(s.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(sticksFor(0.3, 9)[0]).toEqual({ id: 1, total: 0.3, burned: 0.3 });
  });
  it("always draws at least one stick", () => {
    expect(sticksFor(0, 0)).toHaveLength(1);
  });
});
