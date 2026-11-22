import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Reads the real design tokens from globals.css so the test cannot drift from the stylesheet. */
const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1] as string;
};
const num = (name: string): number => {
  const m = css.match(new RegExp(`--${name}:\\s*([0-9.]+)`));
  if (!m) throw new Error(`number --${name} not found`);
  return Number(m[1]);
};

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v * (1 - t) + b[i]! * t) as RGB;

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

  it("dark text and muted text on the smog sky at every haze level, with the blobs stacked (worst case)", () => {
    const clear = rgb(token("clear")),
      smog = rgb(token("smog")),
      blob = rgb(token("blob"));
    const blobOp = num("blob-op"),
      skyMix = num("sky-mix");
    const muted = rgb(token("muted"));
    let worstInk = Infinity,
      worstMuted = Infinity;
    for (let h = 0.04; h <= 1.0001; h += 0.02) {
      let bg = mix(clear, smog, h * skyMix);
      for (let i = 0; i < 3; i++) bg = mix(bg, blob, Math.min(1, h * blobOp));
      worstInk = Math.min(worstInk, ratio(ink, bg));
      worstMuted = Math.min(worstMuted, ratio(muted, bg));
    }
    expect(worstInk).toBeGreaterThanOrEqual(AA + 0.5);
    expect(worstMuted).toBeGreaterThanOrEqual(AA);
  });

  it("muted text on white cards and on the dark hero", () => {
    expect(ratio(rgb(token("muted")), [255, 255, 255])).toBeGreaterThanOrEqual(AA);
    expect(ratio(rgb(token("muted")), rgb(token("surface-2")))).toBeGreaterThanOrEqual(AA);
    expect(ratio(rgb(token("ember-deep")), [255, 255, 255])).toBeGreaterThanOrEqual(AA);
  });
});
