import { describe, expect, it } from "vitest";
import { CITIES, estimateHourly } from "./data";
import { bestHour, type Profile } from "./engine";
import { isGrounded } from "./guard";
import { buildSchedule } from "./schedule";

const hourly = estimateHourly(CITIES[0]!);
const family: Profile = {
  home: "typical",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};

describe("buildSchedule", () => {
  it("is chronological with unique hours and includes the cleanest hour", () => {
    const s = buildSchedule(hourly, family);
    const hours = s.map((e) => e.hour);
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
    expect(new Set(hours).size).toBe(hours.length);
    expect(hours).toContain(bestHour(hourly));
  });
  it("only uses numbers from the data, so Gemini can rephrase it under the guard", () => {
    const s = buildSchedule(hourly, family);
    for (const e of s)
      expect(isGrounded(`${e.title}. ${e.detail}`, { hourly, schedule: s })).toBe(true);
  });
  it("adapts to the household", () => {
    const wood = buildSchedule(hourly, { ...family, cooking: "wood" }).find((e) => e.hour === 7)!;
    const induction = buildSchedule(hourly, { ...family, cooking: "induction" }).find(
      (e) => e.hour === 7,
    )!;
    expect(wood.detail).toMatch(/Wood and coal/);
    expect(induction.detail).toMatch(/Induction/);
    const metro = buildSchedule(hourly, { ...family, commute: "metro" }).find((e) => e.hour === 8)!;
    expect(metro.detail).not.toMatch(/Wear a fitted N95/);
    expect(buildSchedule(hourly, family).find((e) => e.hour === 8)!.detail).toMatch(
      /Wear a fitted N95/,
    );
  });
  it("mentions extra care when someone is sensitive", () => {
    const best = bestHour(hourly);
    expect(buildSchedule(hourly, family).find((e) => e.hour === best)!.detail).toMatch(
      /child or older adult/,
    );
    expect(
      buildSchedule(hourly, { ...family, vulnerable: false }).find((e) => e.hour === best)!.detail,
    ).not.toMatch(/child or older adult/);
  });
});
