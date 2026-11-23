"use client";
import { lazy, Suspense, useState } from "react";

import type { MapPoint } from "@/lib/air/server";
import { CITIES } from "@/lib/cities";
import { aqiFromPm, categoryOf, type Tone } from "@/lib/engine/aqi";
import { CATEGORY_KEY } from "@/lib/i18n";

import { useLang } from "./LangProvider";

/** The long table is only needed on this page, and only below the map, so it is loaded separately. */
const CityTable = lazy(() => import("./CityTable"));

/** A rough outline of India, [longitude, latitude]. Schematic, drawn by hand, not for navigation. */
const OUTLINE: [number, number][] = [
  [68.2, 23.6],
  [70.3, 24.4],
  [70.9, 26.4],
  [71.9, 27.9],
  [73.5, 29.3],
  [74.5, 31.0],
  [75.3, 32.4],
  [74.2, 33.6],
  [74.3, 35.0],
  [76.0, 35.9],
  [77.8, 35.5],
  [79.2, 34.3],
  [78.8, 32.5],
  [79.3, 31.0],
  [81.0, 30.1],
  [84.0, 28.6],
  [87.6, 27.8],
  [88.2, 26.9],
  [88.9, 26.6],
  [89.6, 26.7],
  [91.5, 26.8],
  [92.9, 27.8],
  [95.2, 29.2],
  [97.3, 28.3],
  [96.2, 27.1],
  [97.0, 26.0],
  [95.0, 25.4],
  [94.5, 23.9],
  [93.5, 22.6],
  [92.6, 22.9],
  [92.3, 24.0],
  [91.6, 24.2],
  [91.1, 25.2],
  [89.8, 25.3],
  [89.0, 26.0],
  [88.6, 24.6],
  [88.9, 22.6],
  [88.0, 21.6],
  [86.9, 21.3],
  [85.0, 19.6],
  [83.0, 17.6],
  [81.0, 15.9],
  [80.2, 13.3],
  [79.9, 10.3],
  [78.2, 8.9],
  [77.5, 8.1],
  [76.5, 8.9],
  [75.4, 11.7],
  [74.4, 14.5],
  [73.6, 16.5],
  [72.8, 19.1],
  [72.7, 20.8],
  [70.9, 20.7],
  [69.2, 22.2],
];
const MAP_WIDTH = 620,
  MAP_HEIGHT = 680,
  LON0 = 67,
  LON1 = 98.5,
  LAT0 = 6,
  LAT1 = 38;
const xFor = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * MAP_WIDTH;
const yFor = (lat: number) => MAP_HEIGHT - ((lat - LAT0) / (LAT1 - LAT0)) * MAP_HEIGHT;

/** Cropped to the country, with room for the islands and the north-east. */
const VIEW = { x: -70, y: 40, w: 670, h: 640 };

const FILL: Record<Tone, string> = {
  good: "#45d1b7",
  moderate: "#e9d758",
  sensitive: "#ffae4a",
  unhealthy: "#ff7a4d",
  severe: "#e0508a",
  hazardous: "#a56bff",
};

/**
 * Where the twelve named cities' labels sit, relative to their dots. Hand-placed so none overlap
 * (checked in a real browser).
 */
const LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "end" }> = {
  delhi: { dx: -20, dy: -4, anchor: "end" },
  jaipur: { dx: -18, dy: 8, anchor: "end" },
  lucknow: { dx: 14, dy: -24, anchor: "start" },
  patna: { dx: 18, dy: -4, anchor: "start" },
  kolkata: { dx: -20, dy: 4, anchor: "end" },
  ahmedabad: { dx: -18, dy: 0, anchor: "end" },
  bhopal: { dx: -18, dy: 2, anchor: "end" },
  mumbai: { dx: -18, dy: -6, anchor: "end" },
  pune: { dx: 18, dy: 36, anchor: "start" },
  hyderabad: { dx: 18, dy: -24, anchor: "start" },
  bengaluru: { dx: -18, dy: 10, anchor: "end" },
  chennai: { dx: 18, dy: 4, anchor: "start" },
};
const NAMED = new Set(CITIES.filter((c) => c.label).map((c) => c.id));

/** A small marker whose SHAPE says the level, so colour is never the only signal. */
function Shape({ tone, r }: Readonly<{ tone: Tone; r: number }>) {
  const common = { fill: FILL[tone], className: "map-pt" };
  switch (tone) {
    case "good":
      return <circle r={r} {...common} />;
    case "moderate":
      return <path d={`M0 ${-r * 1.2} L${r * 1.2} 0 L0 ${r * 1.2} L${-r * 1.2} 0Z`} {...common} />;
    case "sensitive":
      return <path d={`M0 ${-r * 1.25} L${r * 1.2} ${r} L${-r * 1.2} ${r}Z`} {...common} />;
    case "unhealthy":
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} {...common} />;
    case "severe":
      return (
        <path
          d={`M${r * 1.2} 0 L${r * 0.6} ${r * 1.05} L${-r * 0.6} ${r * 1.05} L${-r * 1.2} 0 L${-r * 0.6} ${-r * 1.05} L${r * 0.6} ${-r * 1.05}Z`}
          {...common}
        />
      );
    default:
      return (
        <g>
          <circle r={r * 1.1} {...common} />
          <path
            d={`M${-r * 0.6} ${-r * 0.6} L${r * 0.6} ${r * 0.6} M${r * 0.6} ${-r * 0.6} L${-r * 0.6} ${r * 0.6}`}
            stroke="#12222a"
            strokeWidth={1.6}
          />
        </g>
      );
  }
}

/**
 * Every city is a marker with a shape and a value in the table; the twelve biggest also carry a
 * name and value on the map.
 * Tap a marker, or use "Show" in the table (keyboard), to read any city. The air feed is gridded,
 * so near neighbours can share a value.
 */
export function AirMap({ points, time }: Readonly<{ points: MapPoint[]; time: string }>) {
  const { t } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const picked = points.find((p) => p.id === selected) ?? null;
  const detail = picked
    ? t("map.detail", {
        city: picked.name,
        state: picked.state,
        pm: picked.pm,
        aqi: aqiFromPm(picked.pm),
        level: t(CATEGORY_KEY[categoryOf(picked.pm).tone]),
        source: picked.source === "live" ? t("map.live") : t("map.est"),
      })
    : t("map.hint");
  return (
    <div className="airmap">
      <div className="panel mapbox">
        <svg
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          role="img"
          aria-label={t("map.alt")}
          className="mapsvg"
        >
          <polygon
            className="map-land"
            points={OUTLINE.map(
              ([lon, lat]) => `${xFor(lon).toFixed(1)},${yFor(lat).toFixed(1)}`,
            ).join(" ")}
          />
          {/* small markers first, so the named cities and the selection draw on top */}
          {points
            .filter((p) => !NAMED.has(p.id))
            .map((p) => {
              const tone = categoryOf(p.pm).tone;
              return (
                <g
                  key={p.id}
                  data-city={p.id}
                  transform={`translate(${xFor(p.lon)} ${yFor(p.lat)})`}
                  className={`map-mark${p.id === selected ? " sel" : ""}`}
                  onClick={() => setSelected(p.id)}
                >
                  <circle r={11} className="hit" />
                  <Shape tone={tone} r={5.5} />
                  {p.source === "estimate" && <circle r={9} className="est-ring" />}
                </g>
              );
            })}
          {points
            .filter((p) => NAMED.has(p.id))
            .map((p) => {
              const category = categoryOf(p.pm);
              const labelOffset = LABEL[p.id] ?? { dx: 18, dy: 0, anchor: "start" as const };
              return (
                <g
                  key={p.id}
                  data-city={p.id}
                  data-named="true"
                  className={`map-mark${p.id === selected ? " sel" : ""}`}
                  onClick={() => setSelected(p.id)}
                >
                  <circle
                    cx={xFor(p.lon)}
                    cy={yFor(p.lat)}
                    r={13}
                    fill={FILL[category.tone]}
                    className="map-dot"
                    strokeDasharray={p.source === "estimate" ? "5 4" : undefined}
                  />
                  <text
                    x={xFor(p.lon)}
                    y={yFor(p.lat) + 5}
                    textAnchor="middle"
                    className="map-icon"
                  >
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
            })}
        </svg>
        <p className="mapdetail" role="status" aria-live="polite">
          {detail}
        </p>
        <p className="dim mapnote">
          {t("map.schematic")} {t("map.hour", { time })} {t("map.grid")}
        </p>
      </div>

      <h2 className="chat-h" id="map-table-h">
        {t("map.table")}
      </h2>
      <Suspense fallback={<p className="empty">{t("map.loading")}</p>}>
        <CityTable points={points} selected={selected} onSelect={setSelected} />
      </Suspense>
    </div>
  );
}
