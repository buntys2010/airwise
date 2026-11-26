"use client";
/** The searchable city combobox. */

import { useId } from "react";

import type { City } from "@/lib/cities";

import { useLang } from "../LangProvider";
import { MAX_SHOWN, pickerHandlers, useCityPicker } from "./useCityPicker";

type Translate = ReturnType<typeof useLang>["t"];

function statusText(count: number, t: Translate): string {
  if (count === 0) return t("city.none");
  if (count > MAX_SHOWN) return t("city.more", { n: MAX_SHOWN });
  return t("city.count", { n: count });
}

interface OptionProps {
  city: City;
  index: number;
  idPrefix: string;
  selected: boolean;
  active: boolean;
  onChoose: (c: City) => void;
  onHover: (i: number) => void;
}

/** One city in the list. Keyboard use goes through the combobox input (arrows + Enter), so options need no key handler. */
function CityOption({ city, index, idPrefix, selected, active, onChoose, onHover }: OptionProps) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
      id={`${idPrefix}-o-${city.id}`}
      data-index={index}
      role="option"
      aria-selected={selected}
      className={`cityopt${active ? " active" : ""}`}
      // Keep focus in the input so blur does not close the list before the click lands.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChoose(city)}
      onMouseMove={() => onHover(index)}
    >
      <span>{city.name}</span>
      <small>{city.state}</small>
    </li>
  );
}

/**
 * A searchable city picker (ARIA 1.2 editable combobox with a list). Type a city, an old name (Bombay, Madras) or a state;
 * arrow keys move, Enter chooses, Escape closes. The English name always works. Nothing here uses GPS.
 */
export function CityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useLang();
  const id = useId();
  const picker = useCityPicker(value, onChange);
  const { current, text, open, setOpen, active, setActive, shown, results, listRef, choose } = picker;
  const handlers = pickerHandlers(picker);

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
        onClick={() => setOpen(true)}
        {...handlers}
      />
      <span id={`${id}-hint`} className="sr-only">
        {t("city.hint")}
      </span>
      <ul
        id={`${id}-list`}
        ref={listRef}
        role="listbox"
        aria-label={t("strip.city")}
        className="citylist"
        hidden={!open}
      >
        {shown.map((c, i) => (
          <CityOption
            key={c.id}
            city={c}
            index={i}
            idPrefix={id}
            selected={c.id === current.id}
            active={i === active}
            onChoose={choose}
            onHover={setActive}
          />
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {open ? statusText(results.length, t) : ""}
      </p>
    </div>
  );
}
