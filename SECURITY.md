# Security

AirWise stores no personal data and has no accounts. This page describes what it protects, how, and what it does not.

## Trust boundary
- **The browser is untrusted.** The server never accepts a number from the client. Chat, plan and photo routes accept only *choices* from fixed lists (city id, home type, commute, cooking fuel, a distance clamped to 0 to 60 km, a plan as a list of known ids, a language) and recompute every fact itself from live air data and the engine (`lib/chat.ts`, `parseChoices` and `buildContext`). Anything outside the lists is dropped.
- **Request limits.** Body size is capped before parsing (`lib/http.ts`), question length is capped, and unknown fields are ignored.
- **Share links** carry choices, never numbers; a hand-edited link can only select valid options (`lib/share.ts`).
- **Location** is a city chosen from a list. There is no GPS and no IP geolocation.

## Prompt injection and invented statistics
- The model only explains numbers the engine computed. User text goes in a fenced block with brackets removed, and the prompt says it is data, not instructions.
- Every model reply passes a two-layer guard (`lib/guard.ts`): layer one rejects any number that cannot be traced to the supplied facts (including Devanagari digits); layer two rejects invented attributions such as studies, experts or "X% of people" (English and Hindi). A rejected reply is replaced by the deterministic answer and labelled.
- The 52-case eval set (`evals/`) includes injection, key-extraction and fake-statistic attempts, and a regression test shows the evals fail if the guard is weakened. The guard checks numbers and attributions; it cannot catch every semantic slip, and we do not claim it does.

## Photos
- A photo is shrunk and re-encoded in the browser, which drops EXIF data including location, before anything is sent.
- It is sent once to the Gemini vision API for analysis and **not stored** by AirWise. Logs never contain prompts or images.
- The model may only report things plainly visible; its output is validated against a fixed schema and list of finding kinds. The user's own answers override the photo.
- Photo upload is optional; the sample room and the checklist work without it.

## Stored data
- Nothing is stored on the server. Saved choices (city, household answers) live in the browser's `localStorage` on that device only and can be cleared with Forget.
- No cookies, no third-party scripts, no analytics.

## Abuse limits and the per-instance caveat
- Per-IP rate limiting (validated client IP from trusted proxy headers), request time budgets and a per-minute Gemini budget protect cost and availability across all routes including chat, plan, vision, map and dynamic share image generation (`/api/share-image`).
- Incoming request bodies enforce early Content-Length checks and streaming byte caps in `readGuarded` to prevent unbounded memory buffering and DoS.
- On serverless hosts the limiter, the budget and the answer cache live in each instance's memory, so the real ceiling is the limit times the number of warm instances. They are a safety net, not a quota: set a spend cap on the Gemini key. Correctness never depends on them.

## Secrets
- The Gemini key is read only from server environment variables and never sent to the browser. `.env*` is git-ignored, `.env.example` has no values, and `.vercelignore` excludes local env files from uploads.
- Rotating a key: create a new key, set it in the host settings, redeploy, delete the old key (`docs/runbook.md`).

## Dependencies & Transport Security
- Runtime dependencies are few and pinned by the lockfile; `npm audit --omit=dev` reports 0 vulnerabilities and runs in CI. The MCP server has its own lockfile with exact versions.
- Responses carry `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and permissions policy headers.

## Reporting an issue
Open a private security advisory on the repository, or if that is not available, an issue that says only that you have a security report and how to reach you; do not post details publicly. We aim to acknowledge within a few days. There is no bug bounty.
