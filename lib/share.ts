import { COMMUTES, COOKINGS, HOMES } from "./chat";
import { CITIES } from "./data";
import { NO_PLAN, type Plan, type Profile } from "./engine";

/**
 * Shareable links carry CHOICES only: a city, four household answers and which fixes are switched on. Never a number.
 * Whoever opens a link gets the numbers recomputed from their own live air data by the engine, so nobody can forge a figure.
 */
export interface SharedChoices {
  city?: string;
  profile?: Partial<Profile>;
  plan?: Plan;
}

/** Short names for the plan flags in a link. */
export const PLAN_IDS = ["seal", "purifier", "boxfan", "n95", "shift", "swap", "induction"] as const;
type PlanId = (typeof PLAN_IDS)[number];

/** The plan as short ids for a share link. */
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

/** The plan from share-link ids; unknown ids are ignored. */
export function idsToPlan(ids: string[]): Plan {
  const set = new Set(ids);
  return {
    ...NO_PLAN,
    sealGaps: set.has("seal"),
    purifier: set.has("purifier") || set.has("boxfan"),
    purifierKind: set.has("boxfan") ? "boxfan" : set.has("purifier") ? "hepa" : undefined,
    mask: set.has("n95") ? "n95" : "none",
    shiftOutdoor: set.has("shift"),
    swapCommute: set.has("swap") ? "metro" : null,
    induction: set.has("induction"),
  };
}

/** Choices as a query string. Never contains a computed number. */
export function encodeChoices(c: { city: string; profile: Profile; plan: Plan }): string {
  const q = new URLSearchParams({
    city: c.city,
    home: c.profile.home,
    commute: c.profile.commute,
    km: String(c.profile.km),
    cooking: c.profile.cooking,
    vulnerable: c.profile.vulnerable ? "1" : "0",
  });
  const ids = planToIds(c.plan);
  if (ids.length) q.set("plan", ids.join(","));
  return q.toString();
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | undefined =>
  v && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** Reads a query string. Anything outside the fixed lists is dropped, so a hand-edited link can only ever choose from valid options. */
export function decodeChoices(search: string): SharedChoices {
  const q = new URLSearchParams(search);
  const out: SharedChoices = {};
  const city = CITIES.find((c) => c.id === q.get("city"));
  if (city) out.city = city.id;
  const profile: Partial<Profile> = {};
  const home = oneOf(HOMES, q.get("home"));
  if (home) profile.home = home;
  const commute = oneOf(COMMUTES, q.get("commute"));
  if (commute) profile.commute = commute;
  const cooking = oneOf(COOKINGS, q.get("cooking"));
  if (cooking) profile.cooking = cooking;
  const km = Number(q.get("km"));
  if (q.get("km") !== null && q.get("km") !== "" && Number.isFinite(km))
    profile.km = Math.min(60, Math.max(0, Math.round(km)));
  const v = q.get("vulnerable");
  if (v === "1" || v === "0") profile.vulnerable = v === "1";
  if (Object.keys(profile).length) out.profile = profile;
  const planParam = q.get("plan");
  if (planParam)
    out.plan = idsToPlan(
      planParam
        .split(",")
        .slice(0, 20)
        .filter((id) => (PLAN_IDS as readonly string[]).includes(id)),
    );
  return out;
}

/** A share link for the app's origin, carrying choices only. */
export function shareUrl(origin: string, c: { city: string; profile: Profile; plan: Plan }): string {
  const safeOrigin = origin.replace(/[\r\n\0]/g, "").trim();
  return `${safeOrigin}/?${encodeChoices(c)}`;
}

/** A wa.me link that opens WhatsApp with a ready message. The text is words plus the choices-only link, never a figure. */
export function whatsappLink(text: string, url: string): string {
  const cleanText = text.replace(/[\r\n]/g, " ").trim();
  return `https://wa.me/?text=${encodeURIComponent(`${cleanText} ${url}`)}`;
}
