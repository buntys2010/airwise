# Runbook

## Check a deployment
`SMOKE_URL=https://your-app.vercel.app node scripts/smoke.mjs` checks the four pages, `/api/map` (80+ cities) and a chat call. Exit code 1 means roll back (see `docs/deploy.md`).

## Symptoms
| Symptom | Likely cause | What to do |
|---|---|---|
| Chat says "offline answer" | No `GEMINI_API_KEY`, key rejected, rate limit, or the guard rejected the model's reply | Check the env var in the host dashboard. The offline answer is correct, only less fluent. Server logs carry a reason code (never prompts). |
| Badge says "Offline estimate" | Open-Meteo unreachable or slow (3.5 s per city) | Nothing to fix; it recovers on the next 15-minute refresh. The map labels only affected cities. |
| 429 from `/api/*` | Per-IP limiter, or the per-minute Gemini budget | Wait a minute. Both are per server instance. |
| Photo analysis finds nothing | Nothing plainly visible, or the model was unavailable | Answer the three questions; answers always win. |
| Build fails on bundle budget | A page grew past 150 kB first-load JS | `npm run check` shows which; lazy-load the new part. |

## Rotate the Gemini key
Create a new key in Google AI Studio, set it in the host's environment settings, redeploy, then delete the old key. Never put it in the repo.

## Cost control
Set a spend or quota cap on the key in Google AI Studio or Cloud. The in-app budget is per instance and is a safety net, not a quota.
