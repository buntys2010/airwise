"use client";
/** The searchable, sortable table of every city. */

import { useMemo, useState } from "react";

import { searchCities } from "@/lib/cities";
import type { MapPoint } from "@/lib/data";
import { aqiFromPm, categoryOf } from "@/lib/engine";
import { CATEGORY_KEY } from "@/lib/i18n";

import { useLang } from "../LangProvider";

type SortKey = "name" | "state" | "pm";
type SortDir = "asc" | "desc";
interface Sort {
  key: SortKey;
  dir: SortDir;
}

type Translate = ReturnType<typeof useLang>["t"];

const COMPARE: Record<SortKey, (a: MapPoint, b: MapPoint) => number> = {
  pm: (a, b) => a.pm - b.pm,
  state: (a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
};

/** The points that match the search, in the chosen order. */
function visibleRows(points: MapPoint[], query: string, sort: Sort): MapPoint[] {
  const ids = new Set(searchCities(query).map((c) => c.id));
  const sign = sort.dir === "asc" ? 1 : -1;
  return points.filter((p) => ids.has(p.id)).sort((a, b) => sign * COMPARE[sort.key](a, b));
}

/** Clicking the active column flips the direction; a new column starts high-to-low for PM2.5 and A-to-Z otherwise. */
function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "pm" ? "desc" : "asc" };
}

function SortHeader({
  sortKey,
  label,
  sort,
  onSort,
  t,
}: {
  sortKey: SortKey;
  label: string;
  sort: Sort;
  onSort: (k: SortKey) => void;
  t: Translate;
}) {
  const isActive = sort.key === sortKey;
  const ariaSort = isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" className="sortbtn" onClick={() => onSort(sortKey)}>
        {label}
        <span aria-hidden="true">{isActive ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</span>
        <span className="sr-only"> {t("map.sort", { col: label })}</span>
      </button>
    </th>
  );
}

function CityRow({
  point: p,
  selected,
  onSelect,
  t,
}: {
  point: MapPoint;
  selected: boolean;
  onSelect: (id: string) => void;
  t: Translate;
}) {
  const cat = categoryOf(p.pm);
  return (
    <tr data-city={p.id} className={selected ? "sel" : undefined}>
      <th scope="row">
        <button type="button" className="rowbtn" aria-pressed={selected} onClick={() => onSelect(p.id)}>
          {p.name}
          <span className="sr-only">. {t("map.show", { city: p.name })}</span>
        </button>
        <small>{p.state}</small>
      </th>
      <td>
        {p.pm}
        <small>{p.source === "live" ? t("map.live") : t("map.est")}</small>
      </td>
      <td>
        <span className="cat">
          <i aria-hidden="true">{cat.icon}</i>
          {t(CATEGORY_KEY[cat.tone])}
        </span>
        <small>AQI {aqiFromPm(p.pm)}</small>
      </td>
    </tr>
  );
}

/** Every city as text: searchable, sortable, and each row can be shown on the map. Fits a phone without clipping. */
export default function CityTable({
  points,
  selected,
  onSelect,
}: {
  points: MapPoint[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "pm", dir: "desc" });
  const rows = useMemo(() => visibleRows(points, query, sort), [points, query, sort]);
  const onSort = (key: SortKey) => setSort((s) => nextSort(s, key));

  return (
    <div className="citytable">
      <div className="searchrow">
        <label htmlFor="city-search" className="qhead">
          {t("map.search")}
        </label>
        <input
          id="city-search"
          type="search"
          className="textfield"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <p className="statusline" role="status" aria-live="polite">
          {rows.length === 0 ? t("map.none") : t("map.count", { n: rows.length, total: points.length })}
        </p>
      </div>
      {/* A labelled, keyboard-scrollable region: the table wraps to fit a phone and only scrolls sideways on a narrower screen still. */}
      <div
        className="tablewrap"
        role="region"
        aria-labelledby="map-table-h"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard-scrollable region
        tabIndex={0}
      >
        <table className="maptable">
          <thead>
            <tr>
              <SortHeader sortKey="name" label={t("map.city")} sort={sort} onSort={onSort} t={t} />
              <SortHeader sortKey="pm" label={t("map.pm")} sort={sort} onSort={onSort} t={t} />
              <th scope="col">{t("map.level")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <CityRow key={p.id} point={p} selected={p.id === selected} onSelect={onSelect} t={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
