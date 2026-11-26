/** Hour-by-hour exposure simulation for one day. Pure and deterministic. */

import {
  BEST_HOUR_WINDOW,
  CIGARETTE_PM,
  CO2_G_PER_KM,
  COMMUTE_EXPOSURE,
  COMMUTE_HOURS,
  COOKING_ADD,
  COOKING_HOURS,
  HOURS_PER_DAY,
  INFILTRATION,
  MASK_EFFECT,
  OPEN_MODES,
  OUTDOOR_FRACTION,
  OUTDOOR_HOUR,
  PURIFIER_FACTORS,
  SPEED_KMH,
} from "./constants";
import type { Commute, Cooking, Home, Plan, Profile, Sim } from "./types";

/** Hour (10-16) with the lowest outdoor PM2.5. */
export function bestHour(hourly: number[]): number {
  let best: number = BEST_HOUR_WINDOW.fallback;
  for (let h = BEST_HOUR_WINDOW.first; h <= BEST_HOUR_WINDOW.last; h++) {
    if (hourly[h] < hourly[best]) best = h;
  }
  return best;
}

/** Everything about the day that does not change from hour to hour. */
interface DayContext {
  hourly: number[];
  commute: Commute;
  cooking: Cooking;
  outdoorHour: number;
  /** Indoor share of outdoor PM2.5 after sealing and filtering. */
  infiltration: number;
  /** Share of outdoor PM2.5 that still gets through the mask. */
  maskPassThrough: number;
  /** Hours spent on one commute leg, capped at one hour. */
  legHours: number;
  isOpenCommute: boolean;
}

/** The dose from each setting in one hour. */
interface HourDose {
  indoor: number;
  commute: number;
  outdoor: number;
  cooking: number;
}

function buildContext(hourly: number[], p: Profile, plan: Plan): DayContext {
  const commute = plan.swapCommute ?? p.commute;
  const home: Home = plan.sealGaps ? "sealed" : p.home;
  const purifierFactor = plan.purifier ? PURIFIER_FACTORS[plan.purifierKind ?? "hepa"] : 1;
  return {
    hourly,
    commute,
    cooking: plan.induction ? "induction" : p.cooking,
    outdoorHour: plan.shiftOutdoor ? bestHour(hourly) : OUTDOOR_HOUR,
    infiltration: INFILTRATION[home] * purifierFactor,
    maskPassThrough: 1 - MASK_EFFECT[plan.mask],
    legHours: Math.min(1, p.km / SPEED_KMH[commute]),
    isOpenCommute: OPEN_MODES.includes(commute),
  };
}

/** Dose breathed in one hour, split by where it was breathed. */
function doseForHour(h: number, ctx: DayContext): HourDose {
  const outside = ctx.hourly[h];
  let indoorHours = 1;
  let commute = 0;
  let outdoor = 0;
  if (COMMUTE_HOURS.includes(h)) {
    const mask = ctx.isOpenCommute ? ctx.maskPassThrough : 1;
    commute = ctx.legHours * outside * COMMUTE_EXPOSURE[ctx.commute] * mask;
    indoorHours -= ctx.legHours;
  }
  if (h === ctx.outdoorHour) {
    outdoor = OUTDOOR_FRACTION * outside * ctx.maskPassThrough;
    indoorHours -= OUTDOOR_FRACTION;
  }
  // The person cooking is home for the whole cooking hour, whatever else they do in it.
  const cooking = COOKING_HOURS.includes(h) ? COOKING_ADD[ctx.cooking] : 0;
  const indoor = Math.max(0, indoorHours) * outside * ctx.infiltration;
  return { indoor, commute, outdoor, cooking };
}

const sumDose = (d: HourDose): number => d.indoor + d.commute + d.outdoor + d.cooking;

/** Simulate one day of exposure for a profile and plan from 24 hourly outdoor PM2.5 values. */
export function simulate(hourly: number[], p: Profile, plan: Plan): Sim {
  const ctx = buildContext(hourly, p, plan);
  const totals: HourDose = { indoor: 0, commute: 0, outdoor: 0, cooking: 0 };
  const perHour: number[] = [];
  for (let h = 0; h < HOURS_PER_DAY; h++) {
    const dose = doseForHour(h, ctx);
    totals.indoor += dose.indoor;
    totals.commute += dose.commute;
    totals.outdoor += dose.outdoor;
    totals.cooking += dose.cooking;
    perHour.push(sumDose(dose));
  }
  const total = sumDose(totals);
  const mean = total / HOURS_PER_DAY;
  const share = (x: number) => (total > 0 ? x / total : 0);
  return {
    meanPm: mean,
    cigs: mean / CIGARETTE_PM,
    parts: {
      indoor: share(totals.indoor),
      commute: share(totals.commute),
      outdoor: share(totals.outdoor),
      cooking: share(totals.cooking),
    },
    co2Kg: (2 * p.km * CO2_G_PER_KM[ctx.commute]) / 1000,
    outdoorHour: ctx.outdoorHour,
    commute: ctx.commute,
    perHour,
  };
}
