/** The fixes a household can make: each action's effect on the day, computed by the exposure model. */
import { t } from "../i18n";
import type { Lang } from "../lang";
import {
  bestHour,
  CO2_G_PER_KM,
  type Commute,
  COMMUTE_EXPOSURE,
  COOKING_ADD,
  INFILTRATION,
  MASK_EFFECT,
  NO_PLAN,
  OUTDOOR_HOUR,
  type Plan,
  pmAt,
  type Profile,
  PURIFIER_FACTOR,
  type Sim,
  simulate,
} from "./model";

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

/** Plain-language name of a commute mode, in the chosen language. */
export const modeLabel = (mode: Commute, lang: Lang = "en"): string => t(lang, `mode.${mode}`);

/**
 * The commute an "easier on the lungs" swap would move to, or null when the current one is already
 * low-exposure.
 */
function swapTarget(p: Profile): Commute | null {
  return p.commute === "metro" || p.commute === "walk" || p.commute === "cycle" ? null : "metro";
}

type Saving = Pick<ActionResult, "savedPm" | "savedPct" | "savedCigs" | "savedCo2Kg">;

interface ActionContext {
  hourly: number[];
  p: Profile;
  base: Sim;
  best: number;
  lang: Lang;
  /** The effect of one plan vs doing nothing. */
  solo: (plan: Plan) => Saving;
}

type ActionBuilder = (c: ActionContext) => ActionResult;

const pct = (share: number) => Math.round(share * 100);

const sealGapsAction: ActionBuilder = ({ p, base, best, lang, solo }) => ({
  id: "sealGaps",
  title: t(lang, "act.sealGaps.title"),
  cost: t(lang, "act.sealGaps.cost"),
  detail: t(lang, "act.sealGaps.detail", { hour: fmtHour(best) }),
  ...solo({ ...NO_PLAN, sealGaps: true }),
  applicable: p.home !== "sealed",
  math: [
    t(lang, "act.sealGaps.math1", { from: INFILTRATION[p.home], to: INFILTRATION.sealed }),
    t(lang, "act.sealGaps.math2", { pct: pct(base.parts.indoor) }),
  ],
  apply: (pl) => ({ ...pl, sealGaps: true }),
  isOn: (pl) => pl.sealGaps,
});

const purifierAction: ActionBuilder = ({ base, lang, solo }) => ({
  id: "purifier",
  title: t(lang, "act.purifier.title"),
  cost: t(lang, "act.purifier.cost"),
  detail: t(lang, "act.purifier.detail"),
  ...solo({ ...NO_PLAN, purifier: true }),
  applicable: true,
  math: [
    t(lang, "act.purifier.math1", { keep: PURIFIER_FACTOR * 100 }),
    t(lang, "act.purifier.math2", { pct: pct(base.parts.indoor), cut: pct(1 - PURIFIER_FACTOR) }),
  ],
  apply: (pl) => ({ ...pl, purifier: true }),
  isOn: (pl) => pl.purifier,
});

const maskAction: ActionBuilder = ({ lang, solo }) => ({
  id: "mask-n95",
  title: t(lang, "act.mask.title"),
  cost: t(lang, "act.mask.cost"),
  detail: t(lang, "act.mask.detail"),
  ...solo({ ...NO_PLAN, mask: "n95" }),
  applicable: true,
  math: [
    t(lang, "act.mask.math1", { n95: MASK_EFFECT.n95 * 100, cloth: MASK_EFFECT.cloth * 100 }),
    t(lang, "act.mask.math2"),
  ],
  apply: (pl) => ({ ...pl, mask: "n95" }),
  isOn: (pl) => pl.mask === "n95",
});

const shiftOutdoorAction: ActionBuilder = ({ hourly, best, lang, solo }) => {
  const hours = {
    best: fmtHour(best),
    bestPm: pmAt(hourly, best),
    usual: fmtHour(OUTDOOR_HOUR),
    usualPm: pmAt(hourly, OUTDOOR_HOUR),
  };
  return {
    id: "shiftOutdoor",
    title: t(lang, "act.shift.title", { hour: hours.best }),
    cost: t(lang, "act.shift.cost"),
    detail: t(lang, "act.shift.detail", hours),
    ...solo({ ...NO_PLAN, shiftOutdoor: true }),
    applicable: true,
    math: [t(lang, "act.shift.math1", hours), t(lang, "act.shift.math2")],
    apply: (pl) => ({ ...pl, shiftOutdoor: true }),
    isOn: (pl) => pl.shiftOutdoor,
  };
};

const swapCommuteAction: ActionBuilder = ({ p, lang, solo }) => {
  const target = swapTarget(p);
  // When no swap helps, the card still shows (as "keep it") against the nearest sensible
  // alternative, so its math stays honest.
  const swapTo: Commute = target ?? (p.commute === "metro" ? "walk" : p.commute);
  const applicable = target !== null;
  const mode = { from: modeLabel(p.commute, lang), to: modeLabel(swapTo, lang) };
  return {
    id: "swap",
    title: t(lang, applicable ? "act.swap.titleSwitch" : "act.swap.titleKeep", mode),
    cost: t(lang, applicable ? "act.swap.costSwitch" : "act.swap.costKeep"),
    detail: applicable
      ? t(lang, "act.swap.detailSwitch", {
          co2: Math.round(CO2_G_PER_KM[p.commute] - CO2_G_PER_KM[swapTo]),
        })
      : t(lang, "act.swap.detailKeep"),
    ...solo({ ...NO_PLAN, swapCommute: swapTo }),
    applicable,
    math: [
      t(lang, "act.swap.math1", {
        from: COMMUTE_EXPOSURE[p.commute],
        to: COMMUTE_EXPOSURE[swapTo],
      }),
      t(lang, "act.swap.math2", {
        from: CO2_G_PER_KM[p.commute],
        to: CO2_G_PER_KM[swapTo],
        km: p.km,
      }),
    ],
    apply: (pl) => ({ ...pl, swapCommute: swapTo }),
    isOn: (pl) => pl.swapCommute !== null,
  };
};

const inductionAction: ActionBuilder = ({ p, lang, solo }) => ({
  id: "induction",
  title: t(lang, "act.induction.title"),
  cost: t(lang, "act.induction.cost"),
  detail: t(lang, "act.induction.detail"),
  ...solo({ ...NO_PLAN, induction: true }),
  applicable: p.cooking !== "induction",
  math: [
    t(lang, "act.induction.math1", { from: COOKING_ADD[p.cooking], to: COOKING_ADD.induction }),
    t(lang, "act.induction.math2"),
  ],
  apply: (pl) => ({ ...pl, induction: true }),
  isOn: (pl) => pl.induction,
});

const ACTION_BUILDERS: ActionBuilder[] = [
  sealGapsAction,
  purifierAction,
  maskAction,
  shiftOutdoorAction,
  swapCommuteAction,
  inductionAction,
];

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

/** A 24-hour clock hour as a 12-hour label, e.g. 15 becomes "3 pm". */
export function fmtHour(h: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
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
