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
export const INFILTRATION: Record<Home, number> = { sealed: 0.35, typical: 0.6, leaky: 0.85 };

export type PurifierKind = "hepa" | "boxfan";

/**
 * Share of indoor PM2.5 that remains while the unit runs. HEPA: right-sized unit. Box fan: a MERV
 * 13 filter taped to a 20-inch fan (DIY, less effective). See docs/methodology.md.
 */
const PURIFIER_FACTORS: Record<PurifierKind, number> = { hepa: 0.4, boxfan: 0.6 };

export const PURIFIER_FACTOR = PURIFIER_FACTORS.hepa;

export const MASK_EFFECT: Record<Mask, number> = { none: 0, cloth: 0.1, n95: 0.6 };

// fit-adjusted
/** In-transit exposure relative to ambient. Enclosed modes shield; open modes do not. */
export const COMMUTE_EXPOSURE: Record<Commute, number> = {
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
export const CO2_G_PER_KM: Record<Commute, number> = {
  walk: 0,
  cycle: 0,
  bike: 35,
  bus: 70,
  car: 150,
  ev: 100,
  metro: 30,
};

/** extra indoor PM2.5 (µg/m³) while cooking, per hour. */
export const COOKING_ADD: Record<Cooking, number> = { wood: 150, lpg: 30, induction: 8 };

export const OUTDOOR_HOUR = 7;

// default family outdoor hour (school run, walk, play)
/** Time outside during the outdoor hour, in hours. */
const OUTDOOR_TIME_H = 0.5;

const COOKING_HOURS = [7, 20];

const COMMUTE_HOURS = [8, 18];

export const CIGARETTE_PM = 22;

/** A number rounded to one decimal, as shown to people and passed to the model. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * One hour of a 24-value series. Series are always 24 long; a missing hour reads as 0 rather than
 * crashing a render.
 */
export const pmAt = (hourly: readonly number[], hour: number): number => hourly[hour] ?? 0;

export interface Sim {
  meanPm: number; // time-weighted personal exposure, µg/m³
  cigs: number;
  parts: { indoor: number; commute: number; outdoor: number; cooking: number }; // share of daily dose, 0..1
  co2Kg: number;
  outdoorHour: number;
  commute: Commute;
  /**
   * The day's dose hour by hour (µg/m³ x hours). Sums to the whole day, so a part of the day can be
   * added up consistently.
   */
  perHour: number[];
}

/** Hour (9-16) with the lowest outdoor PM2.5. */
export function bestHour(hourly: number[]): number {
  let best = 11;
  for (let h = 10; h <= 16; h++) if (pmAt(hourly, h) < pmAt(hourly, best)) best = h;
  return best;
}

/** One day of exposure for a household with a given plan, hour by hour. Pure and deterministic. */
export function simulate(hourly: number[], p: Profile, plan: Plan): Sim {
  const commute = plan.swapCommute ?? p.commute;
  const home: Home = plan.sealGaps ? "sealed" : p.home;
  const cooking: Cooking = plan.induction ? "induction" : p.cooking;
  const outdoorHour = plan.shiftOutdoor ? bestHour(hourly) : OUTDOOR_HOUR;
  const infiltration =
    INFILTRATION[home] * (plan.purifier ? PURIFIER_FACTORS[plan.purifierKind ?? "hepa"] : 1);
  const maskCut = 1 - MASK_EFFECT[plan.mask];
  const legHours = Math.min(1, p.km / SPEED_KMH[commute]);
  const open = OPEN_MODES.includes(commute);

  let indoorDose = 0;
  let commuteDose = 0;
  let outdoorDose = 0;
  let cookingDose = 0;
  const perHour: number[] = [];
  for (let h = 0; h < 24; h++) {
    const out = pmAt(hourly, h);
    let hoursIndoors = 1;
    let hourDose = 0;
    if (COMMUTE_HOURS.includes(h)) {
      const dose = legHours * out * COMMUTE_EXPOSURE[commute] * (open ? maskCut : 1);
      commuteDose += dose;
      hourDose += dose;
      hoursIndoors -= legHours;
    }
    if (h === outdoorHour) {
      const dose = OUTDOOR_TIME_H * out * maskCut;
      outdoorDose += dose;
      hourDose += dose;
      hoursIndoors -= OUTDOOR_TIME_H;
    }
    const cookingAdd = COOKING_HOURS.includes(h) ? COOKING_ADD[cooking] : 0;
    const indoorHourDose = Math.max(0, hoursIndoors) * out * infiltration;
    // The person cooking is home for the whole cooking hour, whatever else they do in it.
    indoorDose += indoorHourDose;
    cookingDose += cookingAdd;
    hourDose += indoorHourDose + cookingAdd;
    perHour.push(hourDose);
  }
  const total = indoorDose + commuteDose + outdoorDose + cookingDose;
  const mean = total / 24;
  const share = (dose: number) => (total > 0 ? dose / total : 0);
  return {
    meanPm: mean,
    cigs: mean / CIGARETTE_PM,
    parts: {
      indoor: share(indoorDose),
      commute: share(commuteDose),
      outdoor: share(outdoorDose),
      cooking: share(cookingDose),
    },
    co2Kg: (2 * p.km * CO2_G_PER_KM[commute]) / 1000,
    outdoorHour,
    commute,
    perHour,
  };
}

/**
 * Sum of a per-hour series up to `hoursElapsed` (may be fractional: 16.5 counts hour 16 for half).
 * Out-of-range or non-finite input is clamped.
 */
function sumUntil(series: number[], hoursElapsed: number): number {
  const clamped = Math.min(
    series.length,
    Math.max(0, Number.isFinite(hoursElapsed) ? hoursElapsed : 0),
  );
  const whole = Math.floor(clamped);
  let sum = 0;
  for (let h = 0; h < whole; h++) sum += pmAt(series, h);
  if (whole < series.length) sum += pmAt(series, whole) * (clamped - whole);
  return sum;
}

/**
 * Cigarettes' worth of air breathed so far today, from the SAME hourly model as simulate(), so the
 * pieces add up:
 * it is 0 at the start of the day and equals the whole-day figure (simulate().cigs) at hour 24.
 */
export function cigsSoFar(hourly: number[], p: Profile, plan: Plan, hoursElapsed: number): number {
  return sumUntil(simulate(hourly, p, plan).perHour, hoursElapsed) / 24 / CIGARETTE_PM;
}

/**
 * Cigarettes' worth of PM2.5 a person breathes standing outdoors all day in this city at today's levels:
 * the day's mean PM2.5 over the same rule-of-thumb constant (CIGARETTE_PM). City air only, not
 * household-specific.
 */
export function outdoorCigs(hourly: number[]): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hourly.length) / hourly.length / CIGARETTE_PM;
}

/** The same, for the hours elapsed so far today (hoursElapsed can be fractional). */
export function outdoorCigsSoFar(hourly: number[], hoursElapsed: number): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hoursElapsed) / hourly.length / CIGARETTE_PM;
}
