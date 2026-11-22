"use client";
import { toggleAction, type ActionResult, type Plan } from "@/lib/engine";

interface Props {
  actions: ActionResult[];
  plan: Plan;
  onChange: (p: Plan) => void;
}

export function ActionList({ actions, plan, onChange }: Props) {
  return (
    <ul className="actions">
      {actions.map((a) => {
        const on = a.isOn(plan);
        const pct = Math.round(a.savedPct * 100);
        return (
          <li key={a.id} className={`action ${on ? "on" : a.applicable ? "" : "off"}`}>
            <div>
              <h3>{a.title}</h3>
              <p>{a.detail}</p>
              <div className="pills">
                {a.applicable ? (
                  <>
                    <span className="pill good">−{pct}% exposure</span>
                    {a.savedCigs >= 0.05 && <span className="pill">−{a.savedCigs.toFixed(1)} cigarettes a day</span>}
                    {a.savedCo2Kg >= 0.05 && <span className="pill">−{a.savedCo2Kg.toFixed(1)} kg CO₂ a day</span>}
                  </>
                ) : (
                  <span className="pill">Nothing to change here</span>
                )}
                <span className="pill">{a.cost}</span>
              </div>
              <details>
                <summary>Show the math</summary>
                <ul>{a.math.map((m) => (<li key={m}>{m}</li>))}</ul>
              </details>
            </div>
            <button type="button" className="toggle" aria-pressed={on} disabled={!a.applicable}
              onClick={() => onChange(toggleAction(plan, a))}>
              {on ? "In my plan" : "Add to my plan"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
