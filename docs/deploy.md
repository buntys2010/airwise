# Deploying AirWise

AirWise needs no database, no filesystem writes and no shared memory. Every instance can start cold and give correct answers.

## Vercel

Run these yourself; nothing in the repo logs in, sets secrets or deploys.

1. From the repo root: `npx vercel` (first run links a project; `npx vercel --prod` promotes to production).
2. Project settings: Framework preset **Next.js**, Install `npm ci`, Build `npm run build`, Node.js version **22.x** (matches `.nvmrc`; `engines` allows >= 20.9).
3. Environment variables, set in the Vercel dashboard (Settings, Environment Variables). No values live in this repo:
   - `GEMINI_API_KEY` (secret, optional). Without it the app runs and labels every chat answer as an offline answer.
   - `GEMINI_MODEL` (optional, default `gemini-2.5-flash`).
   - `GEMINI_FALLBACK_MODELS` (optional, comma separated).
   - `GEMINI_BUDGET_PER_MIN` (optional, default 40).
4. Redeploy: push to the connected branch, or `npx vercel --prod`, or Deployments, three dots, Redeploy. Changing an environment variable needs a redeploy to take effect.
5. Roll back: Deployments, pick the previous good deployment, three dots, **Promote to Production** (or `npx vercel rollback`).
6. Check it: `SMOKE_URL=https://your-app.vercel.app node scripts/smoke.mjs` checks `/`, `/community`, `/map`, `/guide`, `/api/map` and a chat call, and exits 1 on any failure.

`.vercelignore` keeps tests, notes, local secrets and AI-directed files out of the upload.

### Function limits

Every API route that calls Gemini or the air feed exports `maxDuration = 30` and `runtime = "nodejs"`. The internal budgets are shorter (chat 12 s, plan 15 s, vision 20 s, air feed 3.5 s per city), so the model gives up before the platform does and the user gets a labelled offline answer, not a timeout.

### Instances are independent

The answer cache (`lib/cache.ts`), the rate limiter (`lib/ratelimit.ts`) and the Gemini budget (`lib/gemini.ts`) live in each instance's memory. On serverless that means:

- Caches only save time and money. A cache miss recomputes the same deterministic answer, so correctness never depends on them.
- The rate limit and Gemini budget are per instance, so the real ceiling is limit times the number of warm instances. They are a safety net, not a quota. Set a spending cap on the Gemini key in Google AI Studio or Cloud for a hard limit.
- The limiter keys on the last `X-Forwarded-For` entry, which is the one Vercel's proxy appends. Behind a different proxy, check that the last entry is the real client.
- Nothing is written to disk. User choices stay on the device (`localStorage`) or in share links.

## Google Cloud Run
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
gcloud run deploy airwise --source . --region asia-south1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest --min-instances 0 --max-instances 3
```
Cloud Run builds with the Node buildpack (`npm run build`, `npm start`). Never commit the key; keep it in Secret Manager or the host's environment settings. Keep max instances low: the limiter and budget are per instance.
