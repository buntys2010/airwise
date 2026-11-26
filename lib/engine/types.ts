/** Shared domain types for the AirWise impact engine. Types only: no runtime code. */

export type Home = "sealed" | "typical" | "leaky";
export type Commute = "walk" | "cycle" | "bike" | "car" | "ev" | "bus" | "metro";
export type Cooking = "wood" | "lpg" | "induction";
export type Mask = "none" | "cloth" | "n95";
export type PurifierKind = "hepa" | "boxfan";

/** The household facts a person gives us once; every number the app shows derives from these. */
export interface Profile {
  home: Home;
  commute: Commute;
  /** One-way commute distance, km. */
  km: number;
  cooking: Cooking;
  /** A child, older adult, or someone with asthma or a heart condition lives here. */
  vulnerable: boolean;
}

/** The set of actions a person has switched on. */
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

export type Tone = "good" | "moderate" | "sensitive" | "unhealthy" | "severe" | "hazardous";

/** An AQI band: how to name it, draw it (icon, never colour alone) and what to do about it. */
export interface Category {
  label: string;
  tone: Tone;
  icon: string;
  advice: string;
}

/** The result of simulating one day for a profile and plan. */
export interface Sim {
  /** Time-weighted personal exposure, µg/m³. */
  meanPm: number;
  /** Cigarettes' worth of PM2.5 breathed over the day. */
  cigs: number;
  /** Share of the daily dose by setting, each 0..1. */
  parts: { indoor: number; commute: number; outdoor: number; cooking: number };
  /** Commute CO₂e for a round trip, kg. */
  co2Kg: number;
  outdoorHour: number;
  commute: Commute;
  /** The day's dose hour by hour (µg/m³ x hours). Sums to the whole day, so a part of the day can be added up consistently. */
  perHour: number[];
}

/** One recommended action with its solo effect and the working behind it. */
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
