/** The fixes a household can make: each action's effect on the day, computed by the exposure model. */
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

const MODE_LABEL: Record<Commute, string> = {
  walk: "walking",
  cycle: "cycling",
  bike: "two-wheeler",
  car: "car",
  ev: "electric car",
  bus: "bus",
  metro: "metro",
};

/** Plain-language name of a commute mode. */
export const modeLabel = (c: Commute) => MODE_LABEL[c];

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
  /** The effect of one plan vs doing nothing. */
  solo: (plan: Plan) => Saving;
}

type ActionBuilder = (c: ActionContext) => ActionResult;

const pct = (share: number) => Math.round(share * 100);

const sealGapsAction: ActionBuilder = ({ p, base, best, solo }) => ({
  id: "sealGaps",
  title: "Seal door and window gaps",
  cost: "₹300–800 of weather-strip",
  detail: `Tape and strip the gaps, keep windows shut through the smog hours. Open them only around ${fmtHour(best)}.`,
  ...solo({ ...NO_PLAN, sealGaps: true }),
  applicable: p.home !== "sealed",
  math: [
    `Indoor share of outdoor PM2.5: ${INFILTRATION[p.home]} → ${INFILTRATION.sealed}`,
    `About ${pct(base.parts.indoor)}% of today's dose is breathed indoors`,
  ],
  apply: (pl) => ({ ...pl, sealGaps: true }),
  isOn: (pl) => pl.sealGaps,
});

const purifierAction: ActionBuilder = ({ base, solo }) => ({
  id: "purifier",
  title: "Run an air purifier in the room you use most",
  cost: "₹8,000–15,000, or a ₹2,000 box-fan DIY filter",
  detail: "HEPA unit sized to the room, door closed, on while you are home. Bedroom first.",
  ...solo({ ...NO_PLAN, purifier: true }),
  applicable: true,
  math: [
    `Indoor level keeps ${PURIFIER_FACTOR * 100}% of what gets in`,
    `Indoor exposure ${pct(base.parts.indoor)}% of today's dose, cut by ${pct(1 - PURIFIER_FACTOR)}%`,
  ],
  apply: (pl) => ({ ...pl, purifier: true }),
  isOn: (pl) => pl.purifier,
});

const maskAction: ActionBuilder = ({ solo }) => ({
  id: "mask-n95",
  title: "N95 mask for every trip outside",
  cost: "₹60–120 per mask",
  detail: "Seal it around the nose and chin. Cloth and surgical masks barely stop PM2.5.",
  ...solo({ ...NO_PLAN, mask: "n95" }),
  applicable: true,
  math: [
    `Fit-adjusted filtering: ${MASK_EFFECT.n95 * 100}% (cloth ${MASK_EFFECT.cloth * 100}%)`,
    "Applies to walking, cycling, two-wheeler and bus legs, and outdoor play",
  ],
  apply: (pl) => ({ ...pl, mask: "n95" }),
  isOn: (pl) => pl.mask === "n95",
});

const shiftOutdoorAction: ActionBuilder = ({ hourly, best, solo }) => ({
  id: "shiftOutdoor",
  title: `Move the family's outdoor time to ${fmtHour(best)}`,
  cost: "Free",
  detail: `Today the air is cleanest around ${fmtHour(best)} (${hourly[best]} µg/m³), not ${fmtHour(OUTDOOR_HOUR)} (${hourly[OUTDOOR_HOUR]} µg/m³).`,
  ...solo({ ...NO_PLAN, shiftOutdoor: true }),
  applicable: true,
  math: [
    `Outdoor PM2.5 at ${fmtHour(OUTDOOR_HOUR)}: ${hourly[OUTDOOR_HOUR]} → at ${fmtHour(best)}: ${hourly[best]} µg/m³`,
    "Half an hour outside, same activity",
  ],
  apply: (pl) => ({ ...pl, shiftOutdoor: true }),
  isOn: (pl) => pl.shiftOutdoor,
});

const swapCommuteAction: ActionBuilder = ({ p, solo }) => {
  const target = swapTarget(p);
  // When no swap helps, the card still shows (as "keep it") against the nearest sensible
  // alternative, so its math stays honest.
  const swapTo: Commute = target ?? (p.commute === "metro" ? "walk" : p.commute);
  const applicable = target !== null;
  return {
    id: "swap",
    title: applicable
      ? `Switch your commute from ${modeLabel(p.commute)} to ${modeLabel(swapTo)}`
      : `Keep your ${modeLabel(p.commute)} commute`,
    cost: applicable ? "Cheaper than a car" : "Already a low-emission choice",
    detail: applicable
      ? `Enclosed, shared transport puts fewer exhaust particles in your lungs and ${Math.round(CO2_G_PER_KM[p.commute] - CO2_G_PER_KM[swapTo])} g less CO₂ per km.`
      : "This is already one of the cleanest ways to travel.",
    ...solo({ ...NO_PLAN, swapCommute: swapTo }),
    applicable,
    math: [
      `In-transit exposure vs outside air: ${COMMUTE_EXPOSURE[p.commute]} → ${COMMUTE_EXPOSURE[swapTo]}`,
      `CO₂: ${CO2_G_PER_KM[p.commute]} → ${CO2_G_PER_KM[swapTo]} g per passenger-km, ${p.km} km each way`,
    ],
    apply: (pl) => ({ ...pl, swapCommute: swapTo }),
    isOn: (pl) => pl.swapCommute !== null,
  };
};

const inductionAction: ActionBuilder = ({ p, solo }) => ({
  id: "induction",
  title: "Cook on induction, or run the hood while cooking",
  cost: "₹2,500 for a single-plate induction",
  detail:
    "Wood and gas flames leave smoke in the kitchen long after the meal. Induction leaves almost none.",
  ...solo({ ...NO_PLAN, induction: true }),
  applicable: p.cooking !== "induction",
  math: [
    `Indoor PM2.5 added while cooking: +${COOKING_ADD[p.cooking]} → +${COOKING_ADD.induction} µg/m³`,
    "Two cooking hours a day",
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

/** Solo effect of each action vs doing nothing, so every card can show its own math. */
export function buildActions(hourly: number[], p: Profile): ActionResult[] {
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
  const ctx: ActionContext = { hourly, p, base, best: bestHour(hourly), solo };
  return ACTION_BUILDERS.map((build) => build(ctx));
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
export function planSummary(plan: Plan): string[] {
  const out: string[] = [];
  if (plan.sealGaps) out.push("seal gaps");
  if (plan.purifier) out.push("run a purifier");
  if (plan.mask !== "none")
    out.push(plan.mask === "n95" ? "wear N95 outside" : "wear a cloth mask");
  if (plan.shiftOutdoor) out.push("move outdoor time to the cleanest hour");
  if (plan.swapCommute) out.push(`switch commute to ${modeLabel(plan.swapCommute)}`);
  if (plan.induction) out.push("cook on induction");
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
