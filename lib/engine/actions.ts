/** The fixes a household can make: each action's effect on the day, computed by the exposure model. */
import { t } from "../i18n";
import type { Lang } from "../lang";
import { ACTION_BUILDERS, type ActionContext, type Saving, swapTarget } from "./actionBuilders";
import { type ActionResult, modeLabel } from "./actionTypes";
import { bestHour, NO_PLAN, type Plan, type Profile, simulate } from "./model";

export { type ActionResult, fmtHour, modeLabel } from "./actionTypes";

/**
 * Solo effect of each action vs doing nothing, so every card can show its own math. The card text
 * is in `lang` (English by default, which is also what the chat facts and the MCP tools use).
 */
export function buildActions(hourly: number[], p: Profile, lang: Lang = "en"): ActionResult[] {
  const base = simulate(hourly, p, NO_PLAN);
  const solo = (plan: Plan): Saving => {
    const simulated = simulate(hourly, p, plan);
    return {
      savedPm: base.meanPm - simulated.meanPm,
      savedPct: base.meanPm > 0 ? (base.meanPm - simulated.meanPm) / base.meanPm : 0,
      savedCigs: base.cigs - simulated.cigs,
      savedCo2Kg: base.co2Kg - simulated.co2Kg,
    };
  };
  const facts: ActionContext = { hourly, p, base, best: bestHour(hourly), lang, solo };
  return ACTION_BUILDERS.map((build) => build(facts));
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

/** The plan as short phrases, for the chat context and the plain-language summary. */
export function planSummary(plan: Plan, lang: Lang = "en"): string[] {
  const out: string[] = [];
  if (plan.sealGaps) out.push(t(lang, "planitem.sealGaps"));
  if (plan.purifier) out.push(t(lang, "planitem.purifier"));
  if (plan.mask !== "none")
    out.push(t(lang, plan.mask === "n95" ? "planitem.n95" : "planitem.cloth"));
  if (plan.shiftOutdoor) out.push(t(lang, "planitem.shift"));
  if (plan.swapCommute)
    out.push(t(lang, "planitem.swap", { mode: modeLabel(plan.swapCommute, lang) }));
  if (plan.induction) out.push(t(lang, "planitem.induction"));
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
