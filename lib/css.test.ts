import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

/**
 * All bodies of rules whose selector is exactly `selector`. Plain string scanning, so there is no
 * regex to get wrong.
 */
function rules(selector: string): string {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector, from);
    if (at < 0) break;
    from = at + selector.length;
    const before = css[at - 1];
    if (before && !/[\s,}]/.test(before)) continue; // part of a longer selector
    const open = css.indexOf("{", from);
    const between = css.slice(from, open).trim();
    if (between !== "" && between !== ",") continue; // not directly followed by a rule body
    out.push(css.slice(open + 1, css.indexOf("}", open)));
  }
  return out.join("\n");
}

describe("stylesheet guarantees", () => {
  it("the room's smog layer follows the same --haze variable as the page", () => {
    expect(rules(".smog")).toMatch(/opacity:\s*calc\(var\(--haze\)/);
    expect(rules(".sun")).toMatch(/var\(--haze\)/);
  });
  it("the haze motion is static under prefers-reduced-motion", () => {
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThan(-1);
    const reduced = css.slice(start);
    expect(reduced).toMatch(/\.smog\s*\{\s*transition:\s*none/);
    expect(reduced).toMatch(/\.blob\s*\{\s*animation:\s*none/);
  });
  it("on phones the floating bar has clearance: page padding and scroll padding exceed the bar height", () => {
    const pad = Number(/body \{ padding-bottom: (\d+)px/.exec(css)?.[1]);
    const scroll = Number(/scroll-padding-bottom: (\d+)px/.exec(css)?.[1]);
    const bar = 52,
      barPadding = 12,
      lift = 14; // 52 px buttons, the bar's own padding and its distance from the screen edge
    expect(pad).toBeGreaterThanOrEqual(bar + barPadding + lift);
    expect(scroll).toBeGreaterThanOrEqual(pad);
    expect(rules(".dock")).toMatch(/position:\s*fixed/);
    expect(rules(".hasdock .main-wrap")).toMatch(/padding-bottom:\s*1[1-9]\dpx/);
  });
  it("touch targets and markers are at least 44 px", () => {
    expect(rules(".marker")).toMatch(/width:\s*44px;\s*height:\s*44px/);
    expect(rules(".btn.small")).toMatch(/min-height:\s*44px/);
  });
  it("the font stacks fall back to system Devanagari fonts, with no webfont download", () => {
    expect(css).toMatch(/--font-body:[^;]*Nirmala UI[^;]*Noto Sans Devanagari/);
    expect(css).toMatch(/--font-display:[^;]*Nirmala UI[^;]*Noto Sans Devanagari/);
    expect(css).not.toMatch(/@font-face/);
  });
});

describe("the cigarette row", () => {
  it("the strip at the very top keeps its sticks short enough to fit a phone", () => {
    expect(rules(".citycigs .stick")).toMatch(/width:\s*52px/);
    expect(rules(".citycigs .cigrow")).toMatch(/flex-wrap:\s*wrap/);
  });
});
