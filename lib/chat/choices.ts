/** The household choices a client may send, and strict validation of them. */
import { CITIES, type City } from "../cities";
import {
  type Commute,
  type Cooking,
  type Home,
  type Mask,
  NO_PLAN,
  type Plan,
  type Profile,
  type PurifierKind,
} from "../engine/model";
import { asRecord, isRecord, oneOf } from "../json";
import { type Lang, LANGS } from "../lang";

/** The only thing a client may send about the household: choices from fixed lists. */
export interface Choices {
  city: City;
  profile: Profile;
  plan: Plan;
  lang: Lang;
}

/** Allowed home types, used to validate input from the browser. */
export const HOMES: Home[] = ["sealed", "typical", "leaky"];
/** Allowed commute modes, used to validate input from the browser. */
export const COMMUTES: Commute[] = ["walk", "cycle", "bike", "car", "ev", "bus", "metro"];
/** Allowed cooking fuels, used to validate input from the browser. */
export const COOKINGS: Cooking[] = ["wood", "lpg", "induction"];
const MASKS: Mask[] = ["none", "cloth", "n95"];
const KINDS: PurifierKind[] = ["hepa", "boxfan"];

/** Unknown or malformed fields fall back to "not in the plan", so a bad value can never add an action. */
export function parsePlan(raw: unknown): Plan {
  const fields = asRecord(raw);
  return {
    ...NO_PLAN,
    purifier: fields.purifier === true,
    purifierKind: oneOf(KINDS, fields.purifierKind) ?? undefined,
    mask: oneOf(MASKS, fields.mask) ?? "none",
    shiftOutdoor: fields.shiftOutdoor === true,
    swapCommute: oneOf(COMMUTES, fields.swapCommute),
    induction: fields.induction === true,
    sealGaps: fields.sealGaps === true,
  };
}

/**
 * Validates the household choices a client sends. Anything off-list returns null, so no unchecked
 * value reaches the engine.
 */
export function parseChoices(raw: unknown): Choices | null {
  if (!isRecord(raw)) return null;
  const fields = raw;
  const city = CITIES.find((c) => c.id === fields.city);
  const home = oneOf(HOMES, fields.home),
    commute = oneOf(COMMUTES, fields.commute),
    cooking = oneOf(COOKINGS, fields.cooking);
  const km =
    typeof fields.km === "number" && Number.isFinite(fields.km)
      ? Math.min(60, Math.max(0, fields.km))
      : null;
  if (!city || !home || !commute || !cooking || km === null) return null;
  return {
    city,
    plan: parsePlan(fields.plan),
    lang: oneOf(LANGS, fields.lang) ?? "en",
    profile: { home, commute, km, cooking, vulnerable: fields.vulnerable === true },
  };
}
