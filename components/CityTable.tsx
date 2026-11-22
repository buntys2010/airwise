"use client";
import { useMemo, useState } from "react";
import { searchCities } from "@/lib/cities";
import type { MapPoint } from "@/lib/data";
import { aqiFromPm, categoryOf } from "@/lib/engine";
import { CATEGORY_KEY } from "@/lib/i18n";
import { useLang } from "./LangProvider";

type SortKey = "name" | "state" | "pm";

/** Every city as text: searchable, sortable, and each row can be shown on the map. Fits a phone without clipping. */
export default function CityTable({ points, selected, onSelect }: { points: MapPoint[]; selected: string | null; onSelect: (id: string) => void }) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "pm", dir: "desc" });

  const rows = useMemo(() => {
    const ids = new Set(searchCities(query).map((c) => c.id));
    const list = points.filter((p) => ids.has(p.id));
    const sign = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => sign * (sort.key === "pm" ? a.pm - b.pm : sort.key === "state" ? a.state.localeCompare(b.state) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [points, query, sort]);

  const head = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="sortbtn" onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "pm" ? "desc" : "asc" }))}>
        {label}<span aria-hidden="true">{sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</span>
        <span className="sr-only"> {t("map.sort", { col: label })}</span>
      </button>
    </th>
  );

  return (
    <div className="citytable">
      <div className="searchrow">
        <label htmlFor="city-search" className="qhead">{t("map.search")}</label>
        <input id="city-search" type="search" className="textfield" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        <p className="statusline" role="status" aria-live="polite">{rows.length === 0 ? t("map.none") : t("map.count", { n: rows.length, total: points.length })}</p>
      </div>
      {/* A labelled, keyboard-scrollable region: the table wraps to fit a phone and only scrolls sideways on a narrower screen still. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe: scrollable-region-focusable) */}
      <div className="tablewrap" role="region" aria-labelledby="map-table-h" tabIndex={0}>
        <table className="maptable">
          <thead><tr>{head("name", t("map.city"))}{head("pm", t("map.pm"))}<th scope="col">{t("map.level")}</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const cat = categoryOf(p.pm);
              return (
                <tr key={p.id} data-city={p.id} className={p.id === selected ? "sel" : undefined}>
                  <th scope="row">
                    <button type="button" className="rowbtn" aria-pressed={p.id === selected} onClick={() => onSelect(p.id)}>
                      {p.name}<span className="sr-only">. {t("map.show", { city: p.name })}</span>
                    </button>
                    <small>{p.state}</small>
                  </th>
                  <td>{p.pm}<small>{p.source === "live" ? t("map.live") : t("map.est")}</small></td>
                  <td><span className="cat"><i aria-hidden="true">{cat.icon}</i>{t(CATEGORY_KEY[cat.tone])}</span><small>AQI {aqiFromPm(p.pm)}</small></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
