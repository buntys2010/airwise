import type { Lang } from "../lang";
import { EN, type Key } from "./en";
import { HI } from "./hi";

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

/**
 * Engine-written action text for the three room fixes, in Hindi. Other action text stays English
 * and is marked lang="en".
 */
export const ACTION_HI: Record<string, { title: string; cost: string }> = {
  sealGaps: { title: "दरवाज़ों और खिड़कियों की दरारें बंद करें", cost: "₹300 से ₹800 की वेदर-स्ट्रिप" },
  induction: { title: "इंडक्शन पर पकाएँ, या पकाते समय हुड चलाएँ", cost: "सिंगल-प्लेट इंडक्शन ₹2,500 का" },
  purifier: {
    title: "जिस कमरे में सबसे ज़्यादा रहते हैं वहाँ एयर प्यूरीफायर चलाएँ",
    cost: "₹8,000 से ₹15,000, या ₹2,000 का बॉक्स-फैन फ़िल्टर",
  },
};

/** Props for text that is still English inside a Hindi page, so screen readers switch voice correctly. */
export const englishIn = (lang: Lang): { lang?: string } => (lang === "hi" ? { lang: "en" } : {});

export const SPEECH_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

export const CATEGORY_KEY = {
  good: "cat.good",
  moderate: "cat.moderate",
  sensitive: "cat.sensitive",
  unhealthy: "cat.unhealthy",
  severe: "cat.severe",
  hazardous: "cat.hazardous",
} as const;
export const ADVICE_KEY = {
  good: "advice.good",
  moderate: "advice.moderate",
  sensitive: "advice.sensitive",
  unhealthy: "advice.unhealthy",
  severe: "advice.severe",
  hazardous: "advice.hazardous",
} as const;
