/** One simulated day: exposure hour by hour for a household and a plan. */
import {
  CIGARETTE_PM,
  CO2_G_PER_KM,
  COMMUTE_EXPOSURE,
  COMMUTE_HOURS,
  COOKING_ADD,
  COOKING_HOURS,
  INFILTRATION,
  MASK_EFFECT,
  OPEN_MODES,
  OUTDOOR_HOUR,
  OUTDOOR_TIME_H,
  PURIFIER_FACTORS,
  SPEED_KMH,
} from "./factors";
import type { Cooking, Home, Plan, Profile, Sim } from "./types";

/** A number rounded to one decimal, as shown to people and passed to the model. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * One hour of a 24-value series. Series are always 24 long; a missing hour reads as 0 rather than
 * crashing a render.
 */
export const pmAt = (hourly: readonly number[], hour: number): number => hourly[hour] ?? 0;

/** Hour (9-16) with the lowest outdoor PM2.5. */
export function bestHour(hourly: number[]): number {
  let best = 11;
  for (let h = 10; h <= 16; h++) if (pmAt(hourly, h) < pmAt(hourly, best)) best = h;
  return best;
}

/** One day of exposure for a household with a given plan, hour by hour. Pure and deterministic. */
export function simulate(hourly: number[], p: Profile, plan: Plan): Sim {
  const commute = plan.swapCommute ?? p.commute;
  const home: Home = plan.sealGaps ? "sealed" : p.home;
  const cooking: Cooking = plan.induction ? "induction" : p.cooking;
  const outdoorHour = plan.shiftOutdoor ? bestHour(hourly) : OUTDOOR_HOUR;
  const infiltration =
    INFILTRATION[home] * (plan.purifier ? PURIFIER_FACTORS[plan.purifierKind ?? "hepa"] : 1);
  const maskCut = 1 - MASK_EFFECT[plan.mask];
  const legHours = Math.min(1, p.km / SPEED_KMH[commute]);
  const open = OPEN_MODES.includes(commute);

  let indoorDose = 0;
  let commuteDose = 0;
  let outdoorDose = 0;
  let cookingDose = 0;
  const perHour: number[] = [];
  for (let h = 0; h < 24; h++) {
    const out = pmAt(hourly, h);
    let hoursIndoors = 1;
    let hourDose = 0;
    if (COMMUTE_HOURS.includes(h)) {
      const dose = legHours * out * COMMUTE_EXPOSURE[commute] * (open ? maskCut : 1);
      commuteDose += dose;
      hourDose += dose;
      hoursIndoors -= legHours;
    }
    if (h === outdoorHour) {
      const dose = OUTDOOR_TIME_H * out * maskCut;
      outdoorDose += dose;
      hourDose += dose;
      hoursIndoors -= OUTDOOR_TIME_H;
    }
    const cookingAdd = COOKING_HOURS.includes(h) ? COOKING_ADD[cooking] : 0;
    const indoorHourDose = Math.max(0, hoursIndoors) * out * infiltration;
    // The person cooking is home for the whole cooking hour, whatever else they do in it.
    indoorDose += indoorHourDose;
    cookingDose += cookingAdd;
    hourDose += indoorHourDose + cookingAdd;
    perHour.push(hourDose);
  }
  const total = indoorDose + commuteDose + outdoorDose + cookingDose;
  const mean = total / 24;
  const share = (dose: number) => (total > 0 ? dose / total : 0);
  return {
    meanPm: mean,
    cigs: mean / CIGARETTE_PM,
    parts: {
      indoor: share(indoorDose),
      commute: share(commuteDose),
      outdoor: share(outdoorDose),
      cooking: share(cookingDose),
    },
    co2Kg: (2 * p.km * CO2_G_PER_KM[commute]) / 1000,
    outdoorHour,
    commute,
    perHour,
  };
}
