/** One HTTP call to one Gemini model, turned into text or a typed failure reason. */
import { generationConfig } from "./config";
import type { FailureReason, GenerateOptions } from "./types";

export type CallResult = { ok: true; text: string } | { ok: false; reason: FailureReason };

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

export async function callModel(
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
