/** The city picker: a searchable list that is also usable with the keyboard and a screen reader. */
"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { CITIES, type City, FALLBACK_CITY, searchCities } from "@/lib/cities";

import { useLang } from "./LangProvider";

const MAX_SHOWN = 50;

/** Keeps the highlighted option visible as the arrow keys move through a long list. */
function useScrollIntoView(
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

function resultsNote(count: number, t: ReturnType<typeof useLang>["t"]): string {
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
function CityList({
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

/**
 * A searchable city picker (ARIA 1.2 editable combobox with a list). Type a city, an old name
 * (Bombay, Madras) or a state;
 * arrow keys move, Enter chooses, Escape closes. The English name always works. Nothing here uses GPS.
 */
export function CityPicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (id: string) => void }>) {
  const { t } = useLang();
  const id = useId();
  const current = CITIES.find((c) => c.id === value) ?? FALLBACK_CITY;
  const [text, setText] = useState(current.name);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // false right after opening: show every city, not only the chosen one
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) setText(current.name);
  }, [current.name, open]);

  const results = useMemo<City[]>(() => (typing ? searchCities(text) : CITIES), [text, typing]);
  const shown = results.slice(0, MAX_SHOWN);
  const currentIndex = Math.max(
    0,
    CITIES.findIndex((c) => c.id === current.id),
  );

  useScrollIntoView(listRef, open, active);

  function choose(c: City) {
    onChange(c.id);
    setText(c.name);
    setOpen(false);
    setTyping(false);
  }
  function close(restore = true) {
    setOpen(false);
    setTyping(false);
    if (restore) setText(current.name);
  }

  function arrowDown() {
    if (open) {
      setActive((a) => (a + 1) % Math.max(1, shown.length));
      return;
    }
    setOpen(true);
    setActive(
      Math.max(
        0,
        shown.findIndex((c) => c.id === current.id),
      ),
    );
  }

  function arrowUp() {
    if (open) setActive((a) => (a - 1 + shown.length) % Math.max(1, shown.length));
    else setOpen(true);
  }

  /** Each key returns true when it acted, so the browser default (caret move, form submit) is suppressed. */
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const keys: Record<string, () => boolean> = {
      ArrowDown: () => {
        arrowDown();
        return true;
      },
      ArrowUp: () => {
        arrowUp();
        return true;
      },
      Enter: () => {
        if (!open || !shown[active]) return false;
        choose(shown[active]);
        return true;
      },
      Escape: () => {
        if (!open) return false;
        close();
        return true;
      },
      Home: () => {
        if (!open) return false;
        setActive(0);
        return true;
      },
      End: () => {
        if (!open) return false;
        setActive(Math.max(0, shown.length - 1));
        return true;
      },
    };
    const handler = Object.hasOwn(keys, e.key) ? keys[e.key] : undefined;
    if (handler?.()) e.preventDefault();
  }

  const status = resultsNote(results.length, t);
  return (
    <div className="citypicker">
      <label htmlFor={`${id}-input`} className="sr-only">
        {t("strip.city")}
      </label>
      <input
        id={`${id}-input`}
        type="text"
        role="combobox"
        className="citypick-input"
        autoComplete="off"
        spellCheck={false}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-describedby={`${id}-hint`}
        aria-activedescendant={open && shown[active] ? `${id}-o-${shown[active].id}` : undefined}
        placeholder={t("city.hint")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTyping(true);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
          setTyping(false);
          setActive(currentIndex);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          const exact = searchCities(text).find(
            (c) => c.name.toLowerCase() === text.trim().toLowerCase(),
          );
          if (typing && exact) choose(exact);
          else close();
        }}
        onKeyDown={onKey}
      />
      <span id={`${id}-hint`} className="sr-only">
        {t("city.hint")}
      </span>
      <CityList
        id={id}
        listRef={listRef}
        label={t("strip.city")}
        open={open}
        shown={shown}
        active={active}
        currentId={current.id}
        onChoose={choose}
        onHover={setActive}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {open ? status : ""}
      </p>
    </div>
  );
}
