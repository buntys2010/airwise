/**
 * Numeric grounding guard.
 *
 * Language models can state fluent, confident numbers that are simply wrong. AirWise's rule is that the model may
 * only restate numbers that our deterministic engine computed for this user. This module extracts every number in a
 * model's reply and checks that each one appears in the facts we supplied. Any stray number rejects the reply, and the
 * caller falls back to the deterministic answer.
 */

/** Numbers that are part of names, not claims: PM2.5, N95, MERV 13. */
const NAMES = [2.5, 95, 13];
const TOLERANCE = 0.051; // allows 3.74 to be written as 3.7

/** Devanagari digits (०-९) written by a model in Hindi become ASCII so the same checks apply. */
function normaliseDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}

/** Every number in a text as a value. Thousands separators and Devanagari digits are normalised first. */
export function extractNumbers(text: string): number[] {
  const flat = normaliseDigits(text).replace(/(\d),(?=\d{3}\b)/g, "$1");
  return (flat.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(Number.isFinite);
}

/** Collects every number found in numbers and strings anywhere inside `facts`. */
export function allowedNumbers(facts: unknown): number[] {
  const out = new Set<number>(NAMES);
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      // A model may round honestly: 3.74 can be written 3.7 or 4.
      out.add(v);
      out.add(Math.round(v));
      out.add(Math.round(v * 10) / 10);
    } else if (typeof v === "string") extractNumbers(v).forEach((n) => out.add(n));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(facts);
  return [...out];
}

/** Numbers in `text` that cannot be traced to `facts`. Empty means the text is grounded. */
export function ungroundedNumbers(text: string, facts: unknown): number[] {
  const allowed = allowedNumbers(facts);
  return extractNumbers(text).filter((n) => !allowed.some((a) => Math.abs(a - n) <= TOLERANCE));
}

/** True when every number in `text` can be traced to `facts`. */
export const isGrounded = (text: string, facts: unknown): boolean =>
  ungroundedNumbers(text, facts).length === 0;

/**
 * Second layer: unsupported attributions. A supplied number can still be misused ("53% of people choose it").
 * AirWise supplies no studies, experts or population statistics, so any text that cites one is making an ungrounded claim.
 */
const ATTRIBUTIONS: RegExp[] = [
  // Hindi: studies, research, experts, scientists, surveys, doctors claiming, AIIMS, ICMR
  /(अध्ययन|शोध|अनुसंधान|विशेषज्ञ|वैज्ञानिक|सर्वे|सर्वेक्षण|डॉक्टरों ने|डॉक्टरों के अनुसार|चिकित्सकों ने|एम्स|आईसीएमआर)/,
  /\d{1,9}(?:\.\d{1,9})?\s?%\s+(?:लोग|परिवार|उपयोगकर्ता|मरीज़|मरीज|बच्चे)/,
  /(?:ज़्यादातर|ज्यादातर|अधिकतर|अधिकांश|करोड़ों)\s+(?:लोग|परिवार|उपयोगकर्ता)/,
  /\b(studies|research|surveys?|scientists?|experts?|clinical|peer-reviewed|trials?)\b/i,
  /\bdoctors?\s+(?:say|said|claim|claimed|recommend|recommended|suggest|suggested|advise|advised)\b/i,
  /\b(WHO|CPCB|EPA|CDC|ICMR|AIIMS|MoHFW|Lancet)\b/,
  /\d{1,9}(?:\.\d{1,9})?\s?%\s+of\s+(?:all\s+)?(?:people|users|families|households|adults|children|residents|patients|deaths|cases)\b/i,
  /\b(?:most|many|majority of|millions of)\s+(?:people|families|users|households)\b/i,
];

/** Phrases in `text` that cite studies, experts or population statistics the app never supplied. */
export function unsupportedClaims(text: string): string[] {
  const t = normaliseDigits(text);
  return ATTRIBUTIONS.map((re) => re.exec(t)?.[0]).filter((m): m is string => Boolean(m));
}

export interface Verdict {
  ok: boolean;
  numbers: number[];
  claims: string[];
}

/** Both layers together. `ok` means safe to show as a verified answer. */
export function verify(text: string, facts: unknown): Verdict {
  const numbers = ungroundedNumbers(text, facts);
  const claims = unsupportedClaims(text);
  return { ok: numbers.length === 0 && claims.length === 0, numbers, claims };
}
