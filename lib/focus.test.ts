import { describe, expect, it } from "vitest";

import { scrollNeeded } from "./focus";

const bar = { top: 780, bottom: 844, left: 0, right: 390 };

describe("scrollNeeded", () => {
  it("is zero when the control is clear of the bar", () => {
    expect(scrollNeeded({ top: 100, bottom: 150, left: 10, right: 200 }, bar)).toBe(0);
    expect(scrollNeeded({ top: 700, bottom: 780, left: 10, right: 200 }, bar)).toBe(0); // touching, not overlapping
  });
  it("scrolls just enough to clear the bar, plus a margin, when the control is under it", () => {
    expect(scrollNeeded({ top: 790, bottom: 834, left: 10, right: 200 }, bar)).toBe(834 - 780 + 16);
    expect(scrollNeeded({ top: 770, bottom: 800, left: 10, right: 200 }, bar, 0)).toBe(20); // partly under
  });
  it("is zero when the control is entirely above or below in another column", () => {
    expect(scrollNeeded({ top: 790, bottom: 834, left: 400, right: 500 }, bar)).toBe(0);
  });
});
