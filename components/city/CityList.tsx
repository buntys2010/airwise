/** The picker's popup list of matching cities, and the helpers that go with it. */
"use client";
import { useEffect } from "react";

import type { City } from "@/lib/cities";

import type { useLang } from "../LangProvider";

export const MAX_SHOWN = 50;

/** Keeps the highlighted option visible as the arrow keys move through a long list. */
export function useScrollIntoView(
  listRef: React.RefObject<HTMLUListElement | null>,
  open: boolean,
  active: number,
) {
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [listRef, active, open]);
}

export function resultsNote(count: number, t: ReturnType<typeof useLang>["t"]): string {
  if (count === 0) return t("city.none");
  if (count > MAX_SHOWN) return t("city.more", { n: MAX_SHOWN });
  return t("city.count", { n: count });
}

interface CityListProps {
  id: string;
  listRef: React.RefObject<HTMLUListElement | null>;
  label: string;
  open: boolean;
  shown: City[];
  active: number;
  currentId: string;
  onChoose: (c: City) => void;
  onHover: (i: number) => void;
}

/**
 * The popup list of matching cities. Keyboard operation lives on the input; options only need
 * pointer handlers.
 */
export function CityList({
  id,
  listRef,
  label,
  open,
  shown,
  active,
  currentId,
  onChoose,
  onHover,
}: Readonly<CityListProps>) {
  return (
    <ul
      id={`${id}-list`}
      ref={listRef}
      role="listbox"
      aria-label={label}
      className="citylist"
      hidden={!open}
    >
      {shown.map((c, i) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <li
          key={c.id}
          id={`${id}-o-${c.id}`}
          data-index={i}
          role="option"
          aria-selected={c.id === currentId}
          className={`cityopt${i === active ? " active" : ""}`}
          onMouseDown={
            (e) =>
              e.preventDefault() /* keep focus in the input so blur does not close the list first */
          }
          onClick={() => onChoose(c)}
          onMouseMove={() => onHover(i)}
        >
          <span>{c.name}</span>
          <small>{c.state}</small>
        </li>
      ))}
    </ul>
  );
}
