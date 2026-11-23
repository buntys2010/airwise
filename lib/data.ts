/** City list, live-air loader, and an offline estimate curve used only if the live feed is unreachable. */

import { createCache } from "./cache";
import { CITIES, type City } from "./cities";
import { pmAt } from "./engine";
export { CITIES };
export type { City };

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

const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

/** The time in India (IST): hour, an HH:MM label, and hours elapsed since midnight with minutes as a fraction. */
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
  const arr = (json as { hourly?: { pm2_5?: unknown } } | null)?.hourly?.pm2_5;
  if (!Array.isArray(arr) || arr.length < 24) return null;
  const day = arr.slice(0, 24);
  if (day.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)) return null;
  return (day as number[]).map((v) => Math.round(v));
}

/** Current temperature (°C) and wind (km/h) from the weather payload, each null when missing or not a number. */
export function parseWeather(json: unknown): { temp: number | null; wind: number | null } {
  const cur = (json as { current?: { temperature_2m?: unknown; wind_speed_10m?: unknown } } | null)
    ?.current;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
  return { temp: n(cur?.temperature_2m), wind: n(cur?.wind_speed_10m) };
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
    const q = `latitude=${city.lat}&longitude=${city.lon}&timezone=Asia%2FKolkata`;
    const [airRes, wxRes] = await Promise.all([
      fetch(`${AIR_URL}?${q}&hourly=pm2_5&forecast_days=1`, { signal }),
      fetch(`${WEATHER_URL}?${q}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`, {
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

// ---------------------------------------------------------------------------------------------------------------------
// Server-side helpers (used by API routes). The browser has its own live fetch above; these add caching and batching.

/** Server air fetches give up quickly: a slow feed must not eat the chat's overall time budget. */
const AIR_TIMEOUT_MS = 3_500;
/** Room for every supported city: a smaller cap would evict entries under mixed traffic and re-hit the air feed. */
const airCache = createCache<AirResult>(10 * 60_000, Math.max(200, CITIES.length));
const inflight = new Map<string, Promise<AirResult>>();

/** Live air for one city, cached for 10 minutes with a single in-flight request per city. Estimates are never cached. */
export function getCityAir(city: City): Promise<AirResult> {
  const hit = airCache.get(city.id);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(city.id);
  if (pending) return pending;
  const p = loadAir(city, AbortSignal.timeout(AIR_TIMEOUT_MS))
    .then((r) => {
      if (r.source === "live") airCache.set(city.id, r);
      return r;
    })
    .finally(() => inflight.delete(city.id));
  inflight.set(city.id, p);
  return p;
}
/** Test hook: forget cached city air so each test starts clean. */
export const resetAirCache = () => airCache.clear();

export interface MapPoint {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  pm: number;
  source: "live" | "estimate";
}

/** Open-Meteo returns one object for one location and an array for several. Each entry is validated on its own. */
export function parseMapBatch(json: unknown, count: number): (number[] | null)[] {
  const items = Array.isArray(json) ? json : [json];
  return Array.from({ length: count }, (_, i) => parseHourly(items[i]));
}

const mapCache = createCache<MapPoint[]>(10 * 60_000, 1);
/** Cities per request: keeps the URL short, and a failed request only labels its own cities as estimates. */
export const MAP_CHUNK = 50;

/**
 * Current PM2.5 for every city, in batched requests to the air feed, cached for ten minutes on the server.
 * A city whose data is missing or malformed, or whose request failed, is labelled an estimate individually.
 */
export async function loadMap(hour: number, signal?: AbortSignal): Promise<MapPoint[]> {
  const hit = mapCache.get(`map:${hour}`);
  if (hit) return hit;
  const days: (number[] | null)[] = CITIES.map(() => null);
  const chunks: number[][] = [];
  for (let i = 0; i < CITIES.length; i += MAP_CHUNK)
    chunks.push(Array.from({ length: Math.min(MAP_CHUNK, CITIES.length - i) }, (_, k) => i + k));
  await Promise.all(
    chunks.map(async (idx) => {
      try {
        const list = idx.flatMap((i) => CITIES[i] ?? []);
        const url = `${AIR_URL}?latitude=${list.map((c) => c.lat).join(",")}&longitude=${list.map((c) => c.lon).join(",")}&hourly=pm2_5&forecast_days=1&timezone=Asia%2FKolkata`;
        const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(8_000) });
        if (res.ok)
          parseMapBatch(await res.json(), idx.length).forEach((d, k) => {
            const cityIndex = idx[k];
            if (cityIndex !== undefined) days[cityIndex] = d;
          });
      } catch {
        /* this chunk's cities fall back to a labelled estimate */
      }
    }),
  );
  const points: MapPoint[] = CITIES.map((c, i) => {
    const day = days[i];
    return {
      id: c.id,
      name: c.name,
      state: c.state,
      lat: c.lat,
      lon: c.lon,
      pm: pmAt(day ?? estimateHourly(c), hour),
      source: day ? "live" : "estimate",
    };
  });
  if (points.some((p) => p.source === "live")) mapCache.set(`map:${hour}`, points);
  return points;
}

/** Test hook: forget the cached map so each test starts clean. */
export const resetMapCache = () => mapCache.clear();

/** Which weather sentence applies, as a translation key. `weatherNote` is the English text for the same rule. */
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
