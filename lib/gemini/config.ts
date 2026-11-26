/** Which models to call, how to configure each call, and the default time and call limits. */
import type { GenerateOptions } from "./types";

/** Overall time budget for a model chain when the caller gives none. */
export const DEFAULT_BUDGET_MS = 12_000;
/** Longest one model call may take when the caller gives no limit. */
export const DEFAULT_CALL_TIMEOUT_MS = 12_000;
/** Not worth starting another model call with less than this left. */
export const MIN_REMAINING_MS = 250;
export const BUDGET_WINDOW_MS = 60_000;
export const DEFAULT_CALLS_PER_MIN = 40;

const DEFAULT_MODEL = "gemini-2.5-flash";
/** Lite models have their own quotas, so a rate-limited primary does not take the feature down. */
const DEFAULT_FALLBACKS = "gemini-flash-lite-latest,gemini-3.5-flash-lite";

/** Primary model first, then fallbacks, de-duplicated. All configurable from the environment. */
export function modelChain(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = [
    env.GEMINI_MODEL || DEFAULT_MODEL,
    ...(env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACKS).split(","),
  ]
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set(list)];
}

/**
 * Gemini 2.5 models "think" with hidden tokens that otherwise consume the output budget and return
 * empty text,
 * so thinking is switched off for them. Newer models reject that setting, so it is only sent to 2.5.
 */
export function generationConfig(
  model: string,
  {
    maxTokens,
    temperature = 0.4,
    schema,
  }: Pick<GenerateOptions, "maxTokens" | "temperature" | "schema">,
) {
  return {
    maxOutputTokens: maxTokens,
    temperature,
    ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
  };
}

/**
 * A whole number of at least 1, or the fallback: `0`, a negative or text must not silently disable
 * every model call.
 */
export function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
