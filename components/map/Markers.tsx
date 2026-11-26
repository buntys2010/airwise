/** The two kinds of city marker on the map: small shape markers, and the named big-city dots. */
"use client";
import type { MapPoint } from "@/lib/air/server";
import { categoryOf } from "@/lib/engine/aqi";
import { TONE_COLOUR } from "@/lib/palette";

import { useLang } from "../LangProvider";
import { LABEL, xFor, yFor } from "./geo";
import { Shape } from "./Shape";

interface MarkerProps {
  point: MapPoint;
  selected: boolean;
  onSelect: (id: string) => void;
}

/** A small marker: a shape for the level, with a dashed ring when the value is an estimate. */
export function SmallMarker({ point: p, selected, onSelect }: Readonly<MarkerProps>) {
  return (
    <g
      data-city={p.id}
      transform={`translate(${xFor(p.lon)} ${yFor(p.lat)})`}
      className={`map-mark${selected ? " sel" : ""}`}
      onClick={() => onSelect(p.id)}
    >
      <circle r={11} className="hit" />
      <Shape tone={categoryOf(p.pm).tone} r={5.5} />
      {p.source === "estimate" && <circle r={9} className="est-ring" />}
    </g>
  );
}

/** One of the twelve named cities: an icon dot with its name and value beside it. */
export function NamedMarker({ point: p, selected, onSelect }: Readonly<MarkerProps>) {
  const { t } = useLang();
  const category = categoryOf(p.pm);
  const labelOffset = LABEL[p.id] ?? { dx: 18, dy: 0, anchor: "start" as const };
  return (
    <g
      data-city={p.id}
      data-named="true"
      className={`map-mark${selected ? " sel" : ""}`}
      onClick={() => onSelect(p.id)}
    >
      <circle
        cx={xFor(p.lon)}
        cy={yFor(p.lat)}
        r={13}
        fill={TONE_COLOUR[category.tone]}
        className="map-dot"
        strokeDasharray={p.source === "estimate" ? "5 4" : undefined}
      />
      <text x={xFor(p.lon)} y={yFor(p.lat) + 5} textAnchor="middle" className="map-icon">
        {category.icon}
      </text>
      <text
        x={xFor(p.lon) + labelOffset.dx}
        y={yFor(p.lat) + labelOffset.dy}
        textAnchor={labelOffset.anchor}
        className="map-name"
      >
        {p.name}
      </text>
      <text
        x={xFor(p.lon) + labelOffset.dx}
        y={yFor(p.lat) + labelOffset.dy + 18}
        textAnchor={labelOffset.anchor}
        className="map-val"
      >
        {p.pm} µg/m³{p.source === "estimate" ? ` · ${t("map.est")}` : ""}
      </text>
    </g>
  );
}
