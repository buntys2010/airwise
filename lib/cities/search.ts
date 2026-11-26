/** City search. */

import { CITIES } from "./data";
import type { City } from "./types";

const squash = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** City search: matches the name, any other name (Bombay, Madras...) or the state, ignoring case and punctuation. */
export function searchCities(query: string, list: City[] = CITIES): City[] {
  const q = squash(query);
  if (!q) return list;
  const score = (cty: City): number => {
    const name = squash(cty.name),
      aka = (cty.aka ?? []).map(squash),
      state = squash(cty.state);
    if (name === q || aka.includes(q)) return 0;
    if (name.startsWith(q) || aka.some((a) => a.startsWith(q))) return 1;
    if (name.includes(q) || aka.some((a) => a.includes(q))) return 2;
    if (state.startsWith(q)) return 3;
    if (state.includes(q)) return 4;
    return 99;
  };
  return list
    .map((cty) => ({ cty, s: score(cty) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.cty.name.localeCompare(b.cty.name))
    .map((x) => x.cty);
}
