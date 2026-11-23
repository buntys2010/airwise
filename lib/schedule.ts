import { OUTDOOR_HOUR, bestHour, fmtHour, modeLabel, OPEN_MODES, type Profile } from "./engine";

export interface ScheduleEntry {
  hour: number;
  time: string;
  title: string;
  detail: string;
}

/**
 * A deterministic "clear-air day" for this household: what to do at each key hour, with the live outdoor PM2.5 at that hour.
 * Every number in the text comes from the data, so it can be shown as-is, or handed to Gemini to rephrase under the grounding guard.
 */
const COOKING_ADVICE: Record<Profile["cooking"], string> = {
  induction: "Induction adds almost no smoke indoors. Run the hood anyway.",
  wood: "Wood and coal smoke is the largest indoor source. Switch to induction if you can, and ventilate the kitchen while you cook.",
  lpg: "Gas leaves smoke in the kitchen. Run the chimney or crack a window by the stove while you cook, then close it.",
};

/** The household's clear-air day: what to do at each key hour, with the outdoor PM2.5 at that hour. */
export function buildSchedule(hourly: number[], p: Profile): ScheduleEntry[] {
  const best = bestHour(hourly);
  const at = (h: number) => `${hourly[h]} µg/m³`;
  const open = OPEN_MODES.includes(p.commute);
  const sensitive = p.vulnerable ? " Keep it short for the child or older adult." : "";
  const entries: ScheduleEntry[] = [];
  const add = (hour: number, title: string, detail: string) =>
    entries.push({ hour, time: fmtHour(hour), title, detail });

  add(
    6,
    "Keep windows shut and start the purifier",
    `Outdoor PM2.5 is ${at(6)} at ${fmtHour(6)}, one of the heavier hours. ${p.home === "sealed" ? "Your home is already well sealed." : "Seal gaps with weather-strip."} Run the purifier in the room you use most.`,
  );

  add(
    7,
    p.cooking === "induction" ? "Cook as usual" : "Cook with less smoke",
    COOKING_ADVICE[p.cooking],
  );

  add(
    8,
    `Travel the cleaner way (${modeLabel(p.commute)})`,
    `Outdoor PM2.5 is ${at(8)} at ${fmtHour(8)}. ${open ? "Wear a fitted N95 for the whole trip." : "Keep the windows up and the air on recirculate."} Metro or a shared ride cuts exposure and emissions.`,
  );

  add(
    best,
    `Your cleanest hour (${fmtHour(best)})`,
    `Outdoor PM2.5 falls to ${at(best)} at ${fmtHour(best)}, against ${at(OUTDOOR_HOUR)} at ${fmtHour(OUTDOOR_HOUR)}. Move the walk or play outside to this window, and air the home for a few minutes.${sensitive}`,
  );

  add(
    18,
    "Head home protected",
    `Outdoor PM2.5 is ${at(18)} at ${fmtHour(18)}. ${open ? "Put the N95 back on for the trip home." : "Stay in your enclosed ride."}`,
  );

  add(
    20,
    "Cook and wind down with the door closed",
    `Outdoor PM2.5 is ${at(20)} at ${fmtHour(20)}, when evening smoke builds. Keep windows shut and let the purifier run.`,
  );

  add(
    22,
    "Sleep with the purifier on",
    `Outdoor PM2.5 is ${at(22)} at ${fmtHour(22)}. Close the bedroom door and keep the purifier running through the night.`,
  );

  return entries
    .toSorted((a, b) => a.hour - b.hour)
    .filter((e, i, arr) => arr.findIndex((x) => x.hour === e.hour) === i);
}
