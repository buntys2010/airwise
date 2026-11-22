"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CITIES, searchCities, type City } from "@/lib/cities";
import { useLang } from "./LangProvider";

const MAX_SHOWN = 50;

/**
 * A searchable city picker (ARIA 1.2 editable combobox with a list). Type a city, an old name (Bombay, Madras) or a state;
 * arrow keys move, Enter chooses, Escape closes. The English name always works. Nothing here uses GPS.
 */
export function CityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useLang();
  const id = useId();
  const listId = `${id}-list`;
  const current = CITIES.find((c) => c.id === value) ?? CITIES[0];
  const [text, setText] = useState(current.name);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false); // false right after opening: show every city, not only the chosen one
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (!open) setText(current.name); }, [current.name, open]);

  const results = useMemo<City[]>(() => (typing ? searchCities(text) : CITIES), [text, typing]);
  const shown = results.slice(0, MAX_SHOWN);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

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

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); setActive(Math.max(0, shown.findIndex((c) => c.id === current.id))); } else setActive((a) => (a + 1) % Math.max(1, shown.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) setOpen(true); else setActive((a) => (a - 1 + shown.length) % Math.max(1, shown.length)); }
    else if (e.key === "Enter") { if (open && shown[active]) { e.preventDefault(); choose(shown[active]); } }
    else if (e.key === "Escape") { if (open) { e.preventDefault(); close(); } }
    else if (e.key === "Home" && open) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && open) { e.preventDefault(); setActive(Math.max(0, shown.length - 1)); }
  }

  const status = results.length === 0 ? t("city.none") : results.length > MAX_SHOWN ? t("city.more", { n: MAX_SHOWN }) : t("city.count", { n: results.length });
  return (
    <div className="citypicker">
      <label htmlFor={`${id}-input`} className="sr-only">{t("strip.city")}</label>
      <input
        id={`${id}-input`} type="text" role="combobox" className="citypick-input" autoComplete="off" spellCheck={false}
        aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-describedby={`${id}-hint`}
        aria-activedescendant={open && shown[active] ? `${id}-o-${shown[active].id}` : undefined}
        placeholder={t("city.hint")} value={text}
        onChange={(e) => { setText(e.target.value); setTyping(true); setActive(0); setOpen(true); }}
        onFocus={(e) => { e.currentTarget.select(); setOpen(true); setTyping(false); setActive(Math.max(0, CITIES.findIndex((c) => c.id === current.id))); }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          const exact = searchCities(text).find((c) => c.name.toLowerCase() === text.trim().toLowerCase());
          if (typing && exact) choose(exact); else close();
        }}
        onKeyDown={onKey}
      />
      <span id={`${id}-hint`} className="sr-only">{t("city.hint")}</span>
      <ul id={listId} ref={listRef} role="listbox" aria-label={t("strip.city")} className="citylist" hidden={!open}>
        {shown.map((c, i) => (
          // Keyboard operation lives on the input (aria-activedescendant + onKeyDown); options only need the pointer handlers.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li key={c.id} id={`${id}-o-${c.id}`} data-index={i} role="option" aria-selected={c.id === current.id}
            className={`cityopt${i === active ? " active" : ""}`}
            onMouseDown={(e) => e.preventDefault() /* keep focus in the input so blur does not close the list first */}
            onClick={() => choose(c)} onMouseMove={() => setActive(i)}>
            <span>{c.name}</span><small>{c.state}</small>
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">{open ? status : ""}</p>
    </div>
  );
}
