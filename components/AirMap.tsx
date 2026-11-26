/** The India map of city air, loaded lazily because it is the heaviest component. */
"use client";
import { lazy, Suspense, useState } from "react";

import type { MapPoint } from "@/lib/air/server";
import { aqiFromPm, categoryOf } from "@/lib/engine/aqi";
import { CATEGORY_KEY } from "@/lib/i18n";

import { useLang } from "./LangProvider";
import { NAMED, OUTLINE, VIEW, xFor, yFor } from "./map/geo";
import { NamedMarker, SmallMarker } from "./map/Markers";

/** The long table is only needed on this page, and only below the map, so it is loaded separately. */
const CityTable = lazy(() => import("./CityTable"));

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
            .map((p) => (
              <SmallMarker
                key={p.id}
                point={p}
                selected={p.id === selected}
                onSelect={setSelected}
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
