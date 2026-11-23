"use client";
import { useMemo, useState } from "react";
import { searchCities } from "@/lib/cities";
import type { MapPoint } from "@/lib/data";
import { aqiFromPm, categoryOf } from "@/lib/engine";
import { CATEGORY_KEY } from "@/lib/i18n";
import { useLang } from "./LangProvider";

type SortKey = "name" | "state" | "pm";

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
const ARROW = { asc: " ▲", desc: " ▼" } as const;

function compareRows(a: MapPoint, b: MapPoint, key: SortKey): number {
  if (key === "pm") return a.pm - b.pm;
  if (key === "state") return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name);
}

type Sort = { key: SortKey; dir: "asc" | "desc" };

/** A sortable column header: pressing it sorts by the column, and again reverses the order. */
function SortHeader({
  column,
  label,
  sort,
  setSort,
}: Readonly<{
  column: SortKey;
  label: string;
  sort: Sort;
  setSort: (update: (current: Sort) => Sort) => void;
}>) {
  const { t } = useLang();
  const active = sort.key === column;
  const ariaSort = active ? ARIA_SORT[sort.dir] : "none";
  const arrow = active ? ARROW[sort.dir] : "";
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className="sortbtn"
        onClick={() =>
          setSort((current) =>
            current.key === column
              ? { key: column, dir: current.dir === "asc" ? "desc" : "asc" }
              : { key: column, dir: column === "pm" ? "desc" : "asc" },
          )
        }
      >
        {label}
        <span aria-hidden="true">{arrow}</span>
        <span className="sr-only"> {t("map.sort", { col: label })}</span>
      </button>
    </th>
  );
}

/** One city's row: the name (a button that shows it on the map), its PM2.5 and its level. */
function CityRow({
  point,
  selected,
  onSelect,
}: Readonly<{ point: MapPoint; selected: boolean; onSelect: (id: string) => void }>) {
  const { t } = useLang();
  const cat = categoryOf(point.pm);
  return (
    <tr data-city={point.id} className={selected ? "sel" : undefined}>
      <th scope="row">
        <button
          type="button"
          className="rowbtn"
          aria-pressed={selected}
          onClick={() => onSelect(point.id)}
        >
          {point.name}
          <span className="sr-only">. {t("map.show", { city: point.name })}</span>
        </button>
        <small>{point.state}</small>
      </th>
      <td>
        {point.pm}
        <small>{point.source === "live" ? t("map.live") : t("map.est")}</small>
      </td>
      <td>
        <span className="cat">
          <i aria-hidden="true">{cat.icon}</i>
          {t(CATEGORY_KEY[cat.tone])}
        </span>
        <small>AQI {aqiFromPm(point.pm)}</small>
      </td>
    </tr>
  );
}

/** The sortable table of cities. */
function MapTable({
  rows,
  sort,
  setSort,
  selected,
  onSelect,
}: Readonly<{
  rows: MapPoint[];
  sort: Sort;
  setSort: (update: (current: Sort) => Sort) => void;
  selected: string | null;
  onSelect: (id: string) => void;
}>) {
  const { t } = useLang();
  return (
    <table className="maptable">
      <thead>
        <tr>
          <SortHeader column="name" label={t("map.city")} sort={sort} setSort={setSort} />
          <SortHeader column="pm" label={t("map.pm")} sort={sort} setSort={setSort} />
          <th scope="col">{t("map.level")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((point) => (
          <CityRow
            key={point.id}
            point={point}
            selected={point.id === selected}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </table>
  );
}

/** Every city as text: searchable, sortable, and each row can be shown on the map. Fits a phone without clipping. */
export default function CityTable({
  points,
  selected,
  onSelect,
}: Readonly<{
  points: MapPoint[];
  selected: string | null;
  onSelect: (id: string) => void;
}>) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "pm", dir: "desc" });

  const rows = useMemo(() => {
    const ids = new Set(searchCities(query).map((c) => c.id));
    const list = points.filter((p) => ids.has(p.id));
    const sign = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => sign * compareRows(a, b, sort.key));
  }, [points, query, sort]);

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
          {rows.length === 0
            ? t("map.none")
            : t("map.count", { n: rows.length, total: points.length })}
        </p>
      </div>
      {/* A labelled, keyboard-scrollable region: the table wraps to fit a phone and only scrolls sideways on a narrower screen still. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe: scrollable-region-focusable) */}
      <div className="tablewrap" role="region" aria-labelledby="map-table-h" tabIndex={0}>
        <MapTable
          rows={rows}
          sort={sort}
          setSort={setSort}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
