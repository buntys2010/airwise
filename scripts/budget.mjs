/**
 * Bundle budget. Reads the table that `next build` prints and fails if any page's first-load JS is over budget.
 * Usage: npm run build 2>&1 | tee build.log && node scripts/budget.mjs build.log
 */
import { readFileSync } from "node:fs";

export const PAGE_BUDGET_KB = 150;
export const SHARED_BUDGET_KB = 120;

const toKb = (n, unit) => (unit === "B" ? Number(n) / 1000 : Number(n));

/** Parses the route table from `next build` output. API routes are left out: they ship no page JS. */
export function parseBuildLog(log) {
  const pages = {};
  let shared = null;
  for (const line of String(log).split(/\r?\n/)) {
    const row = /^\W*[○ƒ●λ]\s+(\/\S*)\s+([\d.]+)\s*(kB|B)\s+([\d.]+)\s*(kB|B)\s*$/.exec(line);
    if (row && !row[1].startsWith("/api/") && row[1] !== "/_not-found") pages[row[1]] = toKb(row[4], row[5]);
    const sh = /First Load JS shared by all\s+([\d.]+)\s*(kB|B)/.exec(line);
    if (sh) shared = toKb(sh[1], sh[2]);
  }
  return { pages, shared };
}

export function checkBudget(parsed, { pageKb = PAGE_BUDGET_KB, sharedKb = SHARED_BUDGET_KB } = {}) {
  const violations = [];
  const entries = Object.entries(parsed.pages);
  if (entries.length === 0) violations.push("no pages found in the build output");
  for (const [route, kb] of entries) if (kb > pageKb) violations.push(`${route} is ${kb} kB, over the ${pageKb} kB page budget`);
  if (parsed.shared === null) violations.push("shared JS size not found in the build output");
  else if (parsed.shared > sharedKb) violations.push(`shared JS is ${parsed.shared} kB, over the ${sharedKb} kB budget`);
  const worst = entries.sort((a, b) => b[1] - a[1])[0] ?? null;
  return { ok: violations.length === 0, violations, worst: worst ? { route: worst[0], kb: worst[1] } : null, home: parsed.pages["/"] ?? null, shared: parsed.shared };
}

if (process.argv[1] && process.argv[1].endsWith("budget.mjs")) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node scripts/budget.mjs build.log"); process.exit(2); }
  const result = checkBudget(parseBuildLog(readFileSync(file, "utf8")));
  console.log(`First-load JS: home ${result.home} kB, largest ${result.worst?.route} ${result.worst?.kb} kB, shared ${result.shared} kB (budget ${PAGE_BUDGET_KB} kB per page, ${SHARED_BUDGET_KB} kB shared)`);
  for (const v of result.violations) console.error("FAIL " + v);
  process.exit(result.ok ? 0 : 1);
}
