/** Keyboard operation for the city picker's combobox: arrows move, Enter chooses, Escape closes. */
import type { KeyboardEvent } from "react";

import type { City } from "@/lib/cities";

interface KeyState {
  open: boolean;
  shown: City[];
  active: number;
  setOpen: (open: boolean) => void;
  setActive: (update: number | ((current: number) => number)) => void;
  choose: (city: City) => void;
  close: () => void;
  /** Index of the chosen city in `shown`, used when the list opens from the keyboard. */
  currentShownIndex: number;
}

/** A key handler for the input. Each key returns true when it acted, so the browser default is suppressed. */
export function cityKeyHandler(state: Readonly<KeyState>) {
  const { open, shown, active, setOpen, setActive, choose, close, currentShownIndex } = state;
  const count = Math.max(1, shown.length);
  const keys: Record<string, () => boolean> = {
    ArrowDown: () => {
      if (open) setActive((a) => (a + 1) % count);
      else {
        setOpen(true);
        setActive(Math.max(0, currentShownIndex));
      }
      return true;
    },
    ArrowUp: () => {
      if (open) setActive((a) => (a - 1 + shown.length) % count);
      else setOpen(true);
      return true;
    },
    Enter: () => {
      const city = shown[active];
      if (!open || !city) return false;
      choose(city);
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
  return (e: KeyboardEvent<HTMLInputElement>) => {
    const handler = Object.hasOwn(keys, e.key) ? keys[e.key] : undefined;
    if (handler?.()) e.preventDefault();
  };
}
