# Contributing

## Set up
Node 22 (see `.nvmrc`). `npm ci`, then `npm run dev`. Copy `.env.example` to `.env.local` if you want live Gemini answers; everything works offline without a key.

## Before you open a pull request
Run `npm run check`. It type-checks, runs the whole test suite (including the accessibility scans and the eval set), builds, checks the bundle budget and audits runtime dependencies. Browser tests: `npm run build`, then `npm run e2e`.

## Rules of the road
- **Numbers come from code.** The engine computes every figure; the model only words it, and the grounding guard rejects anything it cannot trace back. Never take a number from the client.
- **Follow `DESIGN.md`** for every colour, font, spacing and motion decision.
- **API routes** are wrapped in `withObservability` (`lib/observe.ts`) and use `readGuarded` (`lib/http.ts`) for the rate limit, size cap and JSON parse. A new or changed route needs an entry in `docs/openapi.yaml`; `lib/openapi.test.ts` fails if they drift.
- **Logging:** structured JSON, one line per event. Never log a prompt, a question, a photo or a key.
- **Tests:** a new module gets a test next to it. A bug fix gets a test that fails without the fix.
- **Commits:** short imperative subject, for example `Fix share link origin`. Explain the why in the body.

## Reporting a security issue
See `SECURITY.md`. Do not open a public issue.
