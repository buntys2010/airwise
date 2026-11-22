#!/usr/bin/env node
/**
 * `npm run check`: one command that proves the build is healthy and prints a proof card of real numbers.
 * Runs the type-check, the whole test suite (which includes the accessibility scans and the eval set), a production
 * build with the bundle budget, and the dependency audit. Exits 1 if anything fails.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkBudget, parseBuildLog, PAGE_BUDGET_KB } from "./budget.mjs";

const shell = process.platform === "win32";
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: "utf8", shell, maxBuffer: 64 * 1024 * 1024, ...opts });
const dir = mkdtempSync(path.join(tmpdir(), "airwise-check-"));
const rows = [];
let failed = false;
const row = (label, ok, text) => {
  rows.push([label, text]);
  if (!ok) failed = true;
};

// 1. type-check
const tsc = run("npx", ["tsc", "--noEmit"]);
row("Type-check", tsc.status === 0, tsc.status === 0 ? "pass" : "FAIL (run npm run typecheck)");

// 2. tests, with a machine-readable report
const json = path.join(dir, "vitest.json");
const vt = run("npx", ["vitest", "run", "--reporter=json", `--outputFile=${json}`]);
let report = null;
try {
  report = JSON.parse(readFileSync(json, "utf8"));
} catch {
  /* handled below */
}
if (!report) {
  row("Tests", false, "FAIL (no report; run npm test)");
} else {
  const results = report.testResults.flatMap((f) =>
    f.assertionResults.map((a) => ({
      file: f.name.replace(/\\/g, "/"),
      name: a.fullName,
      status: a.status,
    })),
  );
  const failedTests = results.filter((r) => r.status === "failed");
  row(
    "Tests",
    vt.status === 0 && failedTests.length === 0,
    `${report.numPassedTests} passed, ${report.numFailedTests} failed, in ${report.testResults.length} files`,
  );
  const axeScans = results.filter((r) => /accessibility violations/i.test(r.name));
  const axeBad = axeScans.filter((r) => r.status !== "passed");
  row(
    "Accessibility",
    axeScans.length > 0 && axeBad.length === 0,
    `${axeScans.length} automated axe scans of the pages, ${axeBad.length} with violations`,
  );
  const evals = results.filter(
    (r) =>
      r.file.includes("/evals/eval.test.ts") &&
      /: /.test(r.name) &&
      /\b[a-z]{3}-\d\d:/.test(r.name),
  );
  const evalPass = evals.filter((r) => r.status === "passed").length;
  row(
    "Eval set",
    evals.length > 0 && evalPass === evals.length,
    `${evalPass}/${evals.length} cases (${evals.length ? Math.round((evalPass / evals.length) * 100) : 0}%)`,
  );
}

// 3. production build and bundle budget
const build = run("npx", ["next", "build"]);
const log = `${build.stdout}\n${build.stderr}`;
if (build.status !== 0) row("Build", false, "FAIL (run npm run build)");
else {
  const result = checkBudget(parseBuildLog(log));
  row(
    "First-load JS",
    result.ok,
    `home ${result.home} kB, largest page ${result.worst?.route} ${result.worst?.kb} kB (budget ${PAGE_BUDGET_KB} kB), shared ${result.shared} kB${result.ok ? "" : ", OVER BUDGET"}`,
  );
}

// 4. dependency audit (runtime dependencies)
const audit = run("npm", ["audit", "--omit=dev", "--json"]);
try {
  const total = JSON.parse(audit.stdout).metadata.vulnerabilities.total;
  row("Audit", total === 0, `${total} vulnerabilities in runtime dependencies`);
} catch {
  row("Audit", false, "could not read the audit report");
}

rmSync(dir, { recursive: true, force: true });
const width = Math.max(...rows.map((r) => r[0].length));
console.log("\nAirWise proof card");
for (const [label, text] of rows) console.log(`  ${label.padEnd(width)}  ${text}`);
console.log(failed ? "\nResult: FAIL\n" : "\nResult: all checks passed\n");
writeFileSync(
  path.join(process.cwd(), ".last-check.txt"),
  rows.map((r) => `${r[0].padEnd(width)}  ${r[1]}`).join("\n") + "\n",
);
process.exit(failed ? 1 : 0);
