/** Running totals through the day, from the same hourly model so the pieces add up. */
import { CIGARETTE_PM } from "./factors";
import { pmAt, simulate } from "./simulate";
import type { Plan, Profile } from "./types";

/**
 * Sum of a per-hour series up to `hoursElapsed` (may be fractional: 16.5 counts hour 16 for half).
 * Out-of-range or non-finite input is clamped.
 */
function sumUntil(series: number[], hoursElapsed: number): number {
  const clamped = Math.min(
    series.length,
    Math.max(0, Number.isFinite(hoursElapsed) ? hoursElapsed : 0),
  );
  const whole = Math.floor(clamped);
  let sum = 0;
  for (let h = 0; h < whole; h++) sum += pmAt(series, h);
  if (whole < series.length) sum += pmAt(series, whole) * (clamped - whole);
  return sum;
}

/**
 * Cigarettes' worth of air breathed so far today, from the SAME hourly model as simulate(), so the
 * pieces add up:
 * it is 0 at the start of the day and equals the whole-day figure (simulate().cigs) at hour 24.
 */
export function cigsSoFar(hourly: number[], p: Profile, plan: Plan, hoursElapsed: number): number {
  return sumUntil(simulate(hourly, p, plan).perHour, hoursElapsed) / 24 / CIGARETTE_PM;
}

/**
 * Cigarettes' worth of PM2.5 a person breathes standing outdoors all day in this city at today's levels:
 * the day's mean PM2.5 over the same rule-of-thumb constant (CIGARETTE_PM). City air only, not
 * household-specific.
 */
export function outdoorCigs(hourly: number[]): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hourly.length) / hourly.length / CIGARETTE_PM;
}

/** The same, for the hours elapsed so far today (hoursElapsed can be fractional). */
export function outdoorCigsSoFar(hourly: number[], hoursElapsed: number): number {
  return hourly.length === 0 ? 0 : sumUntil(hourly, hoursElapsed) / hourly.length / CIGARETTE_PM;
}
