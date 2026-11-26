"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { CITIES, type City, searchCities } from "@/lib/cities";

import { navigate } from "./cityNav";

export const MAX_SHOWN = 50;

/** State of the city combobox: what is typed, what is open, which option is highlighted, and what is listed. */
export function useCityPicker(value: string, onChange: (id: string) => void) {
  const current = CITIES.find((c) => c.id === value) ?? CITIES[0];
  const [text, setText] = useState(current.name);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false); // false right after opening: show every city, not only the chosen one
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) setText(current.name);
  }, [current.name, open]);

  const results = useMemo<City[]>(() => (typing ? searchCities(text) : CITIES), [text, typing]);
  const shown = results.slice(0, MAX_SHOWN);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
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

  return {
    current,
    text,
    setText,
    open,
    setOpen,
    active,
    setActive,
    typing,
    setTyping,
    results,
    shown,
    listRef,
    choose,
    close,
  };
}

export type PickerState = ReturnType<typeof useCityPicker>;

/** Event handlers for the combobox input, built from the picker state. */
export function pickerHandlers(p: PickerState) {
  return {
    onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      const result = navigate(e.key, {
        open: p.open,
        active: p.active,
        count: p.shown.length,
        currentIndex: p.shown.findIndex((c) => c.id === p.current.id),
      });
      if (!result) return;
      e.preventDefault();
      if (result.open !== undefined) p.setOpen(result.open);
      if (result.active !== undefined) p.setActive(result.active);
      if (result.effect === "choose") p.choose(p.shown[p.active]);
      if (result.effect === "close") p.close();
    },
    onBlur() {
      const exact = searchCities(p.text).find((c) => c.name.toLowerCase() === p.text.trim().toLowerCase());
      if (p.typing && exact) p.choose(exact);
      else p.close();
    },
    onFocus(e: React.FocusEvent<HTMLInputElement>) {
      e.currentTarget.select();
      p.setOpen(true);
      p.setTyping(false);
      p.setActive(
        Math.max(
          0,
          CITIES.findIndex((c) => c.id === p.current.id),
        ),
      );
    },
    onChange(e: React.ChangeEvent<HTMLInputElement>) {
      p.setText(e.target.value);
      p.setTyping(true);
      p.setActive(0);
      p.setOpen(true);
    },
  };
}
