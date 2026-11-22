"use client";
import type { Commute, Cooking, Home, Profile } from "@/lib/engine";

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
}

function Radios<T extends string>({ legend, name, value, options, onPick }: { legend: string; name: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="opts">
        {options.map(([v, label]) => (
          <label key={v} className="opt">
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onPick(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileForm({ profile, onChange }: Props) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v });
  return (
    <div className="panel profile" role="group" aria-label="Your household">
      <Radios<Home> legend="How tight is your home?" name="home" value={profile.home} onPick={(v) => set("home", v)}
        options={[["sealed", "Sealed, AC on"], ["typical", "Typical flat"], ["leaky", "Old, gappy windows"]]} />
      <Radios<Commute> legend="How do you get to work or school?" name="commute" value={profile.commute} onPick={(v) => set("commute", v)}
        options={[["bike", "Two-wheeler"], ["car", "Car"], ["bus", "Bus"], ["metro", "Metro"], ["cycle", "Cycle"], ["walk", "Walk"], ["ev", "Electric car"]]} />
      <Radios<Cooking> legend="What do you cook on?" name="cooking" value={profile.cooking} onPick={(v) => set("cooking", v)}
        options={[["lpg", "Gas (LPG)"], ["wood", "Wood or coal"], ["induction", "Induction"]]} />
      <div>
        <label htmlFor="km" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", display: "block", marginBottom: 10 }}>
          One-way distance: {profile.km} km
        </label>
        <input id="km" type="range" min={0} max={40} step={1} value={profile.km} onChange={(e) => set("km", Number(e.target.value))} />
        <div className="check" style={{ marginTop: 18 }}>
          <input id="vuln" type="checkbox" checked={profile.vulnerable} onChange={(e) => set("vulnerable", e.target.checked)} />
          <label htmlFor="vuln">A child, an older adult, or someone with asthma or a heart condition lives with us.</label>
        </div>
      </div>
    </div>
  );
}
