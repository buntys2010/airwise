import type { MapPoint } from "@/lib/data";
import { categoryOf } from "@/lib/engine";
import { TONE_FILL } from "@/lib/toneColors";

import { LABEL, x, y } from "./geo";
import { Shape } from "./Shape";

interface MarkerProps {
  point: MapPoint;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Translated "estimate" word, shown beside a value that is not live. */
  estimateLabel: string;
}

/** A small marker whose shape says the level; a ring shows that the value is an estimate. */
export function SmallMarker({ point: p, selected, onSelect }: MarkerProps) {
  return (
    <g
      data-city={p.id}
      transform={`translate(${x(p.lon)} ${y(p.lat)})`}
      className={`map-mark${selected ? " sel" : ""}`}
      onClick={() => onSelect(p.id)}
    >
      <circle r={11} className="hit" />
      <Shape tone={categoryOf(p.pm).tone} r={5.5} />
      {p.source === "estimate" && <circle r={9} className="est-ring" />}
    </g>
  );
}

/** One of the twelve named cities: a dot with the level's icon, the name and the value. */
export function NamedMarker({ point: p, selected, onSelect, estimateLabel }: MarkerProps) {
  const cat = categoryOf(p.pm);
  const place = LABEL[p.id] ?? { dx: 18, dy: 0, anchor: "start" as const };
  const cx = x(p.lon);
  const cy = y(p.lat);
  return (
    <g
      data-city={p.id}
      data-named="true"
      className={`map-mark${selected ? " sel" : ""}`}
      onClick={() => onSelect(p.id)}
    >
      <circle
        cx={cx}
        cy={cy}
        r={13}
        fill={TONE_FILL[cat.tone]}
        className="map-dot"
        strokeDasharray={p.source === "estimate" ? "5 4" : undefined}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" className="map-icon">
        {cat.icon}
      </text>
      <text x={cx + place.dx} y={cy + place.dy} textAnchor={place.anchor} className="map-name">
        {p.name}
      </text>
      <text x={cx + place.dx} y={cy + place.dy + 18} textAnchor={place.anchor} className="map-val">
        {p.pm} µg/m³{p.source === "estimate" ? ` · ${estimateLabel}` : ""}
      </text>
    </g>
  );
}
