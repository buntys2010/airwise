/**
 * Live air for the browser: the hourly PM2.5 loader (Open-Meteo) and an offline estimate curve
 * used only if the feed is unreachable.
 */
import { type City } from "../cities";
import { asRecord, finiteNumber } from "../json";

/** Deterministic 24-hour PM2.5 curve: high before dawn, evening bump, afternoon dip. */
export function estimateHourly(city: City): number[] {
  const out: number[] = [];
  for (let h = 0; h < 24; h++) {
    const morning = Math.exp(-Math.pow((h - 6.5) / 3.2, 2)); // inversion peak ~6:30
    const evening = 0.72 * Math.exp(-Math.pow((h - 20.5) / 2.6, 2)); // traffic + cooking + cold
    const lift = Math.max(morning, evening);
    const wobble = 1 + 0.04 * Math.sin(h * 1.7); // fixed, not random → tests stay deterministic
    out.push(Math.round((city.trough + (city.peak - city.trough) * lift) * wobble));
  }
  return out;
}

export interface AirResult {
  hourly: number[];
  /** "live" only when the numbers came from the live feed just now; otherwise "estimate". */
  source: "live" | "estimate";
  temp: number | null;
  wind: number | null;
  /** HH:MM in India time when the live reading was fetched. */
  updated: string | null;
}

export const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * The time in India (IST): hour, an HH:MM label, and hours elapsed since midnight with minutes as a
 * fraction.
 */
export function istClock(d = new Date()): { hour: number; label: string; elapsed: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return {
    hour,
    label: `${String(hour).padStart(2, "0")}:${minute}`,
    elapsed: hour + Number(minute) / 60,
  };
}

/** Validates the live payload: 24 finite, non-negative PM2.5 values or nothing. */
export function parseHourly(json: unknown): number[] | null {
  const series = asRecord(asRecord(json).hourly).pm2_5;
  if (!Array.isArray(series) || series.length < 24) return null;
  const day = series.slice(0, 24).map(finiteNumber);
  const values = day.filter((value): value is number => value !== null && value >= 0);
  return values.length === 24 ? values.map((value) => Math.round(value)) : null;
}

/**
 * Current temperature (°C) and wind (km/h) from the weather payload, each null when missing or not
 * a number.
 */
export function parseWeather(json: unknown): { temp: number | null; wind: number | null } {
  const current = asRecord(asRecord(json).current);
  const roundedOrNull = (value: unknown) => {
    const number = finiteNumber(value);
    return number === null ? null : Math.round(number);
  };
  return {
    temp: roundedOrNull(current.temperature_2m),
    wind: roundedOrNull(current.wind_speed_10m),
  };
}

/**
 * Live by default: real hourly PM2.5 plus current temperature and wind for the city (Open-Meteo, no key).
 * If the feed is unreachable it returns a clearly labelled "estimate", never a fake "live".
 */
export async function loadAir(city: City, signal?: AbortSignal): Promise<AirResult> {
  const estimate: AirResult = {
    hourly: estimateHourly(city),
    source: "estimate",
    temp: null,
    wind: null,
    updated: null,
  };
  try {
    const query = `latitude=${city.lat}&longitude=${city.lon}&timezone=Asia%2FKolkata`;
    const [airRes, wxRes] = await Promise.all([
      fetch(`${AIR_URL}?${query}&hourly=pm2_5&forecast_days=1`, { signal }),
      fetch(`${WEATHER_URL}?${query}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`, {
        signal,
      }).catch(() => null),
    ]);
    if (!airRes.ok) return estimate;
    const hourly = parseHourly(await airRes.json());
    if (!hourly) return estimate;
    const wx = wxRes?.ok
      ? parseWeather(await wxRes.json().catch(() => null))
      : { temp: null, wind: null };
    return { hourly, source: "live", ...wx, updated: istClock().label };
  } catch {
    return estimate;
  }
}

/** A plain-language read of the weather, derived from live temperature and wind, never invented. */
export function weatherNote(temp: number | null, wind: number | null): string {
  if (wind === null) return "";
  if (wind >= 15) return "A stronger wind is helping to disperse pollution today.";
  if (wind < 8 && temp !== null && temp < 18)
    return "Cold, still air is holding smoke close to the ground.";
  if (wind < 8) return "Light wind means pollution lingers close to where it is made.";
  return "A moderate breeze is thinning the air a little.";
}

/**
 * Which weather sentence applies, as a translation key. `weatherNote` is the English text for the
 * same rule.
 */
export function weatherKey(
  temp: number | null,
  wind: number | null,
): "wx.strong" | "wx.cold" | "wx.light" | "wx.breeze" | null {
  if (wind === null) return null;
  if (wind >= 15) return "wx.strong";
  if (wind < 8 && temp !== null && temp < 18) return "wx.cold";
  if (wind < 8) return "wx.light";
  return "wx.breeze";
}
