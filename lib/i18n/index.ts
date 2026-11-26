import type { Lang } from "../chat";
import { EN, type Key } from "./en";
import { HI } from "./hi";

/** Translation lookup, language-aware helpers and the shared Hindi action text. See en.ts and hi.ts for the dictionaries. */

export { EN, HI, type Key };

export const DICTS: Record<Lang, Record<Key, string>> = { en: EN, hi: HI };

/** Looks up a string in a language, falling back to English, and fills {placeholders}. */
export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const text = DICTS[lang][key] ?? EN[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
}

/** Placeholder names in a string, sorted. Used by the parity test. */
export const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Engine-written action text for the three room fixes, in Hindi. Other action text stays English and is marked lang="en". */
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
