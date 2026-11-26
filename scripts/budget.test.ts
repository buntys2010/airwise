import { describe, expect, it } from "vitest";

// @ts-expect-error plain JavaScript module shared with the command-line script
import { checkBudget, PAGE_BUDGET_KB, summarizeBundles } from "./budget.mjs";

/** Chunk sizes in gzipped bytes, so no build is needed. */
const SIZES: Record<string, number> = {
  "a.js": 100_000,
  "b.js": 40_000,
  "home.js": 30_000,
  "map.js": 10_000,
  "notfound.js": 1_000,
};
const sizeOf = (path: string) => SIZES[path] ?? 0;

const STATS = [
  { route: "/", firstLoadChunkPaths: ["a.js", "b.js", "home.js"] },
  { route: "/map", firstLoadChunkPaths: ["a.js", "b.js", "map.js"] },
  { route: "/_not-found", firstLoadChunkPaths: ["a.js", "notfound.js"] },
];

describe("summarizeBundles", () => {
  it("sums each page's chunks, and takes the shared bundle from chunks every page lists", () => {
    const summary = summarizeBundles(STATS, sizeOf);
    expect(summary.pages).toEqual({ "/": 170, "/map": 150 });
    expect(summary.shared).toBe(140);
  });
  it("leaves out the 404 page, so it cannot shrink the shared bundle", () => {
    expect(summarizeBundles(STATS, sizeOf).pages).not.toHaveProperty("/_not-found");
  });
  it("counts a chunk shared by several pages once per page, and reads each file once", () => {
    const seen: string[] = [];
    summarizeBundles(STATS, (path: string) => (seen.push(path), sizeOf(path)));
    expect(seen.filter((path) => path === "b.js")).toHaveLength(1);
  });
  it("copes with no routes", () => {
    expect(summarizeBundles([], sizeOf)).toEqual({ pages: {}, shared: null });
  });
});

describe("checkBudget", () => {
  const within = { pages: { "/": 136, "/map": 121 }, shared: 103 };
  it("passes when every page and the shared bundle are within budget", () => {
    const verdict = checkBudget(within);
    expect(verdict.ok).toBe(true);
    expect(verdict.home).toBe(136);
    expect(verdict.worst).toEqual({ route: "/", kb: 136 });
  });
  it("fails, naming the page, when a page grows past the budget", () => {
    const verdict = checkBudget({ ...within, pages: { "/": PAGE_BUDGET_KB + 1 } });
    expect(verdict.ok).toBe(false);
    expect(verdict.violations[0]).toMatch(new RegExp(`^/ is ${PAGE_BUDGET_KB + 1} kB`));
  });
  it("fails when the shared bundle grows, or when nothing could be read", () => {
    expect(checkBudget({ ...within, shared: 1000 }).ok).toBe(false);
    expect(checkBudget({ pages: {}, shared: null }).ok).toBe(false);
  });
  it("accepts a custom budget", () => {
    expect(checkBudget(within, { pageKb: 100 }).ok).toBe(false);
  });
});
