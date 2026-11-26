/** Building, describing and editing a plan of actions. */

import { planSwapTarget } from "./actions";
import { modeLabel } from "./format";
import type { ActionResult, Plan, Profile } from "./types";

/** Everything applicable, together. */
export function fullPlan(p: Profile): Plan {
  return {
    purifier: true,
    mask: "n95",
    shiftOutdoor: true,
    swapCommute: planSwapTarget(p),
    induction: p.cooking !== "induction",
    sealGaps: p.home !== "sealed",
  };
}

/** The plan as short, speakable phrases. */
export function planSummary(plan: Plan): string[] {
  const out: string[] = [];
  if (plan.sealGaps) out.push("seal gaps");
  if (plan.purifier) out.push("run a purifier");
  if (plan.mask !== "none") out.push(plan.mask === "n95" ? "wear N95 outside" : "wear a cloth mask");
  if (plan.shiftOutdoor) out.push("move outdoor time to the cleanest hour");
  if (plan.swapCommute) out.push("switch commute to " + modeLabel(plan.swapCommute));
  if (plan.induction) out.push("cook on induction");
  return out;
}

/** The plan with one action switched off. */
function withoutAction(plan: Plan, id: ActionResult["id"]): Plan {
  switch (id) {
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

/** Switch one action on, or back off if it is already in the plan. */
export function toggleAction(plan: Plan, a: ActionResult): Plan {
  return a.isOn(plan) ? withoutAction(plan, a.id) : a.apply(plan);
}
