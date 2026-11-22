/**
 * AirWise impact engine. Pure, deterministic, no network.
 * All factors are planning assumptions documented in docs/methodology.md.
 * The LLM never computes numbers: it only explains what this module returns.
 */

export type Home = "sealed" | "typical" | "leaky";
export type Commute = "walk" | "cycle" | "bike" | "car" | "ev" | "bus" | "metro";
export type Cooking = "wood" | "lpg" | "induction";
export type Mask = "none" | "cloth" | "n95";

export interface Profile {
  home: Home;
  commute: Commute;
  km: number; // one-way
  cooking: Cooking;
  vulnerable: boolean; // child, older adult, asthma/heart condition in the household
}

export interface Plan {
  purifier: boolean;
  /** Which kind of purifier, when one is in the plan. Defaults to HEPA. */
  purifierKind?: PurifierKind;
  mask: Mask;
  shiftOutdoor: boolean;
  swapCommute: Commute | null;
  induction: boolean;
  sealGaps: boolean;
}

export const NO_PLAN: Plan = {
  purifier: false,
  mask: "none",
  shiftOutdoor: false,
  swapCommute: null,
  induction: false,
  sealGaps: false,
};

/** Share of outdoor PM2.5 that reaches indoor air. */
const INFILTRATION: Record<Home, number> = { sealed: 0.35, typical: 0.6, leaky: 0.85 };
export type PurifierKind = "hepa" | "boxfan";
/** Share of indoor PM2.5 that remains while the unit runs. HEPA: right-sized unit. Box fan: a MERV 13 filter taped to a 20-inch fan (DIY, less effective). See docs/methodology.md. */
const PURIFIER_FACTORS: Record<PurifierKind, number> = { hepa: 0.4, boxfan: 0.6 };
const PURIFIER_FACTOR = PURIFIER_FACTORS.hepa;
const MASK_EFFECT: Record<Mask, number> = { none: 0, cloth: 0.1, n95: 0.6 }; // fit-adjusted
/** In-transit exposure relative to ambient. Enclosed modes shield; open modes do not. */
const COMMUTE_EXPOSURE: Record<Commute, number> = {
  walk: 1,
  cycle: 1.2,
  bike: 1.1,
  bus: 0.8,
  car: 0.6,
  ev: 0.6,
  metro: 0.5,
};
export const OPEN_MODES: Commute[] = ["walk", "cycle", "bike", "bus"];
const SPEED_KMH: Record<Commute, number> = {
  walk: 4.5,
  cycle: 12,
  bike: 25,
  bus: 15,
  car: 20,
  ev: 20,
  metro: 30,
};
/** grams CO2e per passenger-km (India grid ≈ 0.7 kg/kWh). */
const CO2_G_PER_KM: Record<Commute, number> = {
  walk: 0,
  cycle: 0,
  bike: 35,
  bus: 70,
  car: 150,
  ev: 100,
  metro: 30,
};
/** extra indoor PM2.5 (µg/m³) while cooking, per hour. */
const COOKING_ADD: Record<Cooking, number> = { wood: 150, lpg: 30, induction: 8 };

export const OUTDOOR_HOUR = 7; // default family outdoor hour (school run, walk, play)
/** Time outside during the outdoor hour, in hours. */
const OUTDOOR_TIME_H = 0.5;
const COOKING_HOURS = [7, 20];
const COMMUTE_HOURS = [8, 18];
export const CIGARETTE_PM = 22; // ≈ one cigarette per 22 µg/m³ of daily PM2.5 (Berkeley Earth rule of thumb)

export interface Category {
  label: string;
  tone: "good" | "moderate" | "sensitive" | "unhealthy" | "severe" | "hazardous";
  icon: string;
  advice: string;
}

const BREAKS: { pm: number; aqi: number }[] = [
  { pm: 0, aqi: 0 },
  { pm: 12, aqi: 50 },
  { pm: 35.4, aqi: 100 },
  { pm: 55.4, aqi: 150 },
  { pm: 150.4, aqi: 200 },
  { pm: 250.4, aqi: 300 },
  { pm: 350.4, aqi: 400 },
  { pm: 500.4, aqi: 500 },
];

/** One hour of a 24-value series. Series are always 24 long; a missing hour reads as 0 rather than crashing a render. */
export const pmAt = (hourly: readonly number[], hour: number): number => hourly[hour] ?? 0;

/** US-EPA style AQI from PM2.5 (µg/m³), piecewise linear. */
export function aqiFromPm(pm: number): number {
  const x = Math.max(0, pm);
  for (let i = 1; i < BREAKS.length; i++) {
    const a = BREAKS[i - 1],
      b = BREAKS[i];
    if (a && b && x <= b.pm) {
      return Math.round(a.aqi + ((x - a.pm) * (b.aqi - a.aqi)) / (b.pm - a.pm));
    }
  }
  return 500;
}

export function categoryOf(pm: number): Category {
  const aqi = aqiFromPm(pm);
  if (aqi <= 50)
    return { label: "Good", tone: "good", icon: "●", advice: "Air is clean. Open windows." };
  if (aqi <= 100)
    return {
      label: "Moderate",
      tone: "moderate",
      icon: "◆",
      advice: "The air is acceptable. Sensitive lungs may notice it.",
    };
  if (aqi <= 150)
    return {
      label: "Poor for sensitive groups",
      tone: "sensitive",
      icon: "▲",
      advice: "Children, older adults and asthma: keep outdoor time short.",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      tone: "unhealthy",
      icon: "■",
      advice: "Cut outdoor time. Wear an N95 outside.",
    };
  if (aqi <= 300)
    return {
      label: "Very unhealthy",
      tone: "severe",
      icon: "⬣",
      advice: "Stay in. Run a purifier. N95 for any trip.",
    };
  return {
    label: "Hazardous",
    tone: "hazardous",
    icon: "✖",
    advice: "Avoid going out. Treat indoor air as your priority.",
  };
}

export interface Sim {
  meanPm: number; // time-weighted personal exposure, µg/m³
  cigs: number;
  parts: { indoor: number; commute: number; outdoor: number; cooking: number }; // share of daily dose, 0..1
  co2Kg: number;
  outdoorHour: number;
  commute: Commute;
  /** The day's dose hour by hour (µg/m³ x hours). Sums to the whole day, so a part of the day can be added up consistently. */
  perHour: number[];
}

/** Hour (9-16) with the lowest outdoor PM2.5. */
export function bestHour(hourly: number[]): number {
  let best = 11;
  for (let h = 10; h <= 16; h++) if (pmAt(hourly, h) < pmAt(hourly, best)) best = h;
  return best;
}

export function simulate(hourly: number[], p: Profile, plan: Plan): Sim {
  const commute = plan.swapCommute ?? p.commute;
  const home: Home = plan.sealGaps ? "sealed" : p.home;
  const cooking: Cooking = plan.induction ? "induction" : p.cooking;
  const outdoorHour = plan.shiftOutdoor ? bestHour(hourly) : OUTDOOR_HOUR;
  const infil =
    INFILTRATION[home] * (plan.purifier ? PURIFIER_FACTORS[plan.purifierKind ?? "hepa"] : 1);
  const maskCut = 1 - MASK_EFFECT[plan.mask];
  const legHours = Math.min(1, p.km / SPEED_KMH[commute]);
  const open = OPEN_MODES.includes(commute);

  let indoor = 0,
    comm = 0,
    outd = 0,
    cook = 0;
  const perHour: number[] = [];
  for (let h = 0; h < 24; h++) {
    const out = pmAt(hourly, h);
    let spentIndoors = 1,
      hourDose = 0;
    if (COMMUTE_HOURS.includes(h)) {
      const c = legHours * out * COMMUTE_EXPOSURE[commute] * (open ? maskCut : 1);
      comm += c;
      hourDose += c;
      spentIndoors -= legHours;
    }
    if (h === outdoorHour) {
      const o = OUTDOOR_TIME_H * out * maskCut;
      outd += o;
      hourDose += o;
      spentIndoors -= OUTDOOR_TIME_H;
    }
    const add = COOKING_HOURS.includes(h) ? COOKING_ADD[cooking] : 0;
    const base = Math.max(0, spentIndoors);
    const inBase = base * out * infil;
    const inCook = add; // the person cooking is home for the whole cooking hour, whatever else they do in it
    indoor += inBase;
    cook += inCook;
    hourDose += inBase + inCook;
    perHour.push(hourDose);
  }
  const total = indoor + comm + outd + cook;
  const mean = total / 24;
  const share = (x: number) => (total > 0 ? x / total : 0);
  return {
    meanPm: mean,
    cigs: mean / CIGARETTE_PM,
    parts: {
      indoor: share(indoor),
      commute: share(comm),
      outdoor: share(outd),
      cooking: share(cook),
    },
    co2Kg: (2 * p.km * CO2_G_PER_KM[commute]) / 1000,
    outdoorHour,
    commute,
    perHour,
  };
}

/** Sum of a per-hour series up to `hoursElapsed` (may be fractional: 16.5 counts hour 16 for half). Out-of-range or non-finite input is clamped. */
function sumUntil(series: number[], hoursElapsed: number): number {
  const t = Math.min(series.length, Math.max(0, Number.isFinite(hoursElapsed) ? hoursElapsed : 0));
  const whole = Math.floor(t);
  let sum = 0;
  for (let h = 0; h < whole; h++) sum += pmAt(series, h);
  if (whole < series.length) sum += pmAt(series, whole) * (t - whole);
  return sum;
}

/**
 * Cigarettes' worth of air breathed so far today, from the SAME hourly model as simulate(), so the pieces add up:
 * it is 0 at the start of the day and equals the whole-day figure (simulate().cigs) at hour 24.
 */
export function cigsSoFar(hourly: number[], p: Profile, plan: Plan, hoursElapsed: number): number {
  return sumUntil(simulate(hourly, p, plan).perHour, hoursElapsed) / 24 / CIGARETTE_PM;
}

/**
 * Cigarettes' worth of PM2.5 a person breathes standing outdoors all day in this city at today's levels:
 * the day's mean PM2.5 over the same rule-of-thumb constant (CIGARETTE_PM). City air only, not household-specific.
 */
export function outdoorCigs(hourly: number[]): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hourly.length) / hourly.length / CIGARETTE_PM;
}

/** The same, for the hours elapsed so far today (hoursElapsed can be fractional). */
export function outdoorCigsSoFar(hourly: number[], hoursElapsed: number): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hoursElapsed) / hourly.length / CIGARETTE_PM;
}

export interface ActionResult {
  id: keyof Plan | "mask-n95" | "mask-cloth" | "swap";
  title: string;
  detail: string;
  cost: string;
  savedPm: number;
  savedPct: number;
  savedCigs: number;
  savedCo2Kg: number;
  math: string[];
  apply: (plan: Plan) => Plan;
  isOn: (plan: Plan) => boolean;
  applicable: boolean;
}

const MODE_LABEL: Record<Commute, string> = {
  walk: "walking",
  cycle: "cycling",
  bike: "two-wheeler",
  car: "car",
  ev: "electric car",
  bus: "bus",
  metro: "metro",
};
export const modeLabel = (c: Commute) => MODE_LABEL[c];

/** The commute an "easier on the lungs" swap would move to, or null when the current one is already low-exposure. */
function swapTarget(p: Profile): Commute | null {
  return p.commute === "metro" || p.commute === "walk" || p.commute === "cycle" ? null : "metro";
}

type Saving = Pick<ActionResult, "savedPm" | "savedPct" | "savedCigs" | "savedCo2Kg">;
interface ActionContext {
  hourly: number[];
  p: Profile;
  base: Sim;
  best: number;
  /** The effect of one plan vs doing nothing. */
  solo: (plan: Plan) => Saving;
}
type ActionBuilder = (c: ActionContext) => ActionResult;

const pct = (share: number) => Math.round(share * 100);

const sealGapsAction: ActionBuilder = ({ p, base, best, solo }) => ({
  id: "sealGaps",
  title: "Seal door and window gaps",
  cost: "₹300–800 of weather-strip",
  detail:
    "Tape and strip the gaps, keep windows shut through the smog hours. Open them only around " +
    fmtHour(best) +
    ".",
  ...solo({ ...NO_PLAN, sealGaps: true }),
  applicable: p.home !== "sealed",
  math: [
    `Indoor share of outdoor PM2.5: ${INFILTRATION[p.home]} → ${INFILTRATION.sealed}`,
    `About ${pct(base.parts.indoor)}% of today's dose is breathed indoors`,
  ],
  apply: (pl) => ({ ...pl, sealGaps: true }),
  isOn: (pl) => pl.sealGaps,
});

const purifierAction: ActionBuilder = ({ base, solo }) => ({
  id: "purifier",
  title: "Run an air purifier in the room you use most",
  cost: "₹8,000–15,000, or a ₹2,000 box-fan DIY filter",
  detail: "HEPA unit sized to the room, door closed, on while you are home. Bedroom first.",
  ...solo({ ...NO_PLAN, purifier: true }),
  applicable: true,
  math: [
    `Indoor level keeps ${PURIFIER_FACTOR * 100}% of what gets in`,
    `Indoor exposure ${pct(base.parts.indoor)}% of today's dose, cut by ${pct(1 - PURIFIER_FACTOR)}%`,
  ],
  apply: (pl) => ({ ...pl, purifier: true }),
  isOn: (pl) => pl.purifier,
});

const maskAction: ActionBuilder = ({ solo }) => ({
  id: "mask-n95",
  title: "N95 mask for every trip outside",
  cost: "₹60–120 per mask",
  detail: "Seal it around the nose and chin. Cloth and surgical masks barely stop PM2.5.",
  ...solo({ ...NO_PLAN, mask: "n95" }),
  applicable: true,
  math: [
    `Fit-adjusted filtering: ${MASK_EFFECT.n95 * 100}% (cloth ${MASK_EFFECT.cloth * 100}%)`,
    `Applies to walking, cycling, two-wheeler and bus legs, and outdoor play`,
  ],
  apply: (pl) => ({ ...pl, mask: "n95" }),
  isOn: (pl) => pl.mask === "n95",
});

const shiftOutdoorAction: ActionBuilder = ({ hourly, best, solo }) => ({
  id: "shiftOutdoor",
  title: "Move the family's outdoor time to " + fmtHour(best),
  cost: "Free",
  detail: `Today the air is cleanest around ${fmtHour(best)} (${hourly[best]} µg/m³), not ${fmtHour(OUTDOOR_HOUR)} (${hourly[OUTDOOR_HOUR]} µg/m³).`,
  ...solo({ ...NO_PLAN, shiftOutdoor: true }),
  applicable: true,
  math: [
    `Outdoor PM2.5 at ${fmtHour(OUTDOOR_HOUR)}: ${hourly[OUTDOOR_HOUR]} → at ${fmtHour(best)}: ${hourly[best]} µg/m³`,
    "Half an hour outside, same activity",
  ],
  apply: (pl) => ({ ...pl, shiftOutdoor: true }),
  isOn: (pl) => pl.shiftOutdoor,
});

const swapCommuteAction: ActionBuilder = ({ p, solo }) => {
  const target = swapTarget(p);
  // When no swap helps, the card still shows (as "keep it") against the nearest sensible alternative, so its math stays honest.
  const swapTo: Commute = target ?? (p.commute === "metro" ? "walk" : p.commute);
  const applicable = target !== null;
  return {
    id: "swap",
    title: applicable
      ? `Switch your commute from ${modeLabel(p.commute)} to ${modeLabel(swapTo)}`
      : `Keep your ${modeLabel(p.commute)} commute`,
    cost: applicable ? "Cheaper than a car" : "Already a low-emission choice",
    detail: applicable
      ? `Enclosed, shared transport puts fewer exhaust particles in your lungs and ${Math.round(CO2_G_PER_KM[p.commute] - CO2_G_PER_KM[swapTo])} g less CO₂ per km.`
      : "This is already one of the cleanest ways to travel.",
    ...solo({ ...NO_PLAN, swapCommute: swapTo }),
    applicable,
    math: [
      `In-transit exposure vs outside air: ${COMMUTE_EXPOSURE[p.commute]} → ${COMMUTE_EXPOSURE[swapTo]}`,
      `CO₂: ${CO2_G_PER_KM[p.commute]} → ${CO2_G_PER_KM[swapTo]} g per passenger-km, ${p.km} km each way`,
    ],
    apply: (pl) => ({ ...pl, swapCommute: swapTo }),
    isOn: (pl) => pl.swapCommute !== null,
  };
};

const inductionAction: ActionBuilder = ({ p, solo }) => ({
  id: "induction",
  title: "Cook on induction, or run the hood while cooking",
  cost: "₹2,500 for a single-plate induction",
  detail:
    "Wood and gas flames leave smoke in the kitchen long after the meal. Induction leaves almost none.",
  ...solo({ ...NO_PLAN, induction: true }),
  applicable: p.cooking !== "induction",
  math: [
    `Indoor PM2.5 added while cooking: +${COOKING_ADD[p.cooking]} → +${COOKING_ADD.induction} µg/m³`,
    "Two cooking hours a day",
  ],
  apply: (pl) => ({ ...pl, induction: true }),
  isOn: (pl) => pl.induction,
});

const ACTION_BUILDERS: ActionBuilder[] = [
  sealGapsAction,
  purifierAction,
  maskAction,
  shiftOutdoorAction,
  swapCommuteAction,
  inductionAction,
];

/** Solo effect of each action vs doing nothing, so every card can show its own math. */
export function buildActions(hourly: number[], p: Profile): ActionResult[] {
  const base = simulate(hourly, p, NO_PLAN);
  const solo = (plan: Plan): Saving => {
    const s = simulate(hourly, p, plan);
    return {
      savedPm: base.meanPm - s.meanPm,
      savedPct: base.meanPm > 0 ? (base.meanPm - s.meanPm) / base.meanPm : 0,
      savedCigs: base.cigs - s.cigs,
      savedCo2Kg: base.co2Kg - s.co2Kg,
    };
  };
  const ctx: ActionContext = { hourly, p, base, best: bestHour(hourly), solo };
  return ACTION_BUILDERS.map((build) => build(ctx));
}

export function fmtHour(h: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
}

/** Everything applicable, together. */
export function fullPlan(p: Profile): Plan {
  return {
    purifier: true,
    mask: "n95",
    shiftOutdoor: true,
    swapCommute: swapTarget(p),
    induction: p.cooking !== "induction",
    sealGaps: p.home !== "sealed",
  };
}

export function planSummary(plan: Plan): string[] {
  const out: string[] = [];
  if (plan.sealGaps) out.push("seal gaps");
  if (plan.purifier) out.push("run a purifier");
  if (plan.mask !== "none")
    out.push(plan.mask === "n95" ? "wear N95 outside" : "wear a cloth mask");
  if (plan.shiftOutdoor) out.push("move outdoor time to the cleanest hour");
  if (plan.swapCommute) out.push("switch commute to " + modeLabel(plan.swapCommute));
  if (plan.induction) out.push("cook on induction");
  return out;
}

/** Switch one action on, or back off if it is already in the plan. */
export function toggleAction(plan: Plan, a: ActionResult): Plan {
  if (!a.isOn(plan)) return a.apply(plan);
  switch (a.id) {
    case "sealGaps":
      return { ...plan, sealGaps: false };
    case "purifier":
      return { ...plan, purifier: false, purifierKind: undefined };
    case "mask-n95":
      return { ...plan, mask: "none" };
    case "shiftOutdoor":
      return { ...plan, shiftOutdoor: false };
    case "swap":
      return { ...plan, swapCommute: null };
    case "induction":
      return { ...plan, induction: false };
    default:
      return plan;
  }
}

export type Tone = Category["tone"];
