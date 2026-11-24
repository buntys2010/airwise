/** The clear-air day: what to do at each key hour, built from dictionary text and the day's PM2.5. */
import { fmtHour, modeLabel } from "./engine/actions";
import { bestHour, OPEN_MODES, OUTDOOR_HOUR, type Profile } from "./engine/model";
import { type Key, t } from "./i18n";
import type { Lang } from "./lang";

/** One time slot in the day: what to do and the air at that hour. */
export interface ScheduleEntry {
  hour: number;
  time: string;
  title: string;
  detail: string;
}

const COOKING_KEY = {
  induction: "sched.cook.induction",
  wood: "sched.cook.wood",
  lpg: "sched.cook.lpg",
} as const satisfies Record<Profile["cooking"], Key>;

/**
 * The household's clear-air day: what to do at each key hour, with the outdoor PM2.5 at that hour.
 * Every number in the text comes from the data, so it can be shown as-is, or handed to Gemini to
 * rephrase under the grounding guard. The wording lives in the dictionaries, so English and Hindi
 * carry the same numbers.
 */
export function buildSchedule(hourly: number[], p: Profile, lang: Lang = "en"): ScheduleEntry[] {
  const best = bestHour(hourly);
  const at = (h: number) => `${hourly[h]} µg/m³`;
  const open = OPEN_MODES.includes(p.commute);
  const entries: ScheduleEntry[] = [];
  const add = (hour: number, title: string, detail: string) =>
    entries.push({ hour, time: fmtHour(hour), title, detail });
  const readout = (hour: number) => ({ at: at(hour), time: fmtHour(hour) });

  add(
    6,
    t(lang, "sched.morning.title"),
    t(lang, "sched.morning.detail", {
      ...readout(6),
      home: t(lang, p.home === "sealed" ? "sched.home.sealed" : "sched.home.leaky"),
    }),
  );

  add(
    7,
    t(lang, p.cooking === "induction" ? "sched.cook.titleInduction" : "sched.cook.titleSmoky"),
    t(lang, COOKING_KEY[p.cooking]),
  );

  add(
    8,
    t(lang, "sched.travel.title", { mode: modeLabel(p.commute, lang) }),
    t(lang, "sched.travel.detail", {
      ...readout(8),
      tip: t(lang, open ? "sched.travel.open" : "sched.travel.closed"),
    }),
  );

  add(
    best,
    t(lang, "sched.best.title", { time: fmtHour(best) }),
    t(lang, "sched.best.detail", {
      ...readout(best),
      nowAt: at(OUTDOOR_HOUR),
      nowTime: fmtHour(OUTDOOR_HOUR),
      extra: p.vulnerable ? t(lang, "sched.best.vulnerable") : "",
    }),
  );

  add(
    18,
    t(lang, "sched.back.title"),
    t(lang, "sched.back.detail", {
      ...readout(18),
      tip: t(lang, open ? "sched.back.open" : "sched.back.closed"),
    }),
  );

  add(20, t(lang, "sched.evening.title"), t(lang, "sched.evening.detail", readout(20)));
  add(22, t(lang, "sched.night.title"), t(lang, "sched.night.detail", readout(22)));

  return entries
    .toSorted((a, b) => a.hour - b.hour)
    .filter((e, i, arr) => arr.findIndex((x) => x.hour === e.hour) === i);
}
