import { CITIES } from "./data";
import type { City } from "./model";

export { CITIES } from "./data";
export { type City, type Zone, ZONE_LEVELS } from "./model";

/** The city shown when an id is unknown. The list is never empty, so this always exists. */
export const FALLBACK_CITY: City =
  CITIES[0] ??
  (() => {
    throw new Error("CITIES must not be empty");
  })();

/** India's bounding box, for a sanity check on every position. */
export const INDIA_BOUNDS = { latMin: 6, latMax: 37.2, lonMin: 68, lonMax: 97.6 };

const squash = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * City search: matches the name, any other name (Bombay, Madras...) or the state, ignoring case and
 * punctuation.
 */
export function searchCities(query: string, list: City[] = CITIES): City[] {
  const squashed = squash(query);
  if (!squashed) return list;
  const score = (cty: City): number => {
    const name = squash(cty.name),
      aka = (cty.aka ?? []).map(squash),
      state = squash(cty.state);
    if (name === squashed || aka.includes(squashed)) return 0;
    if (name.startsWith(squashed) || aka.some((a) => a.startsWith(squashed))) return 1;
    if (name.includes(squashed) || aka.some((a) => a.includes(squashed))) return 2;
    if (state.startsWith(squashed)) return 3;
    if (state.includes(squashed)) return 4;
    return 99;
  };
  return list
    .map((cty) => ({ cty, s: score(cty) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.cty.name.localeCompare(b.cty.name))
    .map((x) => x.cty);
}
