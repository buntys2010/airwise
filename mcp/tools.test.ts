import { describe, expect, it, vi } from "vitest";
import { CITIES, estimateHourly, type AirResult } from "../lib/data";
import { getCityAir, scoreActions, type LoadAir } from "./tools";
import { must } from "../test-support/must";

const live = (id: string): AirResult => ({
  hourly: estimateHourly(must(CITIES.find((c) => c.id === id))),
  source: "live",
  temp: 20,
  wind: 5,
  updated: "10:30",
});
const load: LoadAir = (id) => Promise.resolve(live(id));
const down: LoadAir = () => {
  return Promise.reject(new Error("feed down"));
};
const good = {
  city: "delhi",
  home: "leaky",
  commute: "bike",
  cooking: "lpg",
  km: 8,
  vulnerable: true,
};

describe("get_city_air", () => {
  it("returns today's air with units, the cleanest and worst hours, and whether it is live", async () => {
    const result = await getCityAir({ city: "delhi" }, load);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as Record<string, unknown>;
    expect(data).toMatchObject({
      city: "delhi",
      name: "Delhi",
      source: "live",
      updated_ist: "10:30",
    });
    expect((data.hourly_pm25_ugm3 as number[]).length).toBe(24);
    expect(data.best_outdoor_pm25_ugm3 as number).toBeLessThan(data.worst_pm25_ugm3 as number);
    expect(data.units).toMatchObject({
      pm25: expect.stringContaining("micrograms per cubic metre"),
    });
    expect(typeof data.aqi_us_epa_style).toBe("number");
  });
  it("tells an agent when the numbers are an offline estimate", async () => {
    const result = await getCityAir({ city: "pune" }, (id) =>
      Promise.resolve({
        ...live(id),
        source: "estimate",
        updated: null,
      }),
    );
    expect(result.ok && (result.data as { note: string }).note).toMatch(/offline estimate/);
  });
  it("gives a structured error with the allowed values for an unknown or missing city", async () => {
    const bad = await getCityAir({ city: "atlantis" }, load);
    expect(bad).toMatchObject({ ok: false, error: { code: "invalid_argument", field: "city" } });
    if (!bad.ok) {
      expect(bad.error.allowed).toEqual(CITIES.map((c) => c.id));
      expect(bad.error.next_step).toMatch(/Call again/);
    }
    expect(await getCityAir({}, load)).toMatchObject({
      ok: false,
      error: { code: "missing_argument", field: "city" },
    });
  });
  it("says what to do when the air data cannot be loaded", async () => {
    const result = await getCityAir({ city: "delhi" }, down);
    expect(result).toMatchObject({ ok: false, error: { code: "air_data_unavailable" } });
    if (!result.ok) expect(result.error.next_step).toMatch(/Do not quote/);
  });
  it("does not echo a hostile value back at length", async () => {
    const result = await getCityAir({ city: "x".repeat(500) }, load);
    expect(!result.ok && result.error.message.length).toBeLessThan(120);
  });
});

describe("score_actions", () => {
  it("scores a household with and without actions, with every figure from the engine", async () => {
    const none = await scoreActions({ ...good, actions: [] }, load);
    const some = await scoreActions({ ...good, actions: ["seal", "purifier"] }, load);
    expect(none.ok && some.ok).toBe(true);
    if (!none.ok || !some.ok) return;
    const withoutActions = (none.data as { exposure: Record<string, number> }).exposure,
      withActions = (some.data as { exposure: Record<string, number> }).exposure;
    expect(withoutActions.cigarettes_equivalent_per_day_with_actions).toBe(
      withoutActions.cigarettes_equivalent_per_day_if_nothing_changes,
    );
    expect(withoutActions.percent_less_exposure).toBe(0);
    expect(withActions.cigarettes_equivalent_per_day_with_actions).toBeLessThan(
      must(withActions.cigarettes_equivalent_per_day_if_nothing_changes),
    );
    expect(withActions.percent_less_exposure).toBeGreaterThan(40);
    expect(withActions.cigarettes_equivalent_per_day_if_nothing_changes).toBe(
      withoutActions.cigarettes_equivalent_per_day_if_nothing_changes,
    );
  });
  it("lists each action on its own with plan ids an agent can pass back in", async () => {
    const result = await scoreActions({ ...good }, load);
    if (!result.ok) throw new Error("expected ok");
    const each = (
      result.data as {
        each_action_on_its_own: {
          id: string;
          percent_less_exposure: number;
          applicable: boolean;
        }[];
      }
    ).each_action_on_its_own;
    expect(each.map((e) => e.id)).toEqual(
      expect.arrayContaining(["seal", "purifier", "n95", "shift", "swap", "induction"]),
    );
    expect(must(each.find((e) => e.id === "purifier")).percent_less_exposure).toBeGreaterThan(0);
  });
  it("defaults the distance, accepts vulnerable as optional, and labels the cigarette figure as a rule of thumb", async () => {
    const result = await scoreActions(
      { city: "delhi", home: "typical", commute: "metro", cooking: "induction" },
      load,
    );
    if (!result.ok) throw new Error("expected ok");
    const data = result.data as { household: { km: number; vulnerable: boolean }; notes: string[] };
    expect(data.household).toMatchObject({ km: 8, vulnerable: false });
    expect(data.notes.join(" ")).toMatch(/rule of thumb.*not medical advice/);
  });
  it.each([
    [{ ...good, city: undefined }, "missing_argument", "city"],
    [{ ...good, home: "castle" }, "invalid_argument", "home"],
    [{ ...good, commute: "teleport" }, "invalid_argument", "commute"],
    [{ ...good, cooking: undefined }, "missing_argument", "cooking"],
    [{ ...good, km: -3 }, "invalid_argument", "km"],
    [{ ...good, km: "far" }, "invalid_argument", "km"],
    [{ ...good, actions: "seal" }, "invalid_argument", "actions"],
    [{ ...good, actions: ["seal", "magic"] }, "invalid_argument", "actions"],
  ])("returns a structured error for %j", async (args, code, field) => {
    const result = await scoreActions(args as never, load);
    expect(result).toMatchObject({ ok: false, error: { code, field } });
    if (!result.ok) {
      expect(result.error.next_step.length).toBeGreaterThan(10);
      if (field !== "km") expect(result.error.allowed?.length).toBeGreaterThan(0);
    }
  });
  it("never calls the air feed when the arguments are invalid", async () => {
    const spy = vi.fn(load);
    await scoreActions({ ...good, home: "castle" }, spy);
    expect(spy).not.toHaveBeenCalled();
  });
  it("says what to do when the air data cannot be loaded", async () => {
    expect(await scoreActions(good, down)).toMatchObject({
      ok: false,
      error: { code: "air_data_unavailable" },
    });
  });
});
