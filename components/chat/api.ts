/** Talking to /api/chat: the request, the reply shape and the wording for each outcome. */
import type { Key } from "@/lib/i18n";

/** The household choices sent with a question. Shape is checked on the server. */
export type Choices = Record<string, unknown>;

/** A translation key for the note under an answer, with any values it needs. */
export type Note = Key | { key: Key; vars: Record<string, string> };

/**
 * The server answers within 12 s, either with Gemini's checked answer or with checked offline
 * guidance. A little more here covers the network.
 */
export const CHAT_CLIENT_TIMEOUT_MS = 14_000;
/** After this long, say that it is still working. */
export const SLOW_AFTER_MS = 3_000;

interface ChatReply {
  answer?: string;
  verified?: boolean;
  rejected?: boolean;
  reasonText?: string;
  error?: string;
}

/** Asks the server. Resolves with a reply that has an answer, or throws with a message a person can read. */
export async function requestAnswer(
  question: string,
  choices: Choices,
  signal: AbortSignal,
): Promise<ChatReply & { answer: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, choices }),
    signal,
  });
  const json = (await res.json()) as ChatReply;
  if (!res.ok || !json.answer) throw new Error(json.error || "Something went wrong.");
  return { ...json, answer: json.answer };
}

/** The line under an answer that says how far it was checked. */
export function noteFor(reply: ChatReply): Note {
  if (reply.verified) return "chat.verified";
  if (reply.rejected) return "chat.rejected";
  if (reply.reasonText) return { key: "chat.reason", vars: { reason: reply.reasonText } };
  return "chat.checked";
}

/** A timeout and a dropped connection get our own wording; a server message is shown as it came. */
export function errorMessage(e: unknown, t: (key: Key) => string): string {
  if (e instanceof Error && e.name === "AbortError") return t("chat.timeout");
  return e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("chat.errorNet");
}
