/** Human-readable labels for engine values. */

import type { Commute } from "./types";

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
export const modeLabel = (c: Commute): string => MODE_LABEL[c];

/** A 24-hour clock hour as "7 am" / "12 pm". */
export function fmtHour(h: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
}
