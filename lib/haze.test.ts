import { describe, expect, it } from "vitest";

import { must } from "../test-support/must";
import { estimateHourly } from "./air/live";
import { CITIES } from "./cities";
import { fullPlan } from "./engine/actions";
import { NO_PLAN, type Profile, simulate } from "./engine/model";
import { HAZE_MIN, hazeLevel } from "./haze";

describe("hazeLevel", () => {
  it("starts visibly hazy even on a moderate day", () => {
    expect(hazeLevel(38, 20, 20)).toBeGreaterThan(0.5); // Lucknow, AQI about 107
    expect(hazeLevel(0, 20, 20)).toBeGreaterThanOrEqual(0.45);
  });
  it("is thick on a bad day and never leaves the 0 to 1 range", () => {
    expect(hazeLevel(300, 150, 150)).toBe(1);
    for (const pm of [0, 40, 160, 400, 5000])
      for (const f of [0, 0.3, 1, 3]) {
        const haze = hazeLevel(pm, 100, 100 * f);
        expect(haze).toBeGreaterThanOrEqual(HAZE_MIN);
        expect(haze).toBeLessThanOrEqual(1);
      }
  });
  it("thins as exposure falls, in proportion to what was removed", () => {
    const all = [1, 0.75, 0.5, 0.25, 0];
    const levels = all.map((r) => hazeLevel(100, 100, 100 * r));
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThan(must(levels[i - 1]));
  });
  it("applying most fixes makes a clear, visible difference at moderate and high air", () => {
    for (const pm of [38, 71, 157, 250]) {
      const before = hazeLevel(pm, 50, 50),
        after = hazeLevel(pm, 50, 50 * 0.25);
      expect(before - after).toBeGreaterThan(0.25);
    }
  });
  it("copes with a zero baseline without NaN", () => {
    expect(Number.isFinite(hazeLevel(100, 0, 0))).toBe(true);
  });
  it("with the real engine: the full plan clears at least a third of the haze for the sample family in every city", () => {
    const family: Profile = {
      home: "leaky",
      commute: "bike",
      km: 8,
      cooking: "lpg",
      vulnerable: true,
    };
    for (const c of CITIES) {
      const hourly = estimateHourly(c);
      const base = simulate(hourly, family, NO_PLAN).meanPm,
        plan = simulate(hourly, family, fullPlan(family)).meanPm;
      const before = hazeLevel(must(hourly[7]), base, base),
        after = hazeLevel(must(hourly[7]), base, plan);
      expect((before - after) / before).toBeGreaterThan(0.33);
    }
  });
});
