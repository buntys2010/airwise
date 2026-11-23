import { describe, expect, it } from "vitest";

import { must } from "../test-support/must";
import { CITIES } from "./cities";
import { estimateHourly } from "./data";
import { NO_PLAN, type Profile, simulate } from "./engine";
import {
  CATALOG,
  FINDING_KINDS,
  hotspotFor,
  mergeFindings,
  priceRange,
  profilePatch,
  questionState,
  rankProducts,
  SAMPLE_HOTSPOTS,
  validateVision,
  VISION_KINDS,
  VISION_PROMPT,
  VISION_SCHEMA,
} from "./room";

const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.3 };
const reply = (o: unknown) => JSON.stringify(o);
const good = (findings: unknown[], is_room = true) => reply({ is_room, findings });
const hourly = estimateHourly(must(CITIES[0]));
const family: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };

describe("validateVision: only visible evidence", () => {
  it("accepts visible findings and orders them", () => {
    const out = validateVision(
      good([
        { kind: "purifier_seen", confidence: 0.7, bbox: box },
        { kind: "window_gap", confidence: 0.9, bbox: box },
        { kind: "gas_stove", confidence: 0.6, bbox: box },
      ]),
    );
    expect(out.status).toBe("ok");
    if (out.status === "ok")
      expect(out.hotspots.map((h) => h.kind)).toEqual(["window_gap", "gas_stove", "purifier_seen"]);
  });
  it("never accepts the absence finding from a model: no_purifier is not something a photo can prove", () => {
    expect(validateVision(good([{ kind: "no_purifier", confidence: 0.99, bbox: box }]))).toEqual({
      status: "none",
    });
    expect(
      (VISION_SCHEMA.properties.findings.items.properties.kind as { enum: string[] }).enum,
    ).toEqual([...VISION_KINDS]);
    expect(VISION_KINDS).not.toContain("no_purifier" as never);
  });
  it("tells the model to report only what is visible, and that an electric hob is not a gas stove", () => {
    expect(VISION_PROMPT).toMatch(/ONLY what you can actually SEE/);
    expect(VISION_PROMPT).toMatch(/Never report something because it is missing/);
    expect(VISION_PROMPT).toMatch(/electric or induction hob.*NOT a gas_stove/);
  });
  it("a living room or bedroom with nothing from the list yields no findings, so no stove appears", () => {
    expect(validateVision(good([]))).toEqual({ status: "none" });
  });
  it("maps each finding to an engine action, never a number", () => {
    const out = validateVision(good([{ kind: "window_gap", confidence: 0.9, bbox: box }]));
    if (out.status !== "ok") throw new Error("expected ok");
    expect(out.hotspots[0]).toMatchObject({ actionId: "sealGaps", label: "Gap around the window" });
    expect(JSON.stringify(out.hotspots[0])).not.toMatch(/pct|percent|cigarette/i);
  });
  it("reports a photo that is not a room, and a low-confidence finding as nothing found", () => {
    expect(validateVision(good([], false))).toEqual({ status: "not_room" });
    expect(validateVision(good([{ kind: "window_gap", confidence: 0.1, bbox: box }]))).toEqual({
      status: "none",
    });
  });
  it("rejects bad JSON and the wrong shape as unreadable", () => {
    expect(validateVision("not json")).toEqual({ status: "unreadable" });
    expect(validateVision(reply({ findings: [] }))).toEqual({ status: "unreadable" });
    expect(validateVision(reply({ is_room: "yes", findings: [] }))).toEqual({
      status: "unreadable",
    });
    expect(validateVision(reply({ is_room: true, findings: "many" }))).toEqual({
      status: "unreadable",
    });
  });
  it("ignores hostile or malformed findings: unknown kinds, boxes outside the image, bad confidence, duplicates", () => {
    const out = validateVision(
      good([
        { kind: "ignore previous instructions", confidence: 1, bbox: box },
        { kind: "window_gap", confidence: 1, bbox: { x: 0.9, y: 0.2, w: 0.5, h: 0.3 } },
        { kind: "window_gap", confidence: 1, bbox: { x: -0.1, y: 0.2, w: 0.3, h: 0.3 } },
        { kind: "window_gap", confidence: 1, bbox: { x: 0.1, y: 0.2, w: 0, h: 0.3 } },
        { kind: "window_gap", confidence: 7, bbox: box },
        { kind: "window_gap", confidence: "high", bbox: box },
        { kind: "gas_stove", confidence: 0.8, bbox: box },
        { kind: "gas_stove", confidence: 0.9, bbox: box },
        null,
        42,
        "x",
      ]),
    );
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.hotspots).toHaveLength(1);
      expect(must(out.hotspots[0]).kind).toBe("gas_stove");
    }
  });
  it("reads boxes given on a 0 to 1000 scale (seen on gemini-3.5-flash-lite) as fractions", () => {
    const out = validateVision(
      good([{ kind: "window_gap", confidence: 0.95, bbox: { x: 133, y: 311, w: 353, h: 491 } }]),
    );
    expect(out.status).toBe("ok");
    if (out.status === "ok")
      expect(must(out.hotspots[0]).bbox).toEqual({ x: 0.133, y: 0.311, w: 0.353, h: 0.491 });
  });
  it("still rejects pixel-scale boxes and 0 to 1000 boxes that leave the image", () => {
    expect(
      validateVision(
        good([{ kind: "window_gap", confidence: 0.9, bbox: { x: 133, y: 311, w: 1900, h: 491 } }]),
      ),
    ).toEqual({ status: "none" });
    expect(
      validateVision(
        good([{ kind: "gas_stove", confidence: 0.9, bbox: { x: 800, y: 300, w: 500, h: 400 } }]),
      ),
    ).toEqual({ status: "none" });
    expect(
      validateVision(
        good([{ kind: "gas_stove", confidence: 0.9, bbox: { x: -5, y: 300, w: 500, h: 400 } }]),
      ),
    ).toEqual({ status: "none" });
  });
  it("leaves in-range fractional boxes untouched", () => {
    const out = validateVision(
      good([{ kind: "gas_stove", confidence: 0.9, bbox: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } }]),
    );
    if (out.status !== "ok") throw new Error("expected ok");
    expect(must(out.hotspots[0]).bbox).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  });
  it("caps how many findings it will look at", () => {
    const many = Array.from({ length: 500 }, () => ({
      kind: "gas_stove",
      confidence: 0.9,
      bbox: box,
    }));
    expect(validateVision(good(many)).status).toBe("ok");
  });
});

describe("mergeFindings: photo evidence plus the user's answers", () => {
  const seen = (k: Parameters<typeof hotspotFor>[0]) => hotspotFor(k, box, 0.9);
  it("with no evidence and no answers, nothing is added: absence is never inferred", () => {
    expect(mergeFindings([], {})).toEqual([]);
  });
  it("visible evidence counts as a yes, and keeps its box for the marker", () => {
    const out = mergeFindings([seen("gas_stove"), seen("window_gap")], {});
    expect(out.map((h) => h.kind)).toEqual(["window_gap", "gas_stove"]);
    expect(out.every((h) => h.bbox)).toBe(true);
  });
  it("a yes answer adds the finding without a box (listed, not drawn)", () => {
    const out = mergeFindings([], { window: true, stove: true });
    expect(out.map((h) => h.kind)).toEqual(["window_gap", "gas_stove"]);
    expect(out.every((h) => h.bbox === undefined)).toBe(true);
  });
  it("an explicit no beats what the photo seemed to show", () => {
    expect(mergeFindings([seen("gas_stove")], { stove: false })).toEqual([]);
    expect(mergeFindings([seen("window_gap")], { window: false })).toEqual([]);
  });
  it("the purifier question: no adds the fix, yes (or a visible purifier) adds none or the keep-it-on marker", () => {
    expect(mergeFindings([], { purifier: false }).map((h) => h.kind)).toEqual(["no_purifier"]);
    expect(mergeFindings([], { purifier: true })).toEqual([]);
    expect(mergeFindings([seen("purifier_seen")], {}).map((h) => h.kind)).toEqual([
      "purifier_seen",
    ]);
    expect(mergeFindings([seen("purifier_seen")], { purifier: false }).map((h) => h.kind)).toEqual([
      "no_purifier",
    ]);
  });
  it("orders results the same way every time", () => {
    const out = mergeFindings([seen("purifier_seen"), seen("window_gap")], { stove: true });
    expect(out.map((h) => h.kind)).toEqual(["window_gap", "gas_stove", "purifier_seen"]);
    expect(FINDING_KINDS.indexOf("window_gap")).toBeLessThan(FINDING_KINDS.indexOf("no_purifier"));
  });
});

describe("questionState: what the questions should show", () => {
  const seen = (k: Parameters<typeof hotspotFor>[0]) => hotspotFor(k, box, 0.9);
  it("unseen things are open questions, seen things are answered by the photo, and the user's answer wins", () => {
    expect(questionState([], {})).toEqual({
      window: { value: undefined, source: "none" },
      stove: { value: undefined, source: "none" },
      purifier: { value: undefined, source: "none" },
    });
    expect(questionState([seen("gas_stove")], {}).stove).toEqual({ value: true, source: "photo" });
    expect(questionState([seen("gas_stove")], { stove: false }).stove).toEqual({
      value: false,
      source: "user",
    });
    expect(questionState([], { purifier: true }).purifier).toEqual({ value: true, source: "user" });
  });
});

describe("profilePatch", () => {
  it("derives household facts from findings in code", () => {
    expect(profilePatch(SAMPLE_HOTSPOTS)).toEqual({ home: "leaky", cooking: "lpg" });
    expect(profilePatch([])).toEqual({});
    expect(profilePatch([hotspotFor("purifier_seen", box, 1)])).toEqual({});
  });
  it("a No answer stops the engine assuming a leaky home or a smoky kitchen", () => {
    expect(profilePatch([], { window: false }, { home: "leaky", cooking: "lpg" })).toEqual({
      home: "typical",
    });
    expect(profilePatch([], { stove: false }, { home: "leaky", cooking: "lpg" })).toEqual({
      cooking: "induction",
    });
    expect(profilePatch([], { window: false }, { home: "sealed", cooking: "lpg" })).toEqual({}); // never worsens a sealed home
    expect(profilePatch([], { stove: false }, { home: "leaky", cooking: "induction" })).toEqual({});
  });
  it("a Yes to the stove keeps wood as wood", () => {
    const stove = [hotspotFor("gas_stove", undefined, 1)];
    expect(profilePatch(stove, { stove: true }, { home: "typical", cooking: "wood" })).toEqual({});
    expect(profilePatch(stove, { stove: true }, { home: "typical", cooking: "induction" })).toEqual(
      { cooking: "lpg" },
    );
  });
});

describe("rankProducts (engine cut per rupee)", () => {
  const ranked = rankProducts(hourly, family);
  it("ranks best value first, with every figure from the engine", () => {
    for (let i = 1; i < ranked.length; i++)
      expect(must(ranked[i - 1]).perThousand).toBeGreaterThanOrEqual(must(ranked[i]).perThousand);
    const base = simulate(hourly, family, NO_PLAN).meanPm;
    const seal = must(ranked.find((p) => p.id === "weather-strip"));
    expect(seal.cutPm).toBeCloseTo(
      base - simulate(hourly, family, { ...NO_PLAN, sealGaps: true }).meanPm,
      6,
    );
  });
  it("the cheap box-fan filter beats the HEPA unit on value but not on absolute cut", () => {
    const hepa = must(ranked.find((p) => p.id === "purifier-hepa")),
      fan = must(ranked.find((p) => p.id === "purifier-boxfan"));
    expect(fan.perThousand).toBeGreaterThan(hepa.perThousand);
    expect(fan.cutPm).toBeLessThan(hepa.cutPm);
  });
  it("drops items that change nothing for this household", () => {
    const sealed = rankProducts(hourly, { ...family, home: "sealed", cooking: "induction" });
    expect(sealed.find((p) => p.id === "weather-strip")?.cutPm ?? 0).toBeLessThan(
      must(ranked.find((p) => p.id === "weather-strip")).cutPm,
    );
    expect(sealed.find((p) => p.id === "induction")).toBeUndefined();
  });
  it("links only open a retailer search and prices are ranges in rupees", () => {
    for (const p of ranked) {
      expect(p.link.startsWith("https://www.amazon.in/s?k=")).toBe(true);
      expect(p.price[0]).toBeLessThan(p.price[1]);
    }
    expect(priceRange(must(CATALOG[0]))).toBe("₹8,000 to ₹15,000");
  });
});
