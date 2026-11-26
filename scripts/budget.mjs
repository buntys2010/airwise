/**
 * Bundle budget. Reads the per-route chunk lists that `next build` writes to
 * `.next/diagnostics/route-bundle-stats.json` (Next 16 no longer prints sizes), gzips each chunk
 * and fails if any page's first-load JS is over budget.
 * Usage: npm run build && node scripts/budget.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * Gzipped first-load JS limits. Set from Next 16.4 + Turbopack, which ships more than Next 15 did:
 * the heaviest page (/) measures about 182 kB and the shared bundle about 156 kB, so these leave
 * roughly 10% of headroom. A real regression still fails; tighten them when the bundle shrinks.
 */
export const PAGE_BUDGET_KB = 200;
export const SHARED_BUDGET_KB = 170;

const STATS_FILE = ".next/diagnostics/route-bundle-stats.json";
/** Pages that ship no app JS of their own and would only add noise. */
const SKIPPED_ROUTES = new Set(["/_not-found"]);

const toKilobytes = (bytes) => Math.round((bytes / 1000) * 10) / 10;

/** The gzipped size of one built file, in bytes. Chunk paths use the build machine's separators. */
export function gzipBytes(chunkPath, root = process.cwd()) {
  return gzipSync(readFileSync(resolve(root, chunkPath.replaceAll("\\", "/")))).length;
}

/**
 * Per-page first-load JS and the shared bundle, in kB. A page's first load is every chunk it
 * lists; the shared bundle is the chunks every page lists. API routes are not in the stats.
 * `sizeOf` returns a chunk's gzipped bytes, so tests need no files.
 */
export function summarizeBundles(stats, sizeOf = gzipBytes) {
  const routes = stats.filter((entry) => !SKIPPED_ROUTES.has(entry.route));
  const chunkSets = routes.map((entry) => new Set(entry.firstLoadChunkPaths.map(String)));
  const sizes = new Map();
  const sizeFor = (path) => {
    if (!sizes.has(path)) sizes.set(path, sizeOf(path));
    return sizes.get(path);
  };
  const total = (paths) => [...paths].reduce((sum, path) => sum + sizeFor(path), 0);
  const pages = Object.fromEntries(
    routes.map((entry, index) => [entry.route, toKilobytes(total(chunkSets[index]))]),
  );
  const [first, ...others] = chunkSets;
  const common = first ? [...first].filter((path) => others.every((set) => set.has(path))) : [];
  return { pages, shared: first ? toKilobytes(total(common)) : null };
}

/** Reads and summarizes the stats of the latest `next build`. */
export function readBundleStats(root = process.cwd()) {
  const stats = JSON.parse(readFileSync(resolve(root, STATS_FILE), "utf8"));
  return summarizeBundles(stats, (path) => gzipBytes(path, root));
}

export function checkBudget(parsed, { pageKb = PAGE_BUDGET_KB, sharedKb = SHARED_BUDGET_KB } = {}) {
  const violations = [];
  const entries = Object.entries(parsed.pages);
  if (entries.length === 0) violations.push("no pages found in the build output");
  for (const [route, size] of entries)
    if (size > pageKb) violations.push(`${route} is ${size} kB, over the ${pageKb} kB page budget`);
  if (parsed.shared === null) violations.push("shared JS size not found in the build output");
  else if (parsed.shared > sharedKb)
    violations.push(`shared JS is ${parsed.shared} kB, over the ${sharedKb} kB budget`);
  const worst = entries.sort((a, b) => b[1] - a[1])[0] ?? null;
  return {
    ok: violations.length === 0,
    violations,
    worst: worst ? { route: worst[0], kb: worst[1] } : null,
    home: parsed.pages["/"] ?? null,
    shared: parsed.shared,
  };
}

/** Command-line entry: prints the figures and sets the exit code (0 ok, 1 over budget, 2 no build). */
function main() {
  let parsed;
  try {
    parsed = readBundleStats();
  } catch {
    console.error(`could not read ${STATS_FILE}; run "npm run build" first`);
    process.exitCode = 2;
    return;
  }
  const result = checkBudget(parsed);
  console.log(
    `First-load JS (gzip): home ${result.home} kB, largest ${result.worst?.route} ${result.worst?.kb} kB, shared ${result.shared} kB (budget ${PAGE_BUDGET_KB} kB per page, ${SHARED_BUDGET_KB} kB shared)`,
  );
  for (const violation of result.violations) console.error(`FAIL ${violation}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith("budget.mjs")) main();
