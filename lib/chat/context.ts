/** The facts a model may use, recomputed on the server from the engine and the air data. */
import { buildActions, fmtHour, planSummary } from "../engine/actions";
import { categoryOf } from "../engine/aqi";
import {
  bestHour,
  cigsSoFar,
  NO_PLAN,
  OUTDOOR_HOUR,
  outdoorCigs,
  outdoorCigsSoFar,
  pmAt,
  round1,
  simulate,
} from "../engine/model";
import { categoryLabel } from "../i18n";
import type { Choices } from "./choices";

/**
 * Everything the model is allowed to know. Built on the SERVER from the user's choices and the
 * engine; never from client numbers.
 */
export interface ChatContext {
  city: string;
  pm: number;
  category: string;
  baselineCigs: number;
  planCigs: number;
  actions: string[];
  vulnerable: boolean;
  bestHour: string;
  home: string;
  commute: string;
  options: { title: string; pct: number; cigs: number }[];
  bestPm: number;
  usualPm: number;
  /** Cigarettes' worth breathed so far today with the plan, from the engine's hourly model. */
  soFar: number;
  /**
   * Cigarettes' worth for a person outdoors all day in this city today, and so far today (city air,
   * not the household).
   */
  outdoorDay: number;
  outdoorSoFar: number;
}

/**
 * The facts for a question, recomputed from the engine and the air data. This is the single way
 * facts are built.
 */
export function buildContext(
  c: Choices,
  hourly: number[],
  nowHour: number,
  elapsed: number = nowHour,
): ChatContext {
  const base = simulate(hourly, c.profile, NO_PLAN);
  const withPlan = simulate(hourly, c.profile, c.plan);
  const best = bestHour(hourly);
  return {
    city: c.city.name,
    pm: pmAt(hourly, nowHour),
    category: categoryLabel(categoryOf(pmAt(hourly, nowHour)).tone),
    baselineCigs: base.cigs,
    planCigs: withPlan.cigs,
    actions: planSummary(c.plan),
    vulnerable: c.profile.vulnerable,
    bestHour: fmtHour(best),
    home: c.profile.home,
    commute: c.profile.commute,
    options: buildActions(hourly, c.profile)
      .filter((a) => a.applicable)
      .map((a) => ({
        title: a.title,
        pct: Math.round(a.savedPct * 100),
        cigs: round1(a.savedCigs),
      })),
    bestPm: pmAt(hourly, best),
    usualPm: pmAt(hourly, OUTDOOR_HOUR),
    soFar: round1(cigsSoFar(hourly, c.profile, c.plan, elapsed)),
    outdoorDay: round1(outdoorCigs(hourly)),
    outdoorSoFar: round1(outdoorCigsSoFar(hourly, elapsed)),
  };
}
