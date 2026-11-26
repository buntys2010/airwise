/** The deterministic answer used when Gemini is unavailable or its reply fails verification. */
import { type Key, t } from "../i18n";
import type { Lang } from "../lang";
import type { ChatContext } from "./context";

/** An offline topic: the question words that select it (English, and Hindi plus English), and its text. */
interface OfflineRule {
  key: Key;
  en: RegExp;
  hi: RegExp;
}

const OFFLINE_RULES: OfflineRule[] = [
  { key: "offline.mask", en: /mask|n95/u, hi: /mask|n95|मास्क/u },
  { key: "offline.window", en: /window|ventilat|open/u, hi: /window|ventilat|open|खिड़की|हवादार/u },
  {
    key: "offline.purifier",
    en: /purif|filter|hepa/u,
    hi: /purif|filter|hepa|प्यूरीफायर|फ़िल्टर|फिल्टर/u,
  },
  {
    key: "offline.child",
    en: /child|kid|school|baby|asthma|elder/u,
    hi: /child|kid|school|baby|asthma|elder|बच्च|बुज़ुर्ग|बुजुर्ग|दमा|अस्थमा/u,
  },
  {
    key: "offline.cook",
    en: /cook|kitchen|chulha|gas|induction/u,
    hi: /cook|kitchen|chulha|gas|induction|खाना|रसोई|चूल्हा|गैस|इंडक्शन/u,
  },
  {
    key: "offline.commute",
    en: /car|commute|metro|bus|bike|travel/u,
    hi: /car|commute|metro|bus|bike|travel|यात्रा|मेट्रो|बस|गाड़ी|बाइक/u,
  },
];

/**
 * Deterministic answer used when Gemini is unavailable or its reply fails verification. The words
 * come from the dictionary and the facts from the engine, so the grounding guard accepts them.
 */
export function offlineAnswer(q: string, c: ChatContext, lang: Lang = "en"): string {
  const text = q.toLowerCase();
  const rule = OFFLINE_RULES.find((r) => (lang === "hi" ? r.hi : r.en).test(text));
  const hourFallback = rule?.key === "offline.child" ? "offline.hourChild" : "offline.hourWindow";
  return t(lang, rule?.key ?? "offline.general", {
    city: c.city,
    hour: c.bestHour || t(lang, hourFallback),
    category: c.category,
    pm: Math.round(c.pm),
    actions: c.actions.join(", ") || t(lang, "offline.noActions"),
    base: c.baselineCigs.toFixed(1),
    plan: c.planCigs.toFixed(1),
    save: Math.max(0, c.baselineCigs - c.planCigs).toFixed(1),
  });
}
