"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
  /** True while the Day plan tab is on screen. Gemini is only asked then, so a quiet tab never spends quota. */
  active?: boolean;
}

/**
 * The household's clear-air day. The calculated schedule shows at once; Gemini rewrites it in friendly words as soon as the tab opens
 * (and again when the household or city changes). The server checks every number, and falls back to the calculated plan if one is off.
 */
export function DayPlan({ schedule, choices, active = true }: Props) {
  const { lang } = useLang();
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
    } catch (e) {
      if (ac.signal.aborted) return;
      setError(
        e instanceof Error ? e.message : "Could not reach AirWise. Check your connection and try again.",
      );
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, []);

  // Ask Gemini once the tab is open, and again whenever the choices change (after a short pause, so toggling several fixes is one request).
  useEffect(() => {
    if (!active || doneFor.current === key) return;
    const timer = setTimeout(() => {
      void write(choices);
    }, 700);
    return () => clearTimeout(timer);
  }, [active, key, choices, write]);
  useEffect(() => () => ctrl.current?.abort(), []);

  const gemini = result?.source === "gemini";
  // Once the server has answered, show its steps (built from the same engine and air data); until then, the calculated schedule.
  const items: { time: string; title?: string; text: string }[] = result
    ? result.steps.map((s) => ({ time: s.time, text: s.text }))
    : schedule.map((e) => ({ time: e.time, title: e.title, text: e.detail }));

  const tag = busy ? (
    <span className="geminitag wait" role="status">
      ✦ Gemini is writing your day…
    </span>
  ) : gemini ? (
    <span className="geminitag">✦ Written by Gemini, numbers checked</span>
  ) : null;

  return (
    <div lang={gemini ? lang : "en"}>
      <div className="dayhead">{tag}</div>
      {gemini && result && <p className="dayheadline">{result.headline}</p>}
      {busy && !result ? (
        <div aria-hidden="true" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : null}
      <ol className="day" aria-busy={busy}>
        {items.map((e, i) => (
          <li key={`${e.time}-${i}`}>
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
        <button type="button" className="btn ghost" onClick={() => void write(choices)} disabled={busy}>
          {busy
            ? "Writing your plan…"
            : gemini
              ? "Write it again with Gemini"
              : "Write it in my words with Gemini"}
        </button>
        <p className="statusline" aria-live="polite" role="status">
          {error
            ? error
            : gemini
              ? `${result.headline}. Every number was checked against your data.`
              : result?.rejected
                ? "Gemini's version used a number we could not verify, so this is the checked plan."
                : result
                  ? `${result.reasonText ?? "Gemini is not available"}, so this is the standard plan.`
                  : "The plan above is calculated from live air data. Gemini rewrites it in friendlier words, and AirWise rejects any version that adds a number it did not calculate."}
        </p>
      </div>
    </div>
  );
}
