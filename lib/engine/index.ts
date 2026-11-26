/**
 * AirWise impact engine. Pure, deterministic, no network.
 * All factors are planning assumptions documented in docs/methodology.md.
 * The LLM never computes numbers: it only explains what this module returns.
 */

export { buildActions } from "./actions";
export { aqiFromPm, categoryOf } from "./category";
export { cigsSoFar, outdoorCigs, outdoorCigsSoFar } from "./cigarettes";
export {
  CIGARETTE_PM,
  CO2_G_PER_KM,
  COMMUTE_EXPOSURE,
  COMMUTE_HOURS,
  COOKING_ADD,
  COOKING_HOURS,
  INFILTRATION,
  MASK_EFFECT,
  NO_PLAN,
  OPEN_MODES,
  OUTDOOR_HOUR,
  PURIFIER_FACTOR,
  PURIFIER_FACTORS,
  SPEED_KMH,
} from "./constants";
export { fmtHour, modeLabel } from "./format";
export { fullPlan, planSummary, toggleAction } from "./plan";
export { bestHour, simulate } from "./simulate";
export type {
  ActionResult,
  Category,
  Commute,
  Cooking,
  Home,
  Mask,
  Plan,
  Profile,
  PurifierKind,
  Sim,
  Tone,
} from "./types";
