#!/usr/bin/env node
/**
 * Post-deploy smoke test. Usage: node scripts/smoke.mjs [baseUrl]  or  SMOKE_URL=https://your.app node scripts/smoke.mjs  (default http://localhost:3100)
 * Checks that every main page answers 200, that the map API returns every city, and that the chat API answers
 * (labelled offline when there is no key). Exits 1 on the first failure so a deploy can be rolled back.
 */
const base = (
  process.argv[2] ??
  process.env.SMOKE_URL ??
  process.env.BASE_URL ??
  "http://localhost:3100"
).replace(/\/$/, "");
const pages = ["/", "/community", "/map", "/guide"];
let failed = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) failed++;
};

try {
  const r = await fetch(base + "/api/health");
  const j = await r.json();
  check(
    r.status === 200 && j.status === "ok" && !!r.headers.get("x-request-id"),
    "GET /api/health",
    `(${r.status})`,
  );
} catch (e) {
  check(false, "GET /api/health", String(e));
}
for (const p of pages) {
  try {
    const r = await fetch(base + p);
    check(r.status === 200, `GET ${p}`, `(${r.status})`);
  } catch (e) {
    check(false, `GET ${p}`, String(e));
  }
}
try {
  const r = await fetch(base + "/api/map");
  const j = await r.json();
  check(
    r.status === 200 && Array.isArray(j.points) && j.points.length >= 100,
    "GET /api/map returns every city",
    `(${j.points?.length} cities, ${j.live} live)`,
  );
} catch (e) {
  check(false, "GET /api/map", String(e));
}
try {
  const choices = {
    city: "delhi",
    home: "typical",
    commute: "bike",
    km: 8,
    cooking: "lpg",
    vulnerable: true,
    plan: {},
    lang: "en",
  };
  const r = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Do I need a mask?", choices }),
  });
  const j = await r.json();
  check(
    r.status === 200 && typeof j.answer === "string" && j.answer.length > 0,
    "POST /api/chat answers",
    `(source: ${j.source}, verified: ${j.verified}${j.reason ? ", reason: " + j.reason : ""}${j.rejected ? ", guard rejected the model reply" : ""})`,
  );
} catch (e) {
  check(false, "POST /api/chat", String(e));
}

process.exit(failed ? 1 : 0);
