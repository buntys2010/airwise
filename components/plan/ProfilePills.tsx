"use client";
/** One-tap household questions as radio-group pills. */

import { useRef } from "react";

import type { Lang } from "@/lib/chat";
import type { Commute, Cooking, Home, Profile } from "@/lib/engine";
import { type Key, t as translate } from "@/lib/i18n";

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  lang?: Lang;
}

interface Pill<T extends string> {
  value: T;
  icon: string;
  key: Key;
}

const HOME: Pill<Home>[] = [
  { value: "leaky", icon: "🏢", key: "pill.home.leaky" },
  { value: "sealed", icon: "🏢", key: "pill.home.sealed" },
  { value: "typical", icon: "🏡", key: "pill.home.typical" },
];
const COMMUTE: Pill<Commute>[] = [
  { value: "bike", icon: "🛵", key: "pill.commute.bike" },
  { value: "bus", icon: "🚌", key: "pill.commute.bus" },
  { value: "metro", icon: "🚇", key: "pill.commute.metro" },
  { value: "car", icon: "🚗", key: "pill.commute.car" },
  { value: "walk", icon: "🚶", key: "pill.commute.walk" },
  { value: "cycle", icon: "🚲", key: "pill.commute.cycle" },
  { value: "ev", icon: "🔌", key: "pill.commute.ev" },
];
const COOK: Pill<Cooking>[] = [
  { value: "lpg", icon: "🔥", key: "pill.cook.lpg" },
  { value: "induction", icon: "⚡", key: "pill.cook.induction" },
  { value: "wood", icon: "🪵", key: "pill.cook.wood" },
];

/** How far a key moves the selection in a radio group of `count` items from index `from`, or null if the key is not ours. */
function stepForKey(key: string, from: number, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return -1;
  if (key === "Home") return -from;
  if (key === "End") return count - 1 - from;
  return null;
}

/** A WAI-ARIA radio group: one tab stop, arrow keys move and select, Home and End jump. */
function PillGroup<T extends string>({
  legend,
  value,
  pills,
  lang,
  onPick,
}: {
  legend: string;
  value: T;
  pills: Pill<T>[];
  lang: Lang;
  onPick: (v: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, step: number) => {
    const next = (from + step + pills.length) % pills.length;
    onPick(pills[next].value);
    refs.current[next]?.focus();
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = stepForKey(e.key, i, pills.length);
    if (step === null) return;
    e.preventDefault();
    move(i, step);
  };
  const checkedIndex = Math.max(
    0,
    pills.findIndex((p) => p.value === value),
  );
  return (
    <fieldset className="pill-group">
      <legend className="pill-legend">{legend}</legend>
      <div className="pill-row" role="radiogroup" aria-label={legend}>
        {pills.map((p, i) => {
          const on = p.value === value;
          return (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === checkedIndex ? 0 : -1}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`pill${on ? " on" : ""}`}
              onClick={() => onPick(p.value)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span aria-hidden="true">{p.icon}</span> {translate(lang, p.key)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** One-tap household questions. Every tap recalculates the page at once; there is no submit button. */
export function ProfilePills({ profile, onChange, lang = "en" }: Props) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v });
  return (
    <div className="pills" role="group" aria-label={translate(lang, "pills.title")}>
      <PillGroup<Home>
        legend={translate(lang, "pills.home")}
        value={profile.home}
        pills={HOME}
        lang={lang}
        onPick={(v) => set("home", v)}
      />
      <PillGroup<Commute>
        legend={translate(lang, "pills.commute")}
        value={profile.commute}
        pills={COMMUTE}
        lang={lang}
        onPick={(v) => set("commute", v)}
      />
      <div className="pill-km">
        <label htmlFor="pill-km">{translate(lang, "pills.km", { km: profile.km })}</label>
        <input
          id="pill-km"
          type="range"
          min={0}
          max={40}
          step={1}
          value={profile.km}
          onChange={(e) => set("km", Number(e.target.value))}
        />
      </div>
      <PillGroup<Cooking>
        legend={translate(lang, "pills.kitchen")}
        value={profile.cooking}
        pills={COOK}
        lang={lang}
        onPick={(v) => set("cooking", v)}
      />
      <button
        type="button"
        className={`pill vuln${profile.vulnerable ? " on" : ""}`}
        aria-pressed={profile.vulnerable}
        onClick={() => set("vulnerable", !profile.vulnerable)}
      >
        <span aria-hidden="true">👶</span> {translate(lang, "pills.vuln")}
      </button>
    </div>
  );
}
