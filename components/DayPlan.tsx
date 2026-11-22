"use client";
import { useState } from "react";
import type { Choices } from "./Chat";
import type { DayPlan as Plan } from "@/lib/plan";
import type { ScheduleEntry } from "@/lib/schedule";

interface Result extends Plan {
  source: "gemini" | "offline";
  verified: boolean;
  rejected?: boolean;
  reasonText?: string;
}

export function DayPlan({ schedule, choices }: { schedule: ScheduleEntry[]; choices: Choices }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function write() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choices }) });
      const json = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach AirWise. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  const gemini = result?.source === "gemini";
  // Once the server has answered, show its steps (it built them from the same engine and air data); until then, the local schedule.
  const items: { time: string; title?: string; text: string }[] = result
    ? result.steps.map((s) => ({ time: s.time, text: s.text }))
    : schedule.map((e) => ({ time: e.time, title: e.title, text: e.detail }));
  return (
    <div>
      <ol className="day">
        {items.map((e, i) => (
          <li key={`${e.time}-${i}`}>
            <span className="when">{e.time}</span>
            <div className="panel">
              {e.title ? (<><h3>{e.title}</h3><p className="dim">{e.text}</p></>) : <p>{e.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      <div className="dayfoot">
        <button type="button" className="btn" onClick={write} disabled={busy}>{busy ? "Writing your plan…" : gemini ? "Write it again with Gemini" : "Write it in my words with Gemini"}</button>
        <p className="statusline" aria-live="polite" role="status">
          {error ? error :
            gemini ? `${result!.headline}. Written by Gemini, with every number checked against your data.` :
            result?.rejected ? "Gemini's version used a number we could not verify, so this is the checked plan." :
            result ? `${result.reasonText ?? "Gemini is not available"}, so this is the standard plan.` :
            "The plan above is calculated from live air data. Gemini can rewrite it in friendlier words, and AirWise rejects any version that adds a number it did not calculate."}
        </p>
      </div>
    </div>
  );
}
