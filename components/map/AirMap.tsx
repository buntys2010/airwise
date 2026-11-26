"use client";
/** The schematic map of India with a marker per city. */

import { lazy, Suspense, useState } from "react";

import { CITIES } from "@/lib/cities";
import type { MapPoint } from "@/lib/data";
import { aqiFromPm, categoryOf } from "@/lib/engine";
import { CATEGORY_KEY } from "@/lib/i18n";

import { useLang } from "../LangProvider";
import { OUTLINE_POINTS, VIEW } from "./geo";
import { NamedMarker, SmallMarker } from "./MapMarkers";

/** The long table is only needed on this page, and only below the map, so it is loaded separately. */
const CityTable = lazy(() => import("./CityTable"));

const NAMED = new Set(CITIES.filter((c) => c.label).map((c) => c.id));

/**
 * Every city is a marker with a shape and a value in the table; the twelve biggest also carry a name and value on the map.
 * Tap a marker, or use "Show" in the table (keyboard), to read any city. The air feed is gridded, so near neighbours can share a value.
 */
type Translate = ReturnType<typeof useLang>["t"];

/** The sentence read out when a city is picked. */
function describe(p: MapPoint, t: Translate): string {
  return t("map.detail", {
    city: p.name,
    state: p.state,
    pm: p.pm,
    aqi: aqiFromPm(p.pm),
    level: t(CATEGORY_KEY[categoryOf(p.pm).tone]),
    source: p.source === "live" ? t("map.live") : t("map.est"),
  });
}

/** Schematic map of India with a marker per city, plus the table below it. */
export function AirMap({ points, time }: { points: MapPoint[]; time: string }) {
  const { t } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const estimate = t("map.est");
  const picked = points.find((p) => p.id === selected) ?? null;
  const detail = picked ? describe(picked, t) : t("map.hint");
  return (
    <div className="airmap">
      <div className="panel mapbox">
        <svg
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          role="img"
          aria-label={t("map.alt")}
          className="mapsvg"
        >
          <polygon className="map-land" points={OUTLINE_POINTS} />
          {/* small markers first, so the named cities and the selection draw on top */}
          {points
            .filter((p) => !NAMED.has(p.id))
            .map((p) => (
              <SmallMarker
                key={p.id}
                point={p}
                selected={p.id === selected}
                onSelect={setSelected}
                estimateLabel={estimate}
              />
            ))}
          {points
            .filter((p) => NAMED.has(p.id))
            .map((p) => (
              <NamedMarker
                key={p.id}
                point={p}
                selected={p.id === selected}
                onSelect={setSelected}
                estimateLabel={estimate}
              />
            ))}
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
