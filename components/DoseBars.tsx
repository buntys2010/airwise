import type { Sim } from "@/lib/engine";

const PARTS: { key: keyof Sim["parts"]; label: string; color: string }[] = [
  { key: "indoor", label: "Breathed at home", color: "#45d1b7" },
  { key: "commute", label: "On the way", color: "#ffae4a" },
  { key: "outdoor", label: "Outdoor time", color: "#ff7a4d" },
  { key: "cooking", label: "Cooking smoke", color: "#a56bff" },
];

/** The bar's text alternative: each part of the day's dose as a whole percent. */
const breakdownLabel = (sim: Sim): string =>
  PARTS.map((part) => `${part.label} ${Math.round(sim.parts[part.key] * 100)} percent`).join(", ");

/**
 * Both bars use the same scale (share of the do-nothing dose) so shrinkage is visible, not just
 * re-proportioned.
 */
export function DoseBars({ base, plan }: Readonly<{ base: Sim; plan: Sim }>) {
  const scale = base.meanPm > 0 ? plan.meanPm / base.meanPm : 1;
  const row = (title: string, sim: Sim, factor: number) => (
    <div>
      <p className="bar-label">
        {title}: {sim.meanPm.toFixed(0)} µg/m³ average, {sim.cigs.toFixed(1)} cigarettes
      </p>
      <div className="bar" role="img" aria-label={`${title}. ${breakdownLabel(sim)}`}>
        {PARTS.map((p) => (
          <i
            key={p.key}
            style={{ width: `${sim.parts[p.key] * factor * 100}%`, background: p.color }}
            title={p.label}
          />
        ))}
      </div>
    </div>
  );
  return (
    <div className="panel dose">
      {row("If you change nothing", base, 1)}
      {row("With your plan", plan, scale)}
      <div className="legend">
        {PARTS.map((p) => (
          <span key={p.key}>
            <i className="sw" style={{ background: p.color }} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
