/** The shapes the Gemini client shares: options, results and failure reasons. */

/** Why a Gemini call produced no answer, so the page can say so plainly. */
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

export interface ImagePart {
  mimeType: string;
  data: string; /* base64, no data: prefix */
}

/** What to ask Gemini and how. */
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

/** Either the model's text, or the reason there is none. */
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
