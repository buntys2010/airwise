import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module shared with the command-line script
import { PAGE_BUDGET_KB, checkBudget, parseBuildLog } from "./budget.mjs";

const LOG = `
   Creating an optimized production build ...
Route (app)                                 Size  First Load JS
┌ ○ /                                    11.4 kB         136 kB
├ ○ /_not-found                            996 B         104 kB
├ ƒ /api/chat                              132 B         103 kB
├ ○ /community                           2.04 kB         126 kB
├ ○ /guide                                 176 B         116 kB
└ ○ /map                                 4.65 kB         121 kB
+ First Load JS shared by all             103 kB
`;

describe("parseBuildLog", () => {
  it("reads first-load size per page and the shared size, leaving out API routes and the 404 page", () => {
    const parsedLog = parseBuildLog(LOG);
    expect(parsedLog.pages).toEqual({ "/": 136, "/community": 126, "/guide": 116, "/map": 121 });
    expect(parsedLog.shared).toBe(103);
  });
  it("copes with Windows line endings and empty input", () => {
    expect(parseBuildLog(LOG.replace(/\n/g, "\r\n")).pages["/"]).toBe(136);
    expect(parseBuildLog("")).toEqual({ pages: {}, shared: null });
  });
});

describe("checkBudget", () => {
  it("passes when every page and the shared bundle are within budget", () => {
    const verdict = checkBudget(parseBuildLog(LOG));
    expect(verdict.ok).toBe(true);
    expect(verdict.home).toBe(136);
    expect(verdict.worst).toEqual({ route: "/", kb: 136 });
  });
  it("fails, naming the page, when a page grows past the budget", () => {
    const verdict = checkBudget(parseBuildLog(LOG.replace("136 kB", `${PAGE_BUDGET_KB + 1} kB`)));
    expect(verdict.ok).toBe(false);
    expect(verdict.violations[0]).toMatch(/^\/ is 151 kB/);
  });
  it("fails when the shared bundle grows, or when nothing could be read", () => {
    expect(
      checkBudget(
        parseBuildLog(
          LOG.replace("shared by all             103 kB", "shared by all             130 kB"),
        ),
      ).ok,
    ).toBe(false);
    expect(checkBudget(parseBuildLog("nothing useful")).ok).toBe(false);
  });
  it("accepts a custom budget", () => {
    expect(checkBudget(parseBuildLog(LOG), { pageKb: 100 }).ok).toBe(false);
  });
});
