import { createBudget } from "./ratelimit";

export type FailureReason =
  | "no_key"
  | "budget"
  | "quota"
  | "timeout"
  | "blocked"
  | "rejected"
  | "unavailable"
  | "network"
  | "empty";

interface ImagePart {
  mimeType: string;
  data: string; /* base64, no data: prefix */
}

export interface GenerateOptions {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  /** Gemini responseSchema; when set the reply is JSON. */
  schema?: Record<string, unknown>;
  /** Images for vision requests. */
  images?: ImagePart[];
  /** Longest a single model call may take. */
  timeoutMs?: number;
  /** Overall budget across the whole model chain. Chat 12 s, vision 20 s. */
  budgetMs?: number;
  /** Only used to label the log line. */
  kind?: "chat" | "plan" | "vision";
}

export type GenResult =
  { ok: true; text: string; model: string } | { ok: false; reason: FailureReason };

/** Plain-language text for each failure, shown to the user next to the offline answer. */
export const REASON_TEXT: Record<FailureReason, string> = {
  no_key: "Gemini is not set up on this server",
  budget: "AirWise has used its Gemini allowance for this minute",
  quota: "Gemini's rate limit was reached",
  timeout: "Gemini took too long to answer",
  blocked: "Gemini declined to answer that",
  rejected: "Gemini rejected the request",
  unavailable: "Gemini is unavailable right now",
  network: "Gemini could not be reached",
  empty: "Gemini returned nothing",
};

/** Overall time budget for a model chain when the caller gives none. */
const DEFAULT_BUDGET_MS = 12_000;
/** Longest one model call may take when the caller gives no limit. */
const DEFAULT_CALL_TIMEOUT_MS = 12_000;
/** Not worth starting another model call with less than this left. */
const MIN_REMAINING_MS = 250;
const BUDGET_WINDOW_MS = 60_000;
const DEFAULT_CALLS_PER_MIN = 40;

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
 * Gemini 2.5 models "think" with hidden tokens that otherwise consume the output budget and return empty text,
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

/** A whole number of at least 1, or the fallback: `0`, a negative or text must not silently disable every model call. */
export function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
/** A global cap on Gemini calls a minute, so one busy client cannot spend everyone's quota (and money, on a paid key). */
const budget = createBudget(
  () => positiveInt(process.env.GEMINI_BUDGET_PER_MIN, DEFAULT_CALLS_PER_MIN),
  BUDGET_WINDOW_MS,
);
/** Test hook: refill the per-minute Gemini call budget. */
export const resetGeminiBudget = () => budget.reset();

let sink: (line: string) => void = (line) => {
  if (process.env.NODE_ENV !== "test") console.info(line);
};
/** Test hook. */
export function setLogSink(fn: (line: string) => void) {
  sink = fn;
}
/** One structured line per attempt. Never contains the prompt, the question or any image. */
const log = (o: Record<string, unknown>) => sink(JSON.stringify({ evt: "gemini", ...o }));

type CallResult = { ok: true; text: string } | { ok: false; reason: FailureReason };

const BLOCKING_FINISH_REASONS = ["SAFETY", "PROHIBITED_CONTENT", "RECITATION", "BLOCKLIST"];

interface ModelReply {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
}

/** Maps a non-OK HTTP status to the reason a caller can show. */
function reasonForStatus(status: number): FailureReason {
  if (status === 429) return "quota";
  if (status === 400 || status === 401 || status === 403) return "rejected";
  return "unavailable";
}

/** Reads the model's text out of a reply, or says why there is none. */
function readReply(json: ModelReply): CallResult {
  if (json.promptFeedback?.blockReason) return { ok: false, reason: "blocked" };
  const cand = json.candidates?.[0];
  if (cand?.finishReason && BLOCKING_FINISH_REASONS.includes(cand.finishReason))
    return { ok: false, reason: "blocked" };
  const text = cand?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  return text ? { ok: true, text } : { ok: false, reason: "empty" };
}

async function callModel(
  model: string,
  key: string,
  opts: GenerateOptions,
  timeoutMs: number,
): Promise<CallResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const parts: unknown[] = [
      { text: opts.prompt },
      ...(opts.images ?? []).map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } })),
    ];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: generationConfig(model, opts),
        }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return { ok: false, reason: reasonForStatus(res.status) };
    return readReply((await res.json()) as ModelReply);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

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
 * Calls the Gemini API from the server, walking the model chain until one answers or the overall budget runs out.
 * Always resolves: a typed failure reason on any problem, so callers can show it and fall back to deterministic output.
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
