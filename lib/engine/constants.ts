/** Planning assumptions for the impact engine. Sources and ranges: docs/methodology.md. */

import type { Commute, Cooking, Home, Mask, Plan, PurifierKind } from "./types";

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

/** Share of indoor PM2.5 that remains while the unit runs. HEPA: right-sized unit. Box fan: a MERV 13 filter taped to a 20-inch fan (DIY, less effective). */
export const PURIFIER_FACTORS: Record<PurifierKind, number> = { hepa: 0.4, boxfan: 0.6 };
export const PURIFIER_FACTOR = PURIFIER_FACTORS.hepa;

/** Share of particles a mask stops, fit-adjusted. */
export const MASK_EFFECT: Record<Mask, number> = { none: 0, cloth: 0.1, n95: 0.6 };

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
/** Modes where a mask can help, because the traveller breathes outside air directly. */
export const OPEN_MODES: Commute[] = ["walk", "cycle", "bike", "bus"];
/** Average door-to-door speed by mode, km/h. */
export const SPEED_KMH: Record<Commute, number> = {
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
/** Extra indoor PM2.5 (µg/m³) while cooking, per hour. */
export const COOKING_ADD: Record<Cooking, number> = { wood: 150, lpg: 30, induction: 8 };

/** Default family outdoor hour (school run, walk, play). */
export const OUTDOOR_HOUR = 7;
/** Part of the outdoor hour actually spent outside (half an hour). */
export const OUTDOOR_FRACTION = 0.5;
export const COOKING_HOURS = [7, 20];
export const COMMUTE_HOURS = [8, 18];
/** One cigarette per 22 µg/m³ of daily PM2.5 (Berkeley Earth rule of thumb). */
export const CIGARETTE_PM = 22;
export const HOURS_PER_DAY = 24;
/** Window searched for the cleanest outdoor hour (inclusive), and the fallback inside it. */
export const BEST_HOUR_WINDOW = { first: 10, last: 16, fallback: 11 } as const;
