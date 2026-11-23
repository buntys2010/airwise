/** Server-side air: caches, one in-flight request per city, and batched loading for the map. */
import { createCache } from "../cache";
import { CITIES, type City } from "../cities";
import { pmAt } from "../engine/model";
import { AIR_URL, type AirResult, estimateHourly, loadAir, parseHourly } from "./live";

// -------------------------------------------------------------------------------------------------
// Server-side helpers (used by API routes). The browser has its own live fetch above; these add
// caching and batching.

/** Server air fetches give up quickly: a slow feed must not eat the chat's overall time budget. */
const AIR_TIMEOUT_MS = 3_500;

/**
 * Room for every supported city: a smaller cap would evict entries under mixed traffic and re-hit
 * the air feed.
 */
const airCache = createCache<AirResult>(10 * 60_000, Math.max(200, CITIES.length));

const inflight = new Map<string, Promise<AirResult>>();

/**
 * Live air for one city, cached for 10 minutes with a single in-flight request per city. Estimates
 * are never cached.
 */
export function getCityAir(city: City): Promise<AirResult> {
  const hit = airCache.get(city.id);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(city.id);
  if (pending) return pending;
  const request = loadAir(city, AbortSignal.timeout(AIR_TIMEOUT_MS))
    .then((r) => {
      if (r.source === "live") airCache.set(city.id, r);
      return r;
    })
    .finally(() => inflight.delete(city.id));
  inflight.set(city.id, request);
  return request;
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

/**
 * Open-Meteo returns one object for one location and an array for several. Each entry is validated
 * on its own.
 */
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
