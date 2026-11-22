/**
 * Geometry for the cigarette row: pure, so it can be tested without a browser.
 * Every length comes from engine figures passed in; nothing is computed here that the engine did not.
 *
 * One slot per whole cigarette-equivalent, the last one partial. Each cigarette, from the filter upward:
 *   to-come (what is still ahead today), the ember where it is burning, and ash (what has burned so far).
 * `ghost` marks the outline of a cigarette in the do-nothing day, so a fix visibly shortens the same row.
 */
export const MAX_CIGS = 10;

export interface Slot {
  index: number;
  /** Part of the do-nothing day: drawn as a faint outline. */
  ghost: boolean;
  /** 0 to 1: how much of this cigarette is part of the day with the plan. */
  length: number;
  /** 0 to 1: how much of it has burned so far today. Never more than `length`. */
  ash: number;
  /** length minus ash: what is still ahead today. */
  toCome: number;
  /** True while this cigarette is the one being smoked right now. */
  burning: boolean;
}

export interface Row { slots: Slot[]; extra: number }

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function cigaretteRow(baseDay: number, planDay: number, soFar: number, cap = MAX_CIGS): Row {
  const wanted = Math.max(Math.ceil(baseDay), Math.ceil(planDay), 1);
  const n = Math.min(cap, wanted);
  const slots: Slot[] = [];
  for (let i = 0; i < n; i++) {
    const length = clamp01(planDay - i);
    const ash = Math.min(length, clamp01(soFar - i));
    slots.push({ index: i, ghost: i < Math.ceil(baseDay), length, ash, toCome: length - ash, burning: ash > 0 && length - ash > 0 });
  }
  return { slots, extra: Math.max(0, Math.ceil(planDay) - cap) };
}
