/** What every MCP tool shares: the result and error shapes, argument checks and the air loader. */
import { type AirResult, loadAir } from "../lib/air/live";
import { CITIES } from "../lib/cities";
import { oneOf } from "../lib/json";

/**
 * The two tools, as plain functions. They use the same engine as the AirWise app, so a number from
 * here is the same number the
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
/** A tool's outcome: data, or an error that says what to do next. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: ToolError };

/** How a tool fetches a city's air. Injected so tests need no network. */
export type LoadAir = (cityId: string) => Promise<AirResult>;
export const defaultLoad: LoadAir = (id) => {
  const city = CITIES.find((c) => c.id === id);
  // Callers only pass ids that pick() accepted, and they treat a rejection as "air data unavailable".
  if (!city) return Promise.reject(new Error(`Unknown city id: ${id}`));
  return loadAir(city, AbortSignal.timeout(6_000));
};

export const CITY_IDS = CITIES.map((c) => c.id);
export const fail = (error: ToolError): { ok: false; error: ToolError } => ({ ok: false, error });

/** A short, printable form of whatever the caller sent, for error messages. */
export function shown(value: unknown): string {
  const text = typeof value === "string" ? value : (JSON.stringify(value) ?? "undefined");
  return text.slice(0, 40);
}

export function pick<T extends string>(
  field: string,
  value: unknown,
  allowed: readonly T[],
): Result<T> {
  if (value === undefined || value === null || value === "") {
    return fail({
      code: "missing_argument",
      field,
      message: `${field} is required.`,
      allowed: [...allowed],
      next_step: `Call again with ${field} set to one of the allowed values.`,
    });
  }
  const match = oneOf(allowed, value);
  if (match !== null) return { ok: true, data: match };
  return fail({
    code: "invalid_argument",
    field,
    message: `${field} "${shown(value)}" is not supported.`,
    allowed: [...allowed],
    next_step: `Call again with ${field} set to one of the allowed values.`,
  });
}

export const note = (a: AirResult) =>
  a.source === "live"
    ? "Live hourly PM2.5 from Open-Meteo."
    : "The live feed was unreachable, so these hourly values are an offline estimate. Say so if you quote them.";
