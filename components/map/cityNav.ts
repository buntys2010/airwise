/** Keyboard navigation for the city combobox, as a pure function so every key can be tested without a DOM. */

export interface NavState {
  open: boolean;
  /** Index of the highlighted option. */
  active: number;
  /** How many options are shown. */
  count: number;
  /** Index of the currently chosen city in the shown list, or -1. */
  currentIndex: number;
}

/** What a key press asks for. Unset fields mean "leave as is". */
export interface NavResult {
  open?: boolean;
  active?: number;
  /** Run an effect after the state change. */
  effect?: "choose" | "close";
}

const wrap = (index: number, count: number): number => (index + Math.max(1, count)) % Math.max(1, count);

type KeyHandler = (s: NavState) => NavResult | null;

const HANDLERS: Record<string, KeyHandler> = {
  ArrowDown: (s) =>
    s.open ? { active: wrap(s.active + 1, s.count) } : { open: true, active: Math.max(0, s.currentIndex) },
  ArrowUp: (s) => (s.open ? { active: wrap(s.active - 1, s.count) } : { open: true }),
  Enter: (s) => (s.open && s.active < s.count ? { effect: "choose" } : null),
  Escape: (s) => (s.open ? { effect: "close" } : null),
  Home: (s) => (s.open ? { active: 0 } : null),
  End: (s) => (s.open ? { active: Math.max(0, s.count - 1) } : null),
};

/** The effect of a key on the combobox, or null when the key is not ours to handle (so the browser keeps its default). */
export function navigate(key: string, state: NavState): NavResult | null {
  return HANDLERS[key]?.(state) ?? null;
}
