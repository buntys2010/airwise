/** What an action card carries, and the small helpers its text needs. */
import { t } from "../i18n";
import type { Lang } from "../lang";
import type { Commute, Plan } from "./model";

/** One recommended fix with its cost and the exposure it removes, ready to show. */
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

/** A 24-hour clock hour as a 12-hour label, e.g. 15 becomes "3 pm". */
export function fmtHour(h: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
}
