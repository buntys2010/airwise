import { describe, expect, it } from "vitest";
import { NO_PLAN, fullPlan, type Profile } from "./engine";
import {
  decodeChoices,
  encodeChoices,
  idsToPlan,
  planToIds,
  sanitizePlan,
  shareUrl,
} from "./share";

const profile: Profile = {
  home: "leaky",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};

describe("encodeChoices", () => {
  it("carries only choices: city, four household answers and the switched-on fixes", () => {
    const q = new URLSearchParams(
      encodeChoices({
        city: "lucknow",
        profile,
        plan: { ...NO_PLAN, sealGaps: true, purifier: true },
      }),
    );
    expect([...q.keys()].sort()).toEqual([
      "city",
      "commute",
      "cooking",
      "home",
      "km",
      "plan",
      "vulnerable",
    ]);
    expect(q.get("plan")).toBe("seal,purifier");
    expect(q.get("vulnerable")).toBe("1");
  });
  it("never carries a computed figure", () => {
    const text = encodeChoices({ city: "delhi", profile, plan: fullPlan(profile) });
    expect(text).not.toMatch(/cig|pm|pct|percent|exposure|saved|aqi/i);
  });
  it("leaves the plan out when nothing is switched on", () => {
    expect(
      new URLSearchParams(encodeChoices({ city: "delhi", profile, plan: NO_PLAN })).has("plan"),
    ).toBe(false);
  });
  it("builds a full link on the given origin", () => {
    expect(shareUrl("https://airwise.example", { city: "pune", profile, plan: NO_PLAN })).toMatch(
      /^https:\/\/airwise\.example\/\?city=pune&home=leaky/,
    );
    expect(
      shareUrl("https://airwise.example\r\nInjected: header", {
        city: "pune",
        profile,
        plan: NO_PLAN,
      }),
    ).toMatch(/^https:\/\/airwise\.exampleInjected: header\/\?city=pune/);
  });
});

describe("decodeChoices", () => {
  it("round-trips a full set of choices", () => {
    const plan = { ...fullPlan(profile), purifierKind: "boxfan" as const };
    const back = decodeChoices(encodeChoices({ city: "kolkata", profile, plan }));
    expect(back.city).toBe("kolkata");
    expect(back.profile).toEqual(profile);
    expect(planToIds(back.plan!).sort()).toEqual(planToIds(plan).sort());
  });
  it("drops anything outside the fixed lists, so a hand-edited link can only choose valid options", () => {
    const back = decodeChoices(
      "city=atlantis&home=castle&commute=teleport&cooking=magic&km=far&vulnerable=maybe&plan=hack,<script>",
    );
    expect(back.city).toBeUndefined();
    expect(back.profile).toBeUndefined();
    expect(back.plan).toEqual(idsToPlan([]));
  });
  it("keeps the valid parts of a partly valid link", () => {
    const back = decodeChoices("city=delhi&home=castle&cooking=wood");
    expect(back.city).toBe("delhi");
    expect(back.profile).toEqual({ cooking: "wood" });
  });
  it("clamps the distance and ignores empty or non-numeric values", () => {
    expect(decodeChoices("km=9999").profile?.km).toBe(60);
    expect(decodeChoices("km=-4").profile?.km).toBe(0);
    expect(decodeChoices("km=").profile).toBeUndefined();
    expect(decodeChoices("km=NaN").profile).toBeUndefined();
  });
  it("returns nothing for an empty query", () => expect(decodeChoices("")).toEqual({}));
  it("a link cannot smuggle numbers: unknown parameters are ignored", () => {
    expect(decodeChoices("city=delhi&baselineCigs=0.1&pm=1&pct=99")).toEqual({ city: "delhi" });
  });
});

describe("plan ids", () => {
  it("round-trip each action", () => {
    for (const ids of [
      ["seal"],
      ["purifier"],
      ["boxfan"],
      ["n95"],
      ["shift"],
      ["swap"],
      ["induction"],
    ])
      expect(planToIds(idsToPlan(ids))).toEqual(ids);
  });
  it("a swap in a link means the metro, the same default the engine's full plan uses", () => {
    expect(idsToPlan(["swap"]).swapCommute).toBe("metro");
  });
  it("drops a swap that the engine says is not applicable (walk, cycle, metro)", () => {
    for (const commute of ["walk", "cycle", "metro"] as const)
      expect(sanitizePlan(idsToPlan(["swap"]), commute).swapCommute).toBeNull();
    expect(sanitizePlan(idsToPlan(["swap"]), "car").swapCommute).toBe("metro");
    expect(decodeChoices("?commute=walk&plan=swap").plan?.swapCommute).toBeNull();
  });
});

describe("?city= links", () => {
  it("accepts any listed city on its own, including the new ones", () => {
    expect(decodeChoices("?city=varanasi")).toEqual({ city: "varanasi" });
    expect(decodeChoices("?city=port-blair")).toEqual({ city: "port-blair" });
  });
  it("drops an unknown or hostile city", () => {
    expect(decodeChoices("?city=atlantis")).toEqual({});
    expect(decodeChoices("?city=<script>")).toEqual({});
    expect(decodeChoices("?city=__proto__")).toEqual({});
  });
});
