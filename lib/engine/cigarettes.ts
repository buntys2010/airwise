/** "Cigarettes' worth of air" figures, all built on the same hourly model so the pieces add up. */

import { CIGARETTE_PM, HOURS_PER_DAY } from "./constants";
import { simulate } from "./simulate";
import type { Plan, Profile } from "./types";

/** Clamp a possibly fractional or non-finite elapsed-hours value into 0..max. */
function clampHours(hoursElapsed: number, max: number): number {
  return Math.min(max, Math.max(0, Number.isFinite(hoursElapsed) ? hoursElapsed : 0));
}

/** Sum of the first `t` hours of a per-hour series; the hour in progress counts for the part that has passed. */
function sumUntil(series: number[], t: number): number {
  const whole = Math.floor(t);
  let total = 0;
  for (let h = 0; h < whole; h++) total += series[h];
  if (whole < series.length) total += series[whole] * (t - whole);
  return total;
}

/**
 * Cigarettes' worth of air breathed so far today, from the SAME hourly model as simulate(), so the pieces add up:
 * it is 0 at the start of the day and equals the whole-day figure (simulate().cigs) at hour 24.
 * `hoursElapsed` may be fractional (16.5 means half past four); the current hour counts for the part of it that has passed.
 */
export function cigsSoFar(hourly: number[], p: Profile, plan: Plan, hoursElapsed: number): number {
  const sim = simulate(hourly, p, plan);
  const t = clampHours(hoursElapsed, HOURS_PER_DAY);
  return sumUntil(sim.perHour, t) / HOURS_PER_DAY / CIGARETTE_PM;
}

/**
 * Cigarettes' worth of PM2.5 a person breathes standing outdoors all day in this city at today's levels:
 * the day's mean PM2.5 over the same rule-of-thumb constant (CIGARETTE_PM). City air only, not household-specific.
 */
export function outdoorCigs(hourly: number[]): number {
  if (hourly.length === 0) return 0;
  return hourly.reduce((a, b) => a + b, 0) / hourly.length / CIGARETTE_PM;
}

/** The same, for the hours elapsed so far today (hoursElapsed can be fractional). */
export function outdoorCigsSoFar(hourly: number[], hoursElapsed: number): number {
  if (hourly.length === 0) return 0;
  const t = clampHours(hoursElapsed, hourly.length);
  return sumUntil(hourly, t) / hourly.length / CIGARETTE_PM;
}
