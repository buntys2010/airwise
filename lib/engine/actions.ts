/** The recommended actions: each one's solo effect against doing nothing, with its working shown. */

import {
  CO2_G_PER_KM,
  COMMUTE_EXPOSURE,
  COOKING_ADD,
  INFILTRATION,
  MASK_EFFECT,
  NO_PLAN,
  OUTDOOR_HOUR,
  PURIFIER_FACTOR,
} from "./constants";
import { fmtHour, modeLabel } from "./format";
import { bestHour, simulate } from "./simulate";
import type { ActionResult, Commute, Plan, Profile, Sim } from "./types";

type Effect = Pick<ActionResult, "savedPm" | "savedPct" | "savedCigs" | "savedCo2Kg">;

/** What every builder needs: the household, the day, the do-nothing baseline and a way to test one plan alone. */
interface ActionContext {
  hourly: number[];
  profile: Profile;
  base: Sim;
  bestHour: number;
  solo: (plan: Plan) => Effect;
}

const percent = (share: number): number => Math.round(share * 100);

function makeContext(hourly: number[], profile: Profile): ActionContext {
  const base = simulate(hourly, profile, NO_PLAN);
  const solo = (plan: Plan): Effect => {
    const s = simulate(hourly, profile, plan);
    return {
      savedPm: base.meanPm - s.meanPm,
      savedPct: base.meanPm > 0 ? (base.meanPm - s.meanPm) / base.meanPm : 0,
      savedCigs: base.cigs - s.cigs,
      savedCo2Kg: base.co2Kg - s.co2Kg,
    };
  };
  return { hourly, profile, base, bestHour: bestHour(hourly), solo };
}

/** Commute swaps never apply to walkers, cyclists or metro riders: they are already low-exposure. */
function commuteSwap(p: Profile): { target: Commute; applicable: boolean } {
  const lowExposure = p.commute === "walk" || p.commute === "cycle";
  const applicable = p.commute !== "metro" && !lowExposure;
  let target: Commute = "metro";
  if (p.commute === "metro") target = "walk";
  else if (lowExposure) target = p.commute;
  return { target, applicable };
}

function sealGapsAction({ profile, base, bestHour: best, solo }: ActionContext): ActionResult {
  return {
    id: "sealGaps",
    title: "Seal door and window gaps",
    cost: "₹300–800 of weather-strip",
    detail: `Tape and strip the gaps, keep windows shut through the smog hours. Open them only around ${fmtHour(best)}.`,
    ...solo({ ...NO_PLAN, sealGaps: true }),
    applicable: profile.home !== "sealed",
    math: [
      `Indoor share of outdoor PM2.5: ${INFILTRATION[profile.home]} → ${INFILTRATION.sealed}`,
      `About ${percent(base.parts.indoor)}% of today's dose is breathed indoors`,
    ],
    apply: (pl) => ({ ...pl, sealGaps: true }),
    isOn: (pl) => pl.sealGaps,
  };
}

function purifierAction({ base, solo }: ActionContext): ActionResult {
  return {
    id: "purifier",
    title: "Run an air purifier in the room you use most",
    cost: "₹8,000–15,000, or a ₹2,000 box-fan DIY filter",
    detail: "HEPA unit sized to the room, door closed, on while you are home. Bedroom first.",
    ...solo({ ...NO_PLAN, purifier: true }),
    applicable: true,
    math: [
      `Indoor level keeps ${PURIFIER_FACTOR * 100}% of what gets in`,
      `Indoor exposure ${percent(base.parts.indoor)}% of today's dose, cut by ${percent(1 - PURIFIER_FACTOR)}%`,
    ],
    apply: (pl) => ({ ...pl, purifier: true }),
    isOn: (pl) => pl.purifier,
  };
}

function maskAction({ solo }: ActionContext): ActionResult {
  return {
    id: "mask-n95",
    title: "N95 mask for every trip outside",
    cost: "₹60–120 per mask",
    detail: "Seal it around the nose and chin. Cloth and surgical masks barely stop PM2.5.",
    ...solo({ ...NO_PLAN, mask: "n95" }),
    applicable: true,
    math: [
      `Fit-adjusted filtering: ${MASK_EFFECT.n95 * 100}% (cloth ${MASK_EFFECT.cloth * 100}%)`,
      `Applies to walking, cycling, two-wheeler and bus legs, and outdoor play`,
    ],
    apply: (pl) => ({ ...pl, mask: "n95" }),
    isOn: (pl) => pl.mask === "n95",
  };
}

function shiftOutdoorAction({ hourly, bestHour: best, solo }: ActionContext): ActionResult {
  return {
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
  };
}

function swapCommuteAction({ profile: p, solo }: ActionContext): ActionResult {
  const { target, applicable } = commuteSwap(p);
  const savedGrams = Math.round(CO2_G_PER_KM[p.commute] - CO2_G_PER_KM[target]);
  return {
    id: "swap",
    title: applicable
      ? `Switch your commute from ${modeLabel(p.commute)} to ${modeLabel(target)}`
      : `Keep your ${modeLabel(p.commute)} commute`,
    cost: applicable ? "Cheaper than a car" : "Already a low-emission choice",
    detail: applicable
      ? `Enclosed, shared transport puts fewer exhaust particles in your lungs and ${savedGrams} g less CO₂ per km.`
      : "This is already one of the cleanest ways to travel.",
    ...solo({ ...NO_PLAN, swapCommute: target }),
    applicable,
    math: [
      `In-transit exposure vs outside air: ${COMMUTE_EXPOSURE[p.commute]} → ${COMMUTE_EXPOSURE[target]}`,
      `CO₂: ${CO2_G_PER_KM[p.commute]} → ${CO2_G_PER_KM[target]} g per passenger-km, ${p.km} km each way`,
    ],
    apply: (pl) => ({ ...pl, swapCommute: target }),
    isOn: (pl) => pl.swapCommute !== null,
  };
}

function inductionAction({ profile, solo }: ActionContext): ActionResult {
  return {
    id: "induction",
    title: "Cook on induction, or run the hood while cooking",
    cost: "₹2,500 for a single-plate induction",
    detail:
      "Wood and gas flames leave smoke in the kitchen long after the meal. Induction leaves almost none.",
    ...solo({ ...NO_PLAN, induction: true }),
    applicable: profile.cooking !== "induction",
    math: [
      `Indoor PM2.5 added while cooking: +${COOKING_ADD[profile.cooking]} → +${COOKING_ADD.induction} µg/m³`,
      "Two cooking hours a day",
    ],
    apply: (pl) => ({ ...pl, induction: true }),
    isOn: (pl) => pl.induction,
  };
}

const ACTION_BUILDERS: ((ctx: ActionContext) => ActionResult)[] = [
  sealGapsAction,
  purifierAction,
  maskAction,
  shiftOutdoorAction,
  swapCommuteAction,
  inductionAction,
];

/** Solo effect of each action vs doing nothing, so every card can show its own math. */
export function buildActions(hourly: number[], p: Profile): ActionResult[] {
  const ctx = makeContext(hourly, p);
  return ACTION_BUILDERS.map((build) => build(ctx));
}

/** The commute an "everything" plan switches to, or null when the current one is already low-exposure. */
export function planSwapTarget(p: Profile): Commute | null {
  const { target, applicable } = commuteSwap(p);
  return applicable ? target : null;
}
