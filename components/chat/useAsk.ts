"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Key } from "@/lib/i18n";

/** Only choices from fixed lists. The server recomputes every figure from them. */
export type Choices = Record<string, unknown>;

/** The server answers within 12 s, either with Gemini's checked answer or with checked offline guidance. A little more here covers the network. */
export const CHAT_CLIENT_TIMEOUT_MS = 14_000;
/** After this long, say that it is still working. */
export const SLOW_AFTER_MS = 3_000;

type Note = Key | { key: Key; vars: Record<string, string> };

interface ChatReply {
  answer?: string;
  verified?: boolean;
  rejected?: boolean;
  reasonText?: string;
  error?: string;
}

/** Which footnote explains how the answer was checked. */
function noteFor(reply: ChatReply): Note {
  if (reply.verified) return "chat.verified";
  if (reply.rejected) return "chat.rejected";
  if (reply.reasonText) return { key: "chat.reason", vars: { reason: reply.reasonText } };
  return "chat.checked";
}

/** What went wrong, in words the person can act on. */
export function failureMessage(e: unknown, t: (key: Key) => string): string {
  if (e instanceof Error && e.name === "AbortError") return t("chat.timeout");
  if (e instanceof Error && e.message !== "Failed to fetch") return e.message;
  return t("chat.errorNet");
}

async function postQuestion(
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

/**
 * Asks the server a question and tracks the answer, its footnote, progress and failure.
 * A newer question makes an older, slower answer stale, and it is dropped.
 */
export function useAsk(choices: Choices, t: (key: Key) => string, onAnswer: (text: string) => void) {
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(0);

  // After a few seconds the card says it is still working, so a slow answer never looks like a hang.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;
      const id = ++latest.current;
      setBusy(true);
      setError("");
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CHAT_CLIENT_TIMEOUT_MS);
      try {
        const reply = await postQuestion(text, choices, ctrl.signal);
        if (id !== latest.current) return;
        setAnswer(reply.answer);
        setNote(noteFor(reply));
        onAnswer(reply.answer);
      } catch (e) {
        if (id === latest.current) setError(failureMessage(e, t));
      } finally {
        clearTimeout(timer);
        if (id === latest.current) setBusy(false);
      }
    },
    [busy, choices, onAnswer, t],
  );

  return { ask, answer, note, busy, slow, error };
}
