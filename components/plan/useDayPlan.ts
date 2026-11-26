"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DayPlan as Plan } from "@/lib/plan";

import type { Choices } from "../chat/useAsk";

/** The server's reply: the written plan, who wrote it, and whether every number checked out. */
export interface DayPlanResult extends Plan {
  source: "gemini" | "offline";
  verified: boolean;
  rejected?: boolean;
  reasonText?: string;
}

/** Wait this long after the choices settle before asking, so toggling several fixes is one request. */
const ASK_DELAY_MS = 700;

async function requestPlan(choices: Choices, signal: AbortSignal): Promise<DayPlanResult> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choices }),
    signal,
  });
  const json = (await res.json()) as DayPlanResult & { error?: string };
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json;
}

/**
 * Asks the server to write the day's plan once the tab is open, and again whenever the choices change.
 * A newer request cancels an older one; only the latest answer is kept.
 */
export function useDayPlan(choices: Choices, active: boolean) {
  const [result, setResult] = useState<DayPlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);
  const doneFor = useRef("");
  const key = JSON.stringify(choices);

  const write = useCallback(async (c: Choices) => {
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setBusy(true);
    setError("");
    try {
      const json = await requestPlan(c, ac.signal);
      if (ac.signal.aborted) return;
      setResult(json);
      doneFor.current = JSON.stringify(c);
    } catch (e) {
      if (ac.signal.aborted) return;
      setError(
        e instanceof Error ? e.message : "Could not reach AirWise. Check your connection and try again.",
      );
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!active || doneFor.current === key) return;
    const timer = setTimeout(() => void write(choices), ASK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, key, choices, write]);
  useEffect(() => () => ctrl.current?.abort(), []);

  return { result, busy, error, write };
}
