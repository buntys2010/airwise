import { COMMUTES, COOKINGS, HOMES } from "../lib/chat";
import { CITIES, loadAir, type AirResult } from "../lib/data";
import { NO_PLAN, aqiFromPm, bestHour, buildActions, categoryOf, simulate, type Profile } from "../lib/engine";
import { PLAN_IDS, idsToPlan, sanitizePlan } from "../lib/share";

/**
 * The two tools, as plain functions. They use the same engine as the AirWise app, so a number from here is the same number the
 * app shows. They are read-only and store nothing. Errors are structured so an agent can fix its own call.
 */
export interface ToolError {
  code: "invalid_argument" | "missing_argument" | "air_data_unavailable";
  field?: string;
  message: string;
  /** The values that would have been accepted. */
  allowed?: string[];
  /** What to do next, in a sentence an agent can act on. */
  next_step: string;
}
export type Result<T> = { ok: true; data: T } | { ok: false; error: ToolError };

export type LoadAir = (cityId: string) => Promise<AirResult>;
const defaultLoad: LoadAir = (id) => {
  const city = CITIES.find((c) => c.id === id)!;
  return loadAir(city, AbortSignal.timeout(6_000));
};

const CITY_IDS = CITIES.map((c) => c.id);
const fail = (error: ToolError): { ok: false; error: ToolError } => ({ ok: false, error });

function pick<T extends string>(field: string, value: unknown, allowed: readonly T[], required = true): Result<T | undefined> {
  if (value === undefined || value === null || value === "") {
    return required ? fail({ code: "missing_argument", field, message: `${field} is required.`, allowed: [...allowed], next_step: `Call again with ${field} set to one of the allowed values.` }) : { ok: true, data: undefined };
  }
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return { ok: true, data: value as T };
  return fail({ code: "invalid_argument", field, message: `${field} "${String(value).slice(0, 40)}" is not supported.`, allowed: [...allowed], next_step: `Call again with ${field} set to one of the allowed values.` });
}

const note = (a: AirResult) => (a.source === "live" ? "Live hourly PM2.5 from Open-Meteo." : "The live feed was unreachable, so these hourly values are an offline estimate. Say so if you quote them.");

export async function getCityAir(args: { city?: unknown }, load: LoadAir = defaultLoad): Promise<Result<unknown>> {
  const city = pick("city", args.city, CITY_IDS);
  if (!city.ok) return city;
  const info = CITIES.find((c) => c.id === city.data)!;
  const air = await load(info.id).catch(() => null);
  if (!air) return fail({ code: "air_data_unavailable", message: "Air data could not be loaded.", next_step: "Try again in a minute. Do not quote air quality numbers until it succeeds." });
  const nowHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  const pm = air.hourly[nowHour];
  const best = bestHour(air.hourly);
  const worst = air.hourly.indexOf(Math.max(...air.hourly));
  return {
    ok: true,
    data: {
      city: info.id, name: info.name, area: info.area,
      source: air.source, updated_ist: air.updated, note: note(air),
      now_hour_ist: nowHour,
      pm25_now_ugm3: pm, aqi_us_epa_style: aqiFromPm(pm), level: categoryOf(pm).label,
      best_outdoor_hour_ist: best, best_outdoor_pm25_ugm3: air.hourly[best],
      worst_hour_ist: worst, worst_pm25_ugm3: air.hourly[worst],
      hourly_pm25_ugm3: air.hourly,
      units: { pm25: "micrograms per cubic metre (ug/m3)", hours: "0 to 23, India Standard Time" },
    },
  };
}

const PLAN_OF: Record<string, string> = { sealGaps: "seal", purifier: "purifier", "mask-n95": "n95", shiftOutdoor: "shift", swap: "swap", induction: "induction" };

export async function scoreActions(
  args: { city?: unknown; home?: unknown; commute?: unknown; km?: unknown; cooking?: unknown; vulnerable?: unknown; actions?: unknown },
  load: LoadAir = defaultLoad,
): Promise<Result<unknown>> {
  const city = pick("city", args.city, CITY_IDS); if (!city.ok) return city;
  const home = pick("home", args.home, HOMES); if (!home.ok) return home;
  const commute = pick("commute", args.commute, COMMUTES); if (!commute.ok) return commute;
  const cooking = pick("cooking", args.cooking, COOKINGS); if (!cooking.ok) return cooking;
  const km = args.km === undefined ? 8 : Number(args.km);
  if (!Number.isFinite(km) || km < 0 || km > 60) return fail({ code: "invalid_argument", field: "km", message: "km must be a number from 0 to 60 (one-way commute distance in kilometres).", next_step: "Call again with km between 0 and 60, or leave it out for 8." });
  let ids: string[] = [];
  if (args.actions !== undefined) {
    if (!Array.isArray(args.actions)) return fail({ code: "invalid_argument", field: "actions", message: "actions must be a list.", allowed: [...PLAN_IDS], next_step: "Pass a list such as [\"seal\", \"purifier\"], or leave it out for no actions." });
    const bad = args.actions.find((a) => typeof a !== "string" || !(PLAN_IDS as readonly string[]).includes(a));
    if (bad !== undefined) return fail({ code: "invalid_argument", field: "actions", message: `Unknown action "${String(bad).slice(0, 40)}".`, allowed: [...PLAN_IDS], next_step: "Call again with actions chosen from the allowed values." });
    ids = args.actions as string[];
  }
  const air = await load(city.data!).catch(() => null);
  if (!air) return fail({ code: "air_data_unavailable", message: "Air data could not be loaded.", next_step: "Try again in a minute. Do not quote exposure numbers until it succeeds." });

  const profile: Profile = { home: home.data!, commute: commute.data!, km, cooking: cooking.data!, vulnerable: args.vulnerable === true };
  const plan = sanitizePlan(idsToPlan(ids), profile.commute);
  const base = simulate(air.hourly, profile, NO_PLAN), withPlan = simulate(air.hourly, profile, plan);
  return {
    ok: true,
    data: {
      city: city.data, air: { source: air.source, updated_ist: air.updated, note: note(air) },
      household: profile, actions_applied: ids,
      exposure: {
        cigarettes_equivalent_per_day_if_nothing_changes: round1(base.cigs),
        cigarettes_equivalent_per_day_with_actions: round1(withPlan.cigs),
        percent_less_exposure: base.meanPm > 0 ? Math.round(((base.meanPm - withPlan.meanPm) / base.meanPm) * 100) : 0,
        average_personal_pm25_ugm3_if_nothing_changes: Math.round(base.meanPm),
        average_personal_pm25_ugm3_with_actions: Math.round(withPlan.meanPm),
        co2_kg_saved_per_day: round1(base.co2Kg - withPlan.co2Kg),
      },
      each_action_on_its_own: buildActions(air.hourly, profile).map((a) => ({
        id: PLAN_OF[a.id as string] ?? a.id, title: a.title, applicable: a.applicable,
        percent_less_exposure: Math.round(a.savedPct * 100), cigarettes_saved_per_day: round1(a.savedCigs), cost: a.cost,
      })),
      notes: [
        "Cigarettes equivalent is a rule of thumb: about 22 ug/m3 of PM2.5 over a day counts as one cigarette. It is general guidance, not medical advice.",
        "Figures come from a planning model with documented assumptions (docs/methodology.md in the AirWise repository).",
      ],
    },
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
