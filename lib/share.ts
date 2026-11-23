import { COMMUTES, COOKINGS, HOMES } from "./chat";
import { CITIES } from "./cities";
import { NO_PLAN, type Plan, type Profile } from "./engine/model";

/**
 * Shareable links carry CHOICES only: a city, four household answers and which fixes are switched
 * on. Never a number.
 * Whoever opens a link gets the numbers recomputed from their own live air data by the engine, so
 * nobody can forge a figure.
 */
export interface SharedChoices {
  city?: string;
  profile?: Partial<Profile>;
  plan?: Plan;
}

/** Short names for the plan flags in a link. */
export const PLAN_IDS = [
  "seal",
  "purifier",
  "boxfan",
  "n95",
  "shift",
  "swap",
  "induction",
] as const;
type PlanId = (typeof PLAN_IDS)[number];

/** The plan as short ids for a share link. Only choices from fixed lists are encoded. */
export function planToIds(plan: Plan): PlanId[] {
  const ids: PlanId[] = [];
  if (plan.sealGaps) ids.push("seal");
  if (plan.purifier) ids.push(plan.purifierKind === "boxfan" ? "boxfan" : "purifier");
  if (plan.mask === "n95") ids.push("n95");
  if (plan.shiftOutdoor) ids.push("shift");
  if (plan.swapCommute) ids.push("swap");
  if (plan.induction) ids.push("induction");
  return ids;
}

function purifierKindOf(set: Set<string>): Plan["purifierKind"] {
  if (set.has("boxfan")) return "boxfan";
  return set.has("purifier") ? "hepa" : undefined;
}

/** A plan from share-link ids. Unknown ids are ignored. */
export function idsToPlan(ids: string[]): Plan {
  const set = new Set(ids);
  return {
    ...NO_PLAN,
    sealGaps: set.has("seal"),
    purifier: set.has("purifier") || set.has("boxfan"),
    purifierKind: purifierKindOf(set),
    mask: set.has("n95") ? "n95" : "none",
    shiftOutdoor: set.has("shift"),
    swapCommute: set.has("swap") ? "metro" : null,
    induction: set.has("induction"),
  };
}

/**
 * The commute swap is a real change only for modes that are not already walk, cycle or metro. Drops
 * it otherwise, so a link or tool call cannot claim a gain the engine's own rules say is not there.
 */
export function sanitizePlan(plan: Plan, commute: Profile["commute"]): Plan {
  return plan.swapCommute && (commute === "walk" || commute === "cycle" || commute === "metro")
    ? { ...plan, swapCommute: null }
    : plan;
}

/** The query string for a share link: city, household and plan choices, never a figure. */
export function encodeChoices(c: { city: string; profile: Profile; plan: Plan }): string {
  const params = new URLSearchParams({
    city: c.city,
    home: c.profile.home,
    commute: c.profile.commute,
    km: String(c.profile.km),
    cooking: c.profile.cooking,
    vulnerable: c.profile.vulnerable ? "1" : "0",
  });
  const ids = planToIds(c.plan);
  if (ids.length) params.set("plan", ids.join(","));
  return params.toString();
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | undefined =>
  v && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/**
 * Reads a query string. Anything outside the fixed lists is dropped, so a hand-edited link can only
 * ever choose from valid options.
 */
export function decodeChoices(search: string): SharedChoices {
  const params = new URLSearchParams(search);
  const out: SharedChoices = {};
  const city = CITIES.find((c) => c.id === params.get("city"));
  if (city) out.city = city.id;
  const profile: Partial<Profile> = {};
  const home = oneOf(HOMES, params.get("home"));
  if (home) profile.home = home;
  const commute = oneOf(COMMUTES, params.get("commute"));
  if (commute) profile.commute = commute;
  const cooking = oneOf(COOKINGS, params.get("cooking"));
  if (cooking) profile.cooking = cooking;
  const km = Number(params.get("km"));
  if (params.get("km") !== null && params.get("km") !== "" && Number.isFinite(km))
    profile.km = Math.min(60, Math.max(0, Math.round(km)));
  const vulnerable = params.get("vulnerable");
  if (vulnerable === "1" || vulnerable === "0") profile.vulnerable = vulnerable === "1";
  if (Object.keys(profile).length) out.profile = profile;
  const planParam = params.get("plan");
  if (planParam) {
    const plan = idsToPlan(
      planParam
        .split(",")
        .slice(0, 20)
        .filter((id) => (PLAN_IDS as readonly string[]).includes(id)),
    );
    // without a commute in the link, the final profile is checked by the caller
    out.plan = profile.commute ? sanitizePlan(plan, profile.commute) : plan;
  }
  return out;
}

/** A full share link for an origin and the user's choices. */
export function shareUrl(
  origin: string,
  c: { city: string; profile: Profile; plan: Plan },
): string {
  const safeOrigin = origin.replace(/[\r\n\0]/g, "").trim();
  return `${safeOrigin}/?${encodeChoices(c)}`;
}

/**
 * A wa.me link that opens WhatsApp with a ready message. The text is words plus the choices-only
 * link, never a figure.
 */
export function whatsappLink(text: string, url: string): string {
  const cleanText = text.replace(/[\r\n]/g, " ").trim();
  const message = `${cleanText} ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
