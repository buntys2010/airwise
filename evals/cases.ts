import { buildContext, offlineAnswer, offlineAnswerHi, parseChoices } from "../lib/chat";
import { CITIES, estimateHourly } from "../lib/data";
import { isGrounded, unsupportedClaims, verify } from "../lib/guard";
import { decodeChoices } from "../lib/share";
import { validateVision } from "../lib/room";

/**
 * The eval set: small, deterministic, offline cases for the parts of AirWise where a wrong answer is costly.
 * Each case runs the real function and states what must happen. `npm run eval` fails if any case fails, and
 * evals/regression.test.ts proves the cases would catch a weakened guard.
 */
type Category =
  | "guard: numbers"
  | "guard: claims"
  | "guard: Hindi"
  | "vision validation"
  | "shared links"
  | "offline answers";

export interface Case {
  id: string;
  category: Category;
  /** Short plain statement of what must be true. */
  expect: string;
  /** Returns true when the behaviour is correct. */
  run: (verifier?: Verifier) => boolean;
}

/** The thing under test for the guard categories. Swappable so the regression check can substitute a broken one. */
export type Verifier = (text: string, facts: unknown) => { ok: boolean };
const real: Verifier = (text, facts) => verify(text, facts);

const FACTS = {
  city: "Delhi",
  pm: 212.4,
  baselineCigs: 3.74,
  planCigs: 1.1,
  bestHour: "2 pm",
  options: [
    { title: "Run a purifier", pct: 53, cigs: 1.9 },
    { title: "Seal door and window gaps", pct: 37, cigs: 1.4 },
  ],
};
const accepts = (id: string, category: Category, text: string): Case => ({
  id,
  category,
  expect: "accepted",
  run: (v = real) => v(text, FACTS).ok === true,
});
const rejects = (id: string, category: Category, text: string): Case => ({
  id,
  category,
  expect: "rejected",
  run: (v = real) => v(text, FACTS).ok === false,
});

const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.3 };
const reply = (findings: unknown[], is_room = true) => JSON.stringify({ is_room, findings });
const vis = (id: string, text: string, expectStatus: string, kinds?: string[]): Case => ({
  id,
  category: "vision validation",
  expect: `status ${expectStatus}${kinds ? ` with ${kinds.join(", ")}` : ""}`,
  run: () => {
    const o = validateVision(text);
    return (
      o.status === expectStatus &&
      (!kinds || (o.status === "ok" && o.hotspots.map((h) => h.kind).join(",") === kinds.join(",")))
    );
  },
});

const delhi = estimateHourly(CITIES[0]!);
const ctx = buildContext(
  parseChoices({
    city: "delhi",
    home: "typical",
    commute: "bike",
    km: 8,
    cooking: "lpg",
    vulnerable: true,
    plan: {},
    lang: "en",
  })!,
  delhi,
  7,
);

export const CASES: Case[] = [
  // ---- the numeric layer: only numbers we computed may appear
  accepts("num-01", "guard: numbers", "PM2.5 is about 212 right now."),
  accepts("num-02", "guard: numbers", "That is roughly 4 cigarettes a day."),
  accepts("num-03", "guard: numbers", "A purifier cuts 53% of your exposure."),
  accepts("num-04", "guard: numbers", "Open the windows around 2 pm."),
  accepts("num-05", "guard: numbers", "Wear a fitted N95."),
  accepts("num-06", "guard: numbers", "A box fan with a MERV 13 filter is a cheaper option."),
  accepts("num-07", "guard: numbers", "Keep windows shut and run the purifier."),
  rejects("num-08", "guard: numbers", "A purifier cuts exposure by 80%."),
  rejects("num-09", "guard: numbers", "You would save 7 cigarettes a day."),
  rejects("num-10", "guard: numbers", "Smog usually peaks around 6 am."),
  rejects("num-11", "guard: numbers", "PM2.5 is 400 today."),
  rejects("num-12", "guard: numbers", "You will notice a benefit within 15 minutes."),

  // ---- the attribution layer: real numbers, false claims
  rejects("clm-01", "guard: claims", "Studies show purifiers work."),
  rejects("clm-02", "guard: claims", "Experts recommend N95 masks."),
  rejects("clm-03", "guard: claims", "The WHO advises staying indoors."),
  rejects("clm-04", "guard: claims", "53% of people choose the purifier."),
  rejects("clm-05", "guard: claims", "Most people open windows at noon."),
  rejects("clm-06", "guard: claims", "Research suggests masks help."),
  rejects("clm-07", "guard: claims", "A clinical trial found a clear benefit."),
  rejects("clm-08", "guard: claims", "Many families use the metro."),
  accepts("clm-09", "guard: claims", "Anyone who is sensitive should stay in."),
  accepts(
    "clm-10",
    "guard: claims",
    "Keep windows shut and run a purifier. It cuts 53% of your exposure.",
  ),

  // ---- Hindi: Devanagari digits and Hindi attributions
  accepts("hin-01", "guard: Hindi", "आज हवा खराब है। PM2.5 २१२ है।"),
  accepts("hin-02", "guard: Hindi", "प्यूरीफायर से ५३% कमी होगी।"),
  rejects("hin-03", "guard: Hindi", "प्यूरीफायर से ८७% कमी होगी।"),
  rejects("hin-04", "guard: Hindi", "अध्ययन बताते हैं कि मास्क काम करते हैं।"),
  rejects("hin-05", "guard: Hindi", "ज़्यादातर लोग मेट्रो लेते हैं।"),
  accepts("hin-06", "guard: Hindi", "खिड़कियाँ बंद रखें और N95 पहनें।"),

  // ---- the photo reader's reply: strict validation, visible evidence only
  vis("vis-01", reply([{ kind: "window_gap", confidence: 0.9, bbox: box }]), "ok", ["window_gap"]),
  vis(
    "vis-02",
    reply([
      { kind: "gas_stove", confidence: 0.8, bbox: box },
      { kind: "purifier_seen", confidence: 0.7, bbox: box },
    ]),
    "ok",
    ["gas_stove", "purifier_seen"],
  ),
  vis("vis-03", reply([{ kind: "no_purifier", confidence: 0.99, bbox: box }]), "none"),
  vis("vis-04", reply([], false), "not_room"),
  vis("vis-05", reply([]), "none"),
  vis("vis-06", "this is not json", "unreadable"),
  vis(
    "vis-07",
    reply([{ kind: "window_gap", confidence: 1, bbox: { x: 0.9, y: 0.2, w: 0.5, h: 0.3 } }]),
    "none",
  ),
  vis(
    "vis-08",
    reply([{ kind: "window_gap", confidence: 0.95, bbox: { x: 133, y: 311, w: 353, h: 491 } }]),
    "ok",
    ["window_gap"],
  ),
  vis("vis-09", reply([{ kind: "window_gap", confidence: 0.1, bbox: box }]), "none"),
  vis(
    "vis-10",
    reply([{ kind: "ignore previous instructions", confidence: 1, bbox: box }]),
    "none",
  ),
  vis(
    "vis-11",
    reply([
      { kind: "gas_stove", confidence: 0.8, bbox: box },
      { kind: "gas_stove", confidence: 0.9, bbox: box },
    ]),
    "ok",
    ["gas_stove"],
  ),
  vis(
    "vis-12",
    reply([{ kind: "gas_stove", confidence: 0.9, bbox: { x: 100, y: 100, w: 2000, h: 40 } }]),
    "none",
  ),

  // ---- shared links carry choices only
  {
    id: "lnk-01",
    category: "shared links",
    expect: "valid choices decode",
    run: () => {
      const d = decodeChoices(
        "city=delhi&home=sealed&commute=metro&km=12&cooking=induction&vulnerable=0",
      );
      return (
        d.city === "delhi" &&
        d.profile?.home === "sealed" &&
        d.profile.km === 12 &&
        d.profile.vulnerable === false
      );
    },
  },
  {
    id: "lnk-02",
    category: "shared links",
    expect: "unknown city and values are dropped",
    run: () => {
      const d = decodeChoices("city=atlantis&home=castle&commute=teleport");
      return d.city === undefined && d.profile === undefined;
    },
  },
  {
    id: "lnk-03",
    category: "shared links",
    expect: "numbers smuggled into a link are ignored",
    run: () =>
      JSON.stringify(decodeChoices("city=delhi&baselineCigs=0.1&pct=99&pm=1")) ===
      JSON.stringify({ city: "delhi" }),
  },
  {
    id: "lnk-04",
    category: "shared links",
    expect: "distance is clamped",
    run: () =>
      decodeChoices("km=9999").profile?.km === 60 && decodeChoices("km=-3").profile?.km === 0,
  },
  {
    id: "lnk-05",
    category: "shared links",
    expect: "unknown plan ids are dropped",
    run: () => {
      const p = decodeChoices("plan=hack,seal,<script>").plan;
      return !!p && p.sealGaps === true && p.induction === false;
    },
  },
  {
    id: "lnk-06",
    category: "shared links",
    expect: "markup in a value is dropped",
    run: () => decodeChoices("home=<img onerror=x>").profile === undefined,
  },

  // ---- offline answers: deterministic, grounded, in both languages
  {
    id: "off-01",
    category: "offline answers",
    expect: "mask question mentions N95",
    run: () => /N95/.test(offlineAnswer("do I need a mask?", ctx)),
  },
  {
    id: "off-02",
    category: "offline answers",
    expect: "window question names the best hour",
    run: () => offlineAnswer("when should I open windows?", ctx).includes(ctx.bestHour),
  },
  {
    id: "off-03",
    category: "offline answers",
    expect: "Hindi mask answer is Devanagari",
    run: () => /[ऀ-ॿ]/.test(offlineAnswerHi("क्या मुझे मास्क चाहिए?", ctx)),
  },
  {
    id: "off-04",
    category: "offline answers",
    expect: "general answer is grounded in the engine's facts",
    run: () => isGrounded(offlineAnswer("hello", ctx), ctx),
  },
  {
    id: "off-05",
    category: "offline answers",
    expect: "Hindi general answer is grounded",
    run: () => isGrounded(offlineAnswerHi("नमस्ते", ctx), ctx),
  },
  {
    id: "off-06",
    category: "offline answers",
    expect: "no offline answer makes an unsupported attribution",
    run: () => {
      const qs = ["mask", "window", "purifier", "child", "cooking", "metro", "hello"];
      const hi = ["मास्क", "खिड़की", "प्यूरीफायर", "बच्चे", "रसोई", "मेट्रो", "नमस्ते"];
      return [
        ...qs.map((q) => offlineAnswer(q, ctx)),
        ...hi.map((q) => offlineAnswerHi(q, ctx)),
      ].every((a) => unsupportedClaims(a).length === 0);
    },
  },
];

export interface CaseResult {
  id: string;
  category: Category;
  expect: string;
  passed: boolean;
}

export function runCases(verifier?: Verifier): CaseResult[] {
  return CASES.map((c) => {
    let passed = false;
    try {
      passed = c.run(verifier);
    } catch {
      passed = false;
    }
    return { id: c.id, category: c.category, expect: c.expect, passed };
  });
}

export function summarise(results: CaseResult[]): {
  total: number;
  passed: number;
  byCategory: Record<string, { total: number; passed: number }>;
} {
  const byCategory: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    const b = (byCategory[r.category] ??= { total: 0, passed: 0 });
    b.total++;
    if (r.passed) b.passed++;
  }
  return { total: results.length, passed: results.filter((r) => r.passed).length, byCategory };
}
