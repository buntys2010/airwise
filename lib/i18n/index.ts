/** Translation lookup, and the keys for AQI bands and advice. */
import type { Tone } from "../engine/aqi";
import type { Lang } from "../lang";
import { EN, type Key } from "./en";
import { HI } from "./hi";

/** Re-exported so callers import keys and `t` from one place. */
export type { Key } from "./en";

/**
 * One dictionary for English and Hindi. The Hindi table is typed against the English keys, so a
 * missing key fails the
 * build, and a test checks that placeholders match and that Hindi entries really are Devanagari.
 * Numbers in strings are always ASCII digits so the grounding guard and screen readers behave the
 * same in both languages.
 */
export const DICTS: Record<Lang, Record<Key, string>> = { en: EN, hi: HI };

/** The text for `key` in `lang`, with {placeholders} filled from `vars`. */
export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const text = DICTS[lang][key] ?? EN[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
}

/** Placeholder names in a string, sorted. Used by the parity test. */
export const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .flatMap((m) => (m[1] ? [m[1]] : []))
    .sort((a, b) => a.localeCompare(b));

/** Props for text that is still English inside a Hindi page, so screen readers switch voice correctly. */
export const englishIn = (lang: Lang): { lang?: string } => (lang === "hi" ? { lang: "en" } : {});

/** The speech-recognition and speech-synthesis locale for each language. */
export const SPEECH_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

/** The translation key for each AQI band's name. */
export const CATEGORY_KEY = {
  good: "cat.good",
  moderate: "cat.moderate",
  sensitive: "cat.sensitive",
  unhealthy: "cat.unhealthy",
  severe: "cat.severe",
  hazardous: "cat.hazardous",
} as const;
/** The translation key for each AQI band's advice. */
export const ADVICE_KEY = {
  good: "advice.good",
  moderate: "advice.moderate",
  sensitive: "advice.sensitive",
  unhealthy: "advice.unhealthy",
  severe: "advice.severe",
  hazardous: "advice.hazardous",
} as const;

/** The name of an air-quality band in a language, for text built outside React (chat, share card, MCP). */
export const categoryLabel = (tone: Tone, lang: Lang = "en"): string => t(lang, CATEGORY_KEY[tone]);
