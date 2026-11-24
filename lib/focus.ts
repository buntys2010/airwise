/** A box in viewport pixels, as returned by getBoundingClientRect. */
export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * WCAG 2.2 "focus not obscured": how far to scroll the page up so a focused control sits clear of
 * a fixed bar.
 * Browsers only scroll a focused control into view when it is off screen, so a control that is on
 * screen but hidden
 * under the bottom bar needs help. Returns 0 when nothing overlaps, or when the control is inside
 * the bar itself.
 */
export function scrollNeeded(el: Rect, bar: Rect, margin = 16): number {
  const overlapsHorizontally = el.right > bar.left && el.left < bar.right;
  const overlapsVertically = el.bottom > bar.top && el.top < bar.bottom;
  if (!overlapsHorizontally || !overlapsVertically) return 0;
  return Math.ceil(el.bottom - bar.top + margin);
}
