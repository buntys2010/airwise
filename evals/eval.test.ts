/* eslint-disable no-console -- the eval report prints its pass rate */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { CASES, runCases, summarise } from "./cases";

/**
 * `npm run eval` runs this. Every case must pass. With EVAL_WRITE_REPORT=1 it also rewrites docs/EVAL_REPORT.md,
 * which is committed, so the report in the repo is the output of a real run.
 */
const results = runCases();
const summary = summarise(results);

describe("eval set", () => {
  it("has enough cases across every category", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(45);
    expect(Object.keys(summary.byCategory)).toHaveLength(6);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length); // ids are unique
  });
  for (const r of results) {
    it(`${r.id}: ${r.category} - ${r.expect}`, () => {
      expect(r.passed, `${r.id} failed`).toBe(true);
    });
  }
});

afterAll(() => {
  const line = `Eval pass rate: ${summary.passed}/${summary.total} (${Math.round((summary.passed / summary.total) * 100)}%)`;
  console.log(
    `\n${line}\n${Object.entries(summary.byCategory)
      .map(([k, v]) => `  ${k}: ${v.passed}/${v.total}`)
      .join("\n")}\n`,
  );
  if (process.env.EVAL_WRITE_REPORT === "1") {
    const md = [
      "# Eval report",
      "",
      "Output of `npm run eval` (regenerate with `EVAL_WRITE_REPORT=1 npm run eval`). Deterministic and offline: no network, no model calls.",
      "",
      `**${line}**`,
      "",
      "| Category | Passed | Total |",
      "|---|---|---|",
      ...Object.entries(summary.byCategory).map(([k, v]) => `| ${k} | ${v.passed} | ${v.total} |`),
      "",
      "## Cases",
      "",
      "| Id | Category | What must be true | Result |",
      "|---|---|---|---|",
      ...results.map((r) => `| ${r.id} | ${r.category} | ${r.expect} | ${r.passed ? "pass" : "FAIL"} |`),
      "",
    ].join("\n");
    writeFileSync(path.resolve(__dirname, "../docs/EVAL_REPORT.md"), md);
  }
});
