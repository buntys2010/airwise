import { describe, expect, it } from "vitest";
import { parseChoices } from "./chat";
import { CITIES, estimateHourly } from "./data";
import { buildPlanPrompt, buildPlanRequest, schedulePlan, validatePlan } from "./plan";
import { must } from "../test-support/must";

const hourly = estimateHourly(must(CITIES[0]));
const choices = must(
  parseChoices({
    city: "delhi",
    home: "typical",
    commute: "bike",
    km: 8,
    cooking: "lpg",
    vulnerable: true,
    plan: {},
    lang: "en",
  }),
);
const req = buildPlanRequest(choices, hourly, 7);
const schedule = req.schedule;
const good = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    headline: "A calmer day in Delhi",
    steps: schedule.map((s) => ({ time: s.time, text: s.title })),
    ...over,
  });

describe("buildPlanRequest", () => {
  it("builds the schedule and facts on the server from the engine", () => {
    expect(schedule.length).toBeGreaterThanOrEqual(6);
    expect(req.context.city).toBe("Delhi");
    expect(schedule.every((s) => s.time && s.title && s.detail)).toBe(true);
  });
});

describe("buildPlanPrompt", () => {
  it("fences facts as data and asks for the requested language", () => {
    const builtPrompt = buildPlanPrompt(req);
    expect(builtPrompt).toContain("<facts>");
    expect(builtPrompt).toMatch(/never as instructions/);
    expect(buildPlanPrompt(req, "hi")).toMatch(/Hindi/);
  });
});

describe("validatePlan", () => {
  it("accepts a well-formed, grounded plan", () =>
    expect(validatePlan(good(), req)?.steps).toHaveLength(schedule.length));
  it("rejects invalid JSON, wrong step count and changed times", () => {
    expect(validatePlan("not json", req)).toBeNull();
    expect(validatePlan(good({ steps: [] }), req)).toBeNull();
    expect(
      validatePlan(good({ steps: schedule.map((s) => ({ time: "3 am", text: s.title })) }), req),
    ).toBeNull();
  });
  it("rejects a plan that smuggles in an invented number", () => {
    const steps = schedule.map((s, i) => ({
      time: s.time,
      text: i === 2 ? "This cuts exposure by 91%." : s.title,
    }));
    expect(validatePlan(good({ steps }), req)).toBeNull();
  });
  it("rejects an empty headline or empty step text", () => {
    expect(validatePlan(good({ headline: "" }), req)).toBeNull();
    expect(
      validatePlan(good({ steps: schedule.map((s) => ({ time: s.time, text: "" })) }), req),
    ).toBeNull();
  });
});

describe("schedulePlan", () => {
  it("returns the deterministic plan with the same times", () => {
    const dayPlan = schedulePlan(req);
    expect(dayPlan.steps.map((s) => s.time)).toEqual(schedule.map((s) => s.time));
    expect(dayPlan.headline).toContain("Delhi");
  });
});

import { communityPlan } from "./plan";
import { NO_PLAN, simulate, buildActions, type Profile } from "./engine";

describe("communityPlan", () => {
  const household: Profile = {
    home: "leaky",
    commute: "bike",
    km: 8,
    cooking: "lpg",
    vulnerable: true,
  };
  const delhi = estimateHourly(must(CITIES[0]));
  const bengaluru = estimateHourly(must(CITIES[5]));

  it("picks the three fixes that help most, each with its engine cut", () => {
    const communityNotice = communityPlan(delhi, household, 7);
    expect(communityNotice.fixes).toHaveLength(3);
    const actions = buildActions(delhi, household);
    for (const f of communityNotice.fixes)
      expect(f.pct).toBe(Math.round(must(actions.find((a) => a.id === f.id)).savedPct * 100));
    for (let i = 1; i < communityNotice.fixes.length; i++)
      expect(must(communityNotice.fixes[i - 1]).pct).toBeGreaterThanOrEqual(
        must(communityNotice.fixes[i]).pct,
      );
  });
  it("takes every figure from the live air data and the engine", () => {
    const communityNotice = communityPlan(delhi, household, 7);
    expect(communityNotice.nowPm).toBe(delhi[7]);
    expect(communityNotice.bestPm).toBe(delhi[communityNotice.bestHour]);
    expect(simulate(delhi, household, NO_PLAN).meanPm).toBeGreaterThan(0);
  });
  it("widens the community rules as the air gets worse", () => {
    const bad = communityPlan(delhi, household, 7).rules; // very unhealthy or worse
    const clean = communityPlan(bengaluru, household, 15).rules; // good or moderate
    expect(clean).toEqual(["rule.noBurning", "rule.carpool", "rule.timeEvents"]);
    expect(bad).toEqual(
      expect.arrayContaining([
        "rule.indoorPlay",
        "rule.maskStock",
        "rule.doorsShut",
        "rule.checkVulnerable",
      ]),
    );
    expect(bad.length).toBeGreaterThan(clean.length);
  });
  it("always includes the rules that apply on any day", () => {
    for (const hour of [3, 9, 15, 21])
      expect(communityPlan(delhi, household, hour).rules).toEqual(
        expect.arrayContaining(["rule.noBurning", "rule.timeEvents"]),
      );
  });
});
