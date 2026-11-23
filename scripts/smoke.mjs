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
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed++;
};

try {
  const response = await fetch(`${base}/api/health`);
  const payload = await response.json();
  check(
    response.status === 200 &&
      payload.status === "ok" &&
      Boolean(response.headers.get("x-request-id")),
    "GET /api/health",
    `(${response.status})`,
  );
} catch (error) {
  check(false, "GET /api/health", String(error));
}
for (const p of pages) {
  try {
    const response = await fetch(base + p);
    check(response.status === 200, `GET ${p}`, `(${response.status})`);
  } catch (error) {
    check(false, `GET ${p}`, String(error));
  }
}
try {
  const response = await fetch(`${base}/api/map`);
  const payload = await response.json();
  check(
    response.status === 200 && Array.isArray(payload.points) && payload.points.length >= 100,
    "GET /api/map returns every city",
    `(${payload.points?.length} cities, ${payload.live} live)`,
  );
} catch (error) {
  check(false, "GET /api/map", String(error));
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
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Do I need a mask?", choices }),
  });
  const payload = await response.json();
  check(
    response.status === 200 && typeof payload.answer === "string" && payload.answer.length > 0,
    "POST /api/chat answers",
    `(source: ${payload.source}, verified: ${payload.verified}${payload.reason ? `, reason: ${payload.reason}` : ""}${payload.rejected ? ", guard rejected the model reply" : ""})`,
  );
} catch (error) {
  check(false, "POST /api/chat", String(error));
}

process.exit(failed ? 1 : 0);
