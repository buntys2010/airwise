import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Reads the real design tokens from globals.css so the test cannot drift from the stylesheet. */
const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};
const num = (name: string): number => {
  const m = css.match(new RegExp(`--${name}:\\s*([0-9.]+)`));
  if (!m) throw new Error(`number --${name} not found`);
  return Number(m[1]);
};

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v * (1 - t) + b[i] * t) as RGB;

const AA = 4.5;

describe("colour contrast (WCAG AA, measured from globals.css)", () => {
  const ink = rgb(token("ink"));
  const onInk = rgb(token("on-ink"));
  const dim = rgb(token("on-ink-dim"));
  const ink3 = rgb(token("ink-3"));
  const breath = rgb(token("breath"));

  it("text on the dark panels", () => {
    expect(ratio(onInk, ink)).toBeGreaterThanOrEqual(AA);
    expect(ratio(dim, ink)).toBeGreaterThanOrEqual(AA);
    expect(ratio(onInk, ink3)).toBeGreaterThanOrEqual(AA);
    expect(ratio(dim, ink3)).toBeGreaterThanOrEqual(AA);
    expect(ratio(breath, ink)).toBeGreaterThanOrEqual(AA);
    expect(ratio(rgb(token("ember")), ink)).toBeGreaterThanOrEqual(AA);
  });

  it("button text on the accent fill", () => {
    expect(ratio(ink, breath)).toBeGreaterThanOrEqual(AA);
  });

  it("notice accent on white", () => {
    expect(ratio(rgb(token("breath-deep")), [255, 255, 255])).toBeGreaterThanOrEqual(AA);
  });

  it("dark text on the smog sky at every haze level, with all blobs and grain stacked (worst case)", () => {
    const clear = rgb(token("clear")), smog = rgb(token("smog"));
    const blobs = ["blob-a", "blob-b", "blob-c"].map((n) => rgb(token(n)));
    const blobOp = num("blob-op"), grainOp = num("grain-op");
    const grain: RGB = [0.3, 0.22, 0.1];
    let worst = Infinity;
    for (let h = 0.04; h <= 1.0001; h += 0.02) {
      let bg = mix(clear, smog, h);
      for (const b of blobs) bg = mix(bg, b, Math.min(1, h * blobOp));
      const a = h * grainOp * 0.9; // grain layer is multiply-blended at ~0.9 alpha
      bg = bg.map((v, i) => v * (1 - a * (1 - grain[i]))) as RGB;
      worst = Math.min(worst, ratio(ink, bg));
    }
    expect(worst).toBeGreaterThanOrEqual(AA + 0.5);
  });
});
