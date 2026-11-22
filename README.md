# AirWise: a clear-air plan for smog days

AirWise helps families and communities get through severe winter smog. Pick your city, say how your household sleeps, travels and cooks (or show it a photo of your room), and it builds a **clear-air day plan** with the math: how many cigarettes' worth of PM2.5 you breathe a day, and how much each fix cuts.

**Problem statement:** Challenge 6, *Urban Air Quality Assistant*.
**Vertical / persona:** an urban family in a smog-hit Indian city, with an optional vulnerable member (child, older adult, asthma or heart condition). 118 cities are covered: every state and union-territory capital plus large cities.

**No key needed to try it.** With no `GEMINI_API_KEY` the whole app works and chat answers from a deterministic offline responder, labelled as such.

## What is new
Most entries show a city's AQI and add a chatbot. AirWise measures **you**, and an AI explains the result but cannot invent a number. See [`docs/INNOVATION.md`](docs/INNOVATION.md) for what is original, what is borrowed and what it cannot do.

- **Personal dose engine** with a counterfactual ledger: every action's solo effect, hour by hour, with the math.
- **Room-first**: a photo of your room becomes tappable hotspots, but only for things the model can plainly see. Everything else is a yes/no question to you, and your answer beats the photo.
- **Two-layer grounding guard** for Gemini: rejects any number the engine did not compute and any citation of studies or population statistics (English and Hindi, including Devanagari digits).
- **Verified-or-fallback AI**: the deterministic answer always exists; Gemini's rewrite is shown only if it passes the guard.
- **Cigarettes on screen**: the dial draws your day as cigarettes that burn down and shorten as you apply fixes; the top strip shows the city's outdoors-all-day figure.
- **The page is the air**: the haze clears as exposure drops.
- **Honest data labels**: live with a timestamp, or plainly an estimate, per city on the map.
- **English and Hindi**, voice input (feature-detected), device-only save, share links that carry choices never numbers, WhatsApp share, calendar reminder, community notice, an MCP server.

## What it does
| The brief asks for | Where it lives |
|---|---|
| Low-emission daily routines | Commute swap, outdoor time moved to the cleanest hour (`lib/engine.ts`, `buildActions`) |
| Indoor air quality hacks | Seal gaps, purifier or box-fan filter, cooking ventilation or induction; photo of your room |
| Sustainable alternatives | Metro/bus/cycle swaps, induction cooking, with CO₂ per day |
| Tailored to location and lifestyle | Searchable city picker, home type, commute, cooking fuel, vulnerable member |
| Clear direct impact | Every action shows % less exposure, cigarettes a day, kg CO₂ and a "Show the math" panel |
| New users learn fast | `/guide`: quick start, every feature, example questions, plain terms |
| Smart, dynamic assistant | "Ask AirWise" chat (Gemini, offline fallback) grounded in the page's own numbers |
| Community | `/community` printable building notice; `/map` live air for every city |

## Approach and logic
1. **Numbers come from code, words come from the AI.** `lib/engine.ts` is a pure, deterministic model of a person's day (indoor, commute, outdoor, cooking). Gemini explains; it never computes. The server recomputes all facts from the client's *choices only*, never trusting numbers from the browser.
2. **Each action is measured against doing nothing**, then combined in the same model.
3. **The cigarette equivalent** uses one stated rule of thumb: about 22 µg/m³ of PM2.5 averaged over a day counts as one cigarette (`CIGARETTE_PM` in `lib/engine.ts`). It makes dose understandable; it is not a clinical claim.
4. **Live by default, honest when offline.** `lib/data.ts` fetches hourly PM2.5 from Open-Meteo for the chosen city only on the home page; the map fetches all cities in 3 batched requests with a 10-minute server cache. A failed request labels only its own cities as estimates. The feed is gridded (about 10 km), so nearby cities can share a value, and the pages say so.
5. **Photo of your room.** The model is asked only for what is visible (a gap by a window, a gas stove, a purifier). Absence is never inferred. Photos are downscaled and stripped of location data in the browser, sent once for analysis and not stored. **Accuracy:** tested on one drawn sample (all three items found) and two real photos (correctly reported nothing visible). That is not a measured detection rate on real rooms, and we do not claim one. See [`docs/methodology.md`](docs/methodology.md).

## How to run
```bash
npm ci
cp .env.example .env.local      # optional: add GEMINI_API_KEY
npm run dev                     # http://localhost:3000
npm run check                   # the proof card below
npm run e2e                     # Playwright in a real browser
```
Other scripts: `npm test`, `npm run lint` (type-check), `npm run eval`, `npm run build`, `npm run smoke`. Node 22 (`.nvmrc`; `engines` allows 20.9 and up).

## Proof (output of `npm run check` on this commit)
```
AirWise proof card
  Type-check     pass
  Tests          471 passed, 0 failed, in 41 files
  Accessibility  10 automated axe scans of the pages, 0 with violations
  Eval set       52/52 cases (100%)
  First-load JS  home 142 kB, largest page / 142 kB (budget 150 kB), shared 103 kB
  Audit          0 vulnerabilities in runtime dependencies
```
The 52-case eval set (`evals/`, report in [`docs/EVAL_REPORT.md`](docs/EVAL_REPORT.md)) covers grounding, injection, Hindi and photo findings, and a regression test proves the evals fail if the guard is weakened. Playwright (`e2e/`) checks the core journey, layout at 360 and 390 px, that a focused control is never hidden behind the bottom bar, and the cigarette animation. CI runs the same steps (`.github/workflows/ci.yml`).

## Gemini
Gemini is called from the server only: chat, "write my day in my words", and photo analysis. All three are guarded: fenced prompts, a model chain (`GEMINI_MODEL`, then `GEMINI_FALLBACK_MODELS`) for rate limits, per-call and overall time budgets, a per-minute budget, verified answers cached 10 minutes, and logs that never contain prompts or images.

## Security
- Key only from server environment variables; `.env*` is git-ignored and `.vercelignore` keeps local secrets out of uploads.
- API routes: body size limits, strict whitelist parsing of every client field, per-IP rate limit (last `X-Forwarded-For` entry), timeouts, no user text treated as instructions.
- Security headers; no third-party scripts, no cookies, no accounts. Location is a city choice, never GPS. Choices live on the device only.

## Deploy
See [`docs/deploy.md`](docs/deploy.md) (Vercel and Cloud Run) and [`docs/runbook.md`](docs/runbook.md). `SMOKE_URL=https://your-app node scripts/smoke.mjs` checks a deployment.

## MCP server
[`mcp/`](mcp/README.md) exposes two read-only tools (`get_city_air`, `score_actions`) from the same engine, with structured errors an agent can act on.

## Accessibility
Landmarks and headings, skip link, labelled controls, visible focus that is never hidden by the bottom bar, keyboard-operable combobox city picker and sortable table, `aria-live` results, air levels shown by icon, shape and word (never colour alone), contrast measured from the real tokens, reduced-motion support, Hindi with correct `lang`.

## Quality and security
Measured evidence per quality dimension is in [`docs/QUALITY.md`](docs/QUALITY.md). The threat model, photo handling and how to report an issue are in [`SECURITY.md`](SECURITY.md). Licence: [MIT](LICENSE).

## Assumptions
All model factors are planning assumptions with ranges in [`docs/methodology.md`](docs/methodology.md). City positions, and the cities least certain, are in [`docs/CITIES.md`](docs/CITIES.md). AirWise gives general guidance and is **not medical advice**.

## Repository layout
```
app/          pages (home, /community, /map, /guide), API routes (chat, plan, vision, map), manifest, icons
components/   UI (dial, cigarette row, city picker, map, table, chat, photo, plan tools)
lib/          engine, data, cities, chat, plan, room, guard, gemini, i18n, share, store and tests
evals/        52-case eval set and regression test
e2e/          Playwright tests
mcp/          MCP server (own package.json)
scripts/      check (proof card), smoke, bundle budget
docs/         methodology, quality, deploy, runbook, evals, innovation, cities
```
