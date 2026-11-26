/** The Gemini client: one call with a timeout and a per-minute budget, returning a reason when it fails. */
import { logLine } from "../log";
import { createBudget } from "../ratelimit";
import { callModel } from "./call";
import {
  BUDGET_WINDOW_MS,
  DEFAULT_BUDGET_MS,
  DEFAULT_CALL_TIMEOUT_MS,
  DEFAULT_CALLS_PER_MIN,
  MIN_REMAINING_MS,
  modelChain,
  positiveInt,
} from "./config";
import type { FailureReason, GenerateOptions, GenResult } from "./types";

export { generationConfig, modelChain, positiveInt } from "./config";
export type { FailureReason, GenerateOptions, GenResult } from "./types";
export { REASON_TEXT } from "./types";

/**
 * A global cap on Gemini calls a minute, so one busy client cannot spend everyone's quota (and
 * money, on a paid key).
 */
const budget = createBudget(
  () => positiveInt(process.env.GEMINI_BUDGET_PER_MIN, DEFAULT_CALLS_PER_MIN),
  BUDGET_WINDOW_MS,
);
/** Test hook: refill the per-minute Gemini call budget. */
export const resetGeminiBudget = () => budget.reset();

/** One structured line per attempt. Never contains the prompt, the question or any image. */
const log = (o: Record<string, unknown>) => logLine(JSON.stringify({ evt: "gemini", ...o }));

const PRIORITY: FailureReason[] = [
  "blocked",
  "quota",
  "timeout",
  "rejected",
  "unavailable",
  "network",
  "empty",
];

/**
 * Calls the Gemini API from the server, walking the model chain until one answers or the overall
 * budget runs out.
 * Always resolves: a typed failure reason on any problem, so callers can show it and fall back to
 * deterministic output.
 * The key travels in a header, never in the URL, and is read only from the environment.
 */
export async function generateDetailed(opts: GenerateOptions): Promise<GenResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: "no_key" };
  const started = Date.now();
  const overall = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const seen: FailureReason[] = [];
  for (const model of modelChain()) {
    const remaining = overall - (Date.now() - started);
    if (remaining <= MIN_REMAINING_MS) {
      seen.push("timeout");
      break;
    }
    if (!budget.take()) {
      log({ kind: opts.kind, ok: false, reason: "budget" });
      return { ok: false, reason: "budget" };
    }
    const t0 = Date.now();
    const attempt = await callModel(
      model,
      key,
      opts,
      Math.min(opts.timeoutMs ?? DEFAULT_CALL_TIMEOUT_MS, remaining),
    );
    log({
      kind: opts.kind,
      model,
      ok: attempt.ok,
      reason: attempt.ok ? undefined : attempt.reason,
      ms: Date.now() - t0,
      images: opts.images?.length ?? 0,
    });
    if (attempt.ok) return { ok: true, text: attempt.text, model };
    seen.push(attempt.reason);
  }
  return { ok: false, reason: PRIORITY.find((p) => seen.includes(p)) ?? "unavailable" };
}

/** Thin wrapper kept for simple callers: the text, or null on any failure. */
export async function generate(opts: GenerateOptions): Promise<string | null> {
  const result = await generateDetailed(opts);
  return result.ok ? result.text : null;
}
