"use client";
import type { ScheduleEntry } from "@/lib/schedule";

import type { Choices } from "../chat/useAsk";
import { useLang } from "../LangProvider";
import { type DayPlanResult, useDayPlan } from "./useDayPlan";

interface Props {
  schedule: ScheduleEntry[];
  choices: Choices;
  /** True while the Day plan tab is on screen. Gemini is only asked then, so a quiet tab never spends quota. */
  active?: boolean;
}

interface Item {
  time: string;
  title?: string;
  text: string;
}

/** The line under the plan: why this version is showing. */
function statusText(error: string, result: DayPlanResult | null): string {
  if (error) return error;
  if (!result) {
    return "The plan above is calculated from live air data. Gemini rewrites it in friendlier words, and AirWise rejects any version that adds a number it did not calculate.";
  }
  if (result.source === "gemini") return `${result.headline}. Every number was checked against your data.`;
  if (result.rejected)
    return "Gemini's version used a number we could not verify, so this is the checked plan.";
  return `${result.reasonText ?? "Gemini is not available"}, so this is the standard plan.`;
}

function buttonLabel(busy: boolean, gemini: boolean): string {
  if (busy) return "Writing your plan…";
  return gemini ? "Write it again with Gemini" : "Write it in my words with Gemini";
}

function GeminiTag({ busy, gemini }: { busy: boolean; gemini: boolean }) {
  if (busy) {
    return (
      <span className="geminitag wait" role="status">
        ✦ Gemini is writing your day…
      </span>
    );
  }
  return gemini ? <span className="geminitag">✦ Written by Gemini, numbers checked</span> : null;
}

function Steps({ items, busy }: { items: Item[]; busy: boolean }) {
  return (
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
  );
}

/**
 * The household's clear-air day. The calculated schedule shows at once; Gemini rewrites it in friendly words as soon as the tab opens
 * (and again when the household or city changes). The server checks every number, and falls back to the calculated plan if one is off.
 */
export function DayPlan({ schedule, choices, active = true }: Props) {
  const { lang } = useLang();
  const { result, busy, error, write } = useDayPlan(choices, active);
  const gemini = result?.source === "gemini";
  // Once the server has answered, show its steps (built from the same engine and air data); until then, the calculated schedule.
  const items: Item[] = result
    ? result.steps.map((s) => ({ time: s.time, text: s.text }))
    : schedule.map((e) => ({ time: e.time, title: e.title, text: e.detail }));

  return (
    <div lang={gemini ? lang : "en"}>
      <div className="dayhead">
        <GeminiTag busy={busy} gemini={gemini} />
      </div>
      {gemini && result && <p className="dayheadline">{result.headline}</p>}
      {busy && !result && (
        <div aria-hidden="true" className="skeletons">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
      <Steps items={items} busy={busy} />
      <div className="dayfoot">
        <button type="button" className="btn ghost" onClick={() => void write(choices)} disabled={busy}>
          {buttonLabel(busy, gemini)}
        </button>
        <p className="statusline" aria-live="polite" role="status">
          {statusText(error, result)}
        </p>
      </div>
    </div>
  );
}
