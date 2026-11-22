# Runbook

## Check a deployment
`SMOKE_URL=https://your-app.vercel.app node scripts/smoke.mjs` checks the four pages, `/api/health`, `/api/map` (100+ cities) and a chat call. Exit code 1 means roll back (see `docs/deploy.md`).

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

## Logs and request ids
Every API request writes one JSON line to stdout: `{"evt":"request","route":"chat","method":"POST","status":200,"ms":412,"id":"..."}`. An unexpected failure writes `{"evt":"error",...}` with the error name and message (never a stack, prompt, question or photo) and the caller gets a JSON 500 containing the same `requestId`. Gemini attempts log `{"evt":"gemini",...}` with a reason code.

To trace a user report: ask for the `requestId` shown in the error (or the `x-request-id` response header) and search the host's logs for that id.

`GET /api/health` is the liveness probe for load balancers and uptime monitors. It makes no outbound calls.
