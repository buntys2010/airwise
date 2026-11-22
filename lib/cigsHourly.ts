import { CIGARETTE_PM, type Sim } from "./engine";

/**
 * Cigarettes equivalent so far today: the first `hour + 1` hours of the day's exposure, on the same rule of thumb as the daily figure
 * (about 22 µg/m³ of PM2.5 per cigarette a day). A rule of thumb, not a measurement of anyone's health.
 */
export function cigsSoFar(sim: Pick<Sim, "perHour">, hour: number): number {
  const upTo = Math.max(-1, Math.min(23, Math.floor(hour)));
  let sum = 0;
  for (let h = 0; h <= upTo; h++) sum += sim.perHour[h] ?? 0;
  return sum / 24 / CIGARETTE_PM;
}

export interface Stick {
  /** Share of a whole cigarette in this day's figure, 0..1. */
  total: number;
  /** Share already smoked by the chosen hour, 0..total. */
  burned: number;
}

/** One stick per whole cigarette (the last may be partial). `value` is the day's figure and `sofar` the part already used up. */
export function sticksFor(value: number, sofar: number): Stick[] {
  const v = Math.max(0, value);
  const n = Math.max(1, Math.ceil(v - 1e-9));
  const sticks: Stick[] = [];
  for (let i = 0; i < n; i++) {
    const total = Math.min(1, Math.max(0, v - i));
    const burned = Math.min(total, Math.max(0, Math.min(sofar, v) - i));
    sticks.push({ total, burned });
  }
  return sticks;
}
