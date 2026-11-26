/** The engine's vocabulary: households, plans and what a simulated day returns. */

/** How well sealed the home is. */
export type Home = "sealed" | "typical" | "leaky";

/** How the household travels, which sets speed and exposure. */
export type Commute = "walk" | "cycle" | "bike" | "car" | "ev" | "bus" | "metro";

/** The cooking fuel, which sets indoor smoke. */
export type Cooking = "wood" | "lpg" | "induction";

/** The mask worn outdoors. */
export type Mask = "none" | "cloth" | "n95";

/** Who the model is computing for. */
export interface Profile {
  home: Home;
  commute: Commute;
  km: number; // one-way
  cooking: Cooking;
  vulnerable: boolean; // child, older adult, asthma/heart condition in the household
}

/** The fixes switched on. Simulated against NO_PLAN to get the saving. */
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

/** A plan with every fix off: the baseline each saving is measured against. */
export const NO_PLAN: Plan = {
  purifier: false,
  mask: "none",
  shiftOutdoor: false,
  swapCommute: null,
  induction: false,
  sealGaps: false,
};

/** The kind of purifier in the plan. */
export type PurifierKind = "hepa" | "boxfan";

/** The result of simulating one day for a profile and plan. */
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
