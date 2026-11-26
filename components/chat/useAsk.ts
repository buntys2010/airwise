/** The chat's asking logic: one question at a time, a timeout, and stale answers dropped. */
"use client";
import { useEffect, useRef, useState } from "react";

import type { Key } from "@/lib/i18n";

import {
  CHAT_CLIENT_TIMEOUT_MS,
  type Choices,
  errorMessage,
  type Note,
  noteFor,
  requestAnswer,
  SLOW_AFTER_MS,
} from "./api";

interface AskHooks {
  t: (key: Key) => string;
  /** Called with each accepted answer, for reading it aloud. */
  onAnswer: (answer: string) => void;
  /** Called when a new question starts, to clear any voice message. */
  onStart: () => void;
}

/** State for one chat box: the answer, its note, and progress. `ask` sends a question. */
export function useAsk(choices: Choices, { t, onAnswer, onStart }: Readonly<AskHooks>) {
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(0);

  // A visible progress state: after a few seconds the card says it is still working, so a slow
  // answer never looks like a hang.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = ++latest.current;
    // a newer question was asked meanwhile: drop this stale outcome
    const isLatest = () => id === latest.current;
    setBusy(true);
    setError("");
    onStart();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHAT_CLIENT_TIMEOUT_MS);
    try {
      const reply = await requestAnswer(text, choices, ctrl.signal);
      if (!isLatest()) return;
      setAnswer(reply.answer);
      setNote(noteFor(reply));
      onAnswer(reply.answer);
    } catch (failure) {
      if (isLatest()) setError(errorMessage(failure, t));
    } finally {
      clearTimeout(timer);
      if (isLatest()) setBusy(false);
    }
  }

  return { answer, note, busy, slow, error, ask };
}
