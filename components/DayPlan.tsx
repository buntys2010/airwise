/** The clear-air day: the calculated schedule at once, with Gemini's rewrite replacing it when it arrives. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { runInBackground } from "@/lib/background";
import type { DayPlan as Plan } from "@/lib/plan";
import type { ScheduleEntry } from "@/lib/schedule";

import type { Choices } from "./Chat";
import { useLang } from "./LangProvider";

interface Result extends Plan {
  source: "gemini" | "offline";
  verified: boolean;
  rejected?: boolean;
  reasonText?: string;
}

interface Props {
  schedule: ScheduleEntry[];
  choices: Choices;
  /**
   * True while the Day plan tab is on screen. Gemini is only asked then, so a quiet tab never
   * spends quota.
   */
  active?: boolean;
}

const ASK_DELAY_MS = 700;

/**
 * Fetches the written plan: once the tab is open, and again (after a short pause, so toggling
 * several fixes is one request) whenever the choices change.
 */
function usePlanWriter(choices: Choices, active: boolean) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);
  const key = JSON.stringify(choices);
  const doneFor = useRef("");

  const write = useCallback(async (c: Choices) => {
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices: c }),
        signal: ac.signal,
      });
      const json = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      if (ac.signal.aborted) return;
      setResult(json);
      doneFor.current = JSON.stringify(c);
    } catch (failure) {
      if (ac.signal.aborted) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not reach AirWise. Check your connection and try again.",
      );
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!active || doneFor.current === key) return undefined;
    const timer = setTimeout(() => {
      runInBackground(write(choices));
    }, ASK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, key, choices, write]);
  useEffect(() => () => ctrl.current?.abort(), []);

  return { result, busy, error, write };
}

/** The sentence under the buttons: an error, or where the plan above came from. */
function statusText(result: Result | null, error: string): string {
  if (error) return error;
  if (result?.source === "gemini")
    return `${result.headline}. Every number was checked against your data.`;
  if (result?.rejected)
    return "Gemini's version used a number we could not verify, so this is the checked plan.";
  if (result)
    return `${result.reasonText ?? "Gemini is not available"}, so this is the standard plan.`;
  return "The plan above is calculated from live air data. Gemini rewrites it in friendlier words, and AirWise rejects any version that adds a number it did not calculate.";
}

/**
 * The household's clear-air day. The calculated schedule shows at once; Gemini rewrites it in
 * friendly words as soon as the tab opens
 * (and again when the household or city changes). The server checks every number, and falls back
 * to the calculated plan if one is off.
 */
export function DayPlan({ schedule, choices, active = true }: Readonly<Props>) {
  const { lang } = useLang();
  const { result, busy, error, write } = usePlanWriter(choices, active);

  const gemini = result?.source === "gemini";
  // Once the server has answered, show its steps (built from the same engine and air data); until
  // then, the calculated schedule.
  const items: { time: string; title?: string; text: string }[] = result
    ? result.steps.map((s) => ({ time: s.time, text: s.text }))
    : schedule.map((e) => ({ time: e.time, title: e.title, text: e.detail }));

  let tag: React.ReactNode = null;
  if (busy) {
    tag = (
      <span className="geminitag wait" role="status">
        ✦ Gemini is writing your day…
      </span>
    );
  } else if (gemini) {
    tag = <span className="geminitag">✦ Written by Gemini, numbers checked</span>;
  }
  let buttonLabel = "Write it in my words with Gemini";
  if (busy) buttonLabel = "Writing your plan…";
  else if (gemini) buttonLabel = "Write it again with Gemini";

  return (
    <div lang={gemini ? lang : "en"}>
      <div className="dayhead">{tag}</div>
      {gemini && result && <p className="dayheadline">{result.headline}</p>}
      {busy && !result ? (
        <div aria-hidden="true" className="u-skeleton-stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : null}
      <ol className="day" aria-busy={busy}>
        {items.map((e) => (
          <li key={`${e.time}-${e.text}`}>
            <span className="when">{e.time}</span>
            <div className="panel">
              {e.title ? (
                <>
                  <h3>{e.title}</h3>
                  <p className="dim">{e.text}</p>
                </>
              ) : (
                <p>{e.text}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="dayfoot">
        <button
          type="button"
          className="btn ghost"
          onClick={() => runInBackground(write(choices))}
          disabled={busy}
        >
          {buttonLabel}
        </button>
        <p className="statusline" aria-live="polite" role="status">
          {statusText(result, error)}
        </p>
      </div>
    </div>
  );
}
