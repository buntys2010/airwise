/** One builder per fix: its text, its solo effect on the day, and how it changes the plan. */
import { t } from "../i18n";
import type { Lang } from "../lang";
import { type ActionResult, fmtHour, modeLabel } from "./actionTypes";
import {
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
} from "./model";

/**
 * The commute an "easier on the lungs" swap would move to, or null when the current one is already
 * low-exposure.
 */
export function swapTarget(p: Profile): Commute | null {
  return p.commute === "metro" || p.commute === "walk" || p.commute === "cycle" ? null : "metro";
}

export type Saving = Pick<ActionResult, "savedPm" | "savedPct" | "savedCigs" | "savedCo2Kg">;

export interface ActionContext {
  hourly: number[];
  p: Profile;
  base: Sim;
  best: number;
  lang: Lang;
  /** The effect of one plan vs doing nothing. */
  solo: (plan: Plan) => Saving;
}

export type ActionBuilder = (c: ActionContext) => ActionResult;

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

export const ACTION_BUILDERS: ActionBuilder[] = [
  sealGapsAction,
  purifierAction,
  maskAction,
  shiftOutdoorAction,
  swapCommuteAction,
  inductionAction,
];
