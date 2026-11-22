import { describe, expect, it } from "vitest";
import { CITIES, estimateHourly } from "./data";
import {
  NO_PLAN, aqiFromPm, bestHour, buildActions, categoryOf, fmtHour, fullPlan, planSummary, simulate,
  type Profile,
} from "./engine";

const delhi = CITIES[0];
const hourly = estimateHourly(delhi);
const family: Profile = { home: "typical", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };

describe("aqiFromPm", () => {
  it("maps breakpoints", () => {
    expect(aqiFromPm(0)).toBe(0);
    expect(aqiFromPm(12)).toBe(50);
    expect(aqiFromPm(35.4)).toBe(100);
    expect(aqiFromPm(250.4)).toBe(300);
  });
  it("is monotonic and capped at 500", () => {
    let prev = -1;
    for (let pm = 0; pm <= 600; pm += 7) {
      const a = aqiFromPm(pm);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
    expect(aqiFromPm(9999)).toBe(500);
    expect(aqiFromPm(-5)).toBe(0);
  });
});

describe("categoryOf", () => {
  it("labels severity with a non-colour icon", () => {
    expect(categoryOf(8).label).toBe("Good");
    expect(categoryOf(300).tone).toBe("hazardous");
    expect(categoryOf(300).icon).toBeTruthy();
  });
});

describe("estimateHourly", () => {
  it("is deterministic and has 24 hours", () => {
    expect(estimateHourly(delhi)).toEqual(estimateHourly(delhi));
    expect(hourly).toHaveLength(24);
  });
  it("is worst before dawn and lighter in the afternoon", () => {
    expect(hourly[6]).toBeGreaterThan(hourly[15]);
  });
});

describe("bestHour", () => {
  it("picks the cleanest hour between 10 am and 4 pm", () => {
    const h = bestHour(hourly);
    expect(h).toBeGreaterThanOrEqual(10);
    expect(h).toBeLessThanOrEqual(16);
    for (let i = 10; i <= 16; i++) expect(hourly[h]).toBeLessThanOrEqual(hourly[i]);
  });
});

describe("simulate", () => {
  const base = simulate(hourly, family, NO_PLAN);

  it("shares of dose add up to 1", () => {
    const sum = Object.values(base.parts).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
  it("each action lowers exposure and never raises it", () => {
    const plans = [
      { ...NO_PLAN, purifier: true }, { ...NO_PLAN, mask: "n95" as const }, { ...NO_PLAN, shiftOutdoor: true },
      { ...NO_PLAN, swapCommute: "metro" as const }, { ...NO_PLAN, induction: true }, { ...NO_PLAN, sealGaps: true },
    ];
    for (const plan of plans) expect(simulate(hourly, family, plan).meanPm).toBeLessThanOrEqual(base.meanPm);
  });
  it("combined plan beats any single action", () => {
    const all = simulate(hourly, family, fullPlan(family));
    for (const a of buildActions(hourly, family)) expect(all.meanPm).toBeLessThanOrEqual(base.meanPm - a.savedPm + 1e-9);
    expect(all.cigs).toBeLessThan(base.cigs);
  });
  it("N95 beats cloth", () => {
    const n95 = simulate(hourly, family, { ...NO_PLAN, mask: "n95" }).meanPm;
    const cloth = simulate(hourly, family, { ...NO_PLAN, mask: "cloth" }).meanPm;
    expect(n95).toBeLessThan(cloth);
  });
  it("metro commute lowers CO2 versus a car", () => {
    const car = simulate(hourly, { ...family, commute: "car" }, NO_PLAN).co2Kg;
    const metro = simulate(hourly, { ...family, commute: "car" }, { ...NO_PLAN, swapCommute: "metro" }).co2Kg;
    expect(metro).toBeLessThan(car);
  });
  it("cleaner air means fewer cigarettes", () => {
    const clean = simulate(estimateHourly(CITIES[5]), family, NO_PLAN);
    expect(clean.cigs).toBeLessThan(base.cigs);
  });
  it("handles zero commute distance without NaN", () => {
    const s = simulate(hourly, { ...family, km: 0 }, NO_PLAN);
    expect(Number.isFinite(s.meanPm)).toBe(true);
    expect(s.co2Kg).toBe(0);
  });
});

describe("buildActions", () => {
  it("marks already-clean choices as not applicable", () => {
    const a = buildActions(hourly, { ...family, commute: "metro", cooking: "induction", home: "sealed" });
    expect(a.find((x) => x.id === "swap")?.applicable).toBe(false);
    expect(a.find((x) => x.id === "induction")?.applicable).toBe(false);
    expect(a.find((x) => x.id === "sealGaps")?.applicable).toBe(false);
  });
  it("every action explains its maths", () => {
    for (const a of buildActions(hourly, family)) {
      expect(a.math.length).toBeGreaterThan(0);
      expect(a.savedPm).toBeGreaterThanOrEqual(0);
    }
  });
  it("apply and isOn round-trip", () => {
    for (const a of buildActions(hourly, family)) expect(a.isOn(a.apply(NO_PLAN))).toBe(true);
  });
});

describe("helpers", () => {
  it("formats hours", () => {
    expect(fmtHour(0)).toBe("12 am");
    expect(fmtHour(13)).toBe("1 pm");
    expect(fmtHour(12)).toBe("12 pm");
  });
  it("summarises a plan in plain words", () => {
    expect(planSummary(NO_PLAN)).toEqual([]);
    expect(planSummary(fullPlan(family)).length).toBeGreaterThan(3);
  });
});

import { cigsSoFar } from "./engine";

describe("simulate().perHour", () => {
  const profile: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };
  it("has 24 non-negative hours that add up to the whole day, so the pieces are consistent", () => {
    const s = simulate(hourly, profile, NO_PLAN);
    expect(s.perHour).toHaveLength(24);
    expect(s.perHour.every((v) => v >= 0)).toBe(true);
    expect(s.perHour.reduce((a, b) => a + b, 0) / 24 / 22).toBeCloseTo(s.cigs, 9);
  });
});

describe("cigsSoFar", () => {
  const profile: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };
  it("is 0 at the start of the day and the whole-day figure at hour 24", () => {
    for (const plan of [NO_PLAN, fullPlan(profile)]) {
      expect(cigsSoFar(hourly, profile, plan, 0)).toBe(0);
      expect(cigsSoFar(hourly, profile, plan, 24)).toBeCloseTo(simulate(hourly, profile, plan).cigs, 9);
    }
  });
  it("never decreases as the day goes on, including through fractions of an hour", () => {
    let prev = -1;
    for (let t = 0; t <= 24; t += 0.25) {
      const v = cigsSoFar(hourly, profile, NO_PLAN, t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("interpolates inside an hour", () => {
    const a = cigsSoFar(hourly, profile, NO_PLAN, 7), b = cigsSoFar(hourly, profile, NO_PLAN, 8), mid = cigsSoFar(hourly, profile, NO_PLAN, 7.5);
    expect(mid).toBeCloseTo((a + b) / 2, 9);
  });
  it("every action lowers it, at any hour that has any exposure", () => {
    for (const hour of [8, 12, 18, 24]) {
      const base = cigsSoFar(hourly, profile, NO_PLAN, hour);
      for (const a of buildActions(hourly, profile).filter((x) => x.applicable)) {
        expect(cigsSoFar(hourly, profile, a.apply(NO_PLAN), hour), `${a.id} at ${hour}`).toBeLessThanOrEqual(base + 1e-12);
      }
    }
  });
  it("a full plan lowers the day by the same amount simulate() reports", () => {
    const all = fullPlan(profile);
    expect(cigsSoFar(hourly, profile, NO_PLAN, 24) - cigsSoFar(hourly, profile, all, 24)).toBeCloseTo(simulate(hourly, profile, NO_PLAN).cigs - simulate(hourly, profile, all).cigs, 9);
  });
  it("clamps hours outside 0 to 24 and survives non-numbers", () => {
    expect(cigsSoFar(hourly, profile, NO_PLAN, -5)).toBe(0);
    expect(cigsSoFar(hourly, profile, NO_PLAN, 99)).toBeCloseTo(cigsSoFar(hourly, profile, NO_PLAN, 24), 9);
    expect(cigsSoFar(hourly, profile, NO_PLAN, NaN)).toBe(0);
  });
  it("works with no commute distance (km 0)", () => {
    const home: Profile = { ...profile, km: 0 };
    expect(Number.isFinite(cigsSoFar(hourly, home, NO_PLAN, 12))).toBe(true);
    expect(cigsSoFar(hourly, home, NO_PLAN, 24)).toBeCloseTo(simulate(hourly, home, NO_PLAN).cigs, 9);
  });
  it("is bigger in a smoggier city at the same hour", () => {
    const clean = estimateHourly(CITIES[5]);
    expect(cigsSoFar(clean, profile, NO_PLAN, 12)).toBeLessThan(cigsSoFar(hourly, profile, NO_PLAN, 12));
  });
});

describe("shifting outdoor time", () => {
  it("never raises exposure, for any home or cooking fuel: cooking smoke does not depend on the outdoor slot", () => {
    for (const home of ["sealed", "typical", "leaky"] as const) {
      for (const cooking of ["wood", "lpg", "induction"] as const) {
        const p: Profile = { home, commute: "bike", km: 8, cooking, vulnerable: true };
        expect(simulate(hourly, p, { ...NO_PLAN, shiftOutdoor: true }).meanPm).toBeLessThanOrEqual(simulate(hourly, p, NO_PLAN).meanPm + 1e-9);
      }
    }
  });
});

describe("outdoor cigarettes (city air)", () => {
  it("is the day's mean PM2.5 over the rule-of-thumb constant", async () => {
    const { outdoorCigs, outdoorCigsSoFar, CIGARETTE_PM } = await import("./engine");
    const flat = Array.from({ length: 24 }, () => 44);
    expect(outdoorCigs(flat)).toBeCloseTo(44 / CIGARETTE_PM, 10);
    expect(outdoorCigs([])).toBe(0);
    expect(outdoorCigsSoFar(flat, 0)).toBe(0);
    expect(outdoorCigsSoFar(flat, 12)).toBeCloseTo(outdoorCigs(flat) / 2, 10);
    expect(outdoorCigsSoFar(flat, 99)).toBeCloseTo(outdoorCigs(flat), 10);
    expect(outdoorCigsSoFar(flat, 6.5)).toBeCloseTo((44 * 6.5) / 24 / CIGARETTE_PM, 10);
    expect(outdoorCigsSoFar(flat, NaN)).toBe(0);
  });
});
