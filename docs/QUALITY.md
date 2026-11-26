# Quality evidence

Measured, not estimated. Every figure below is from `npm run check` (and `npm run e2e`) on the commit you are reading; run them to reproduce.

```
AirWise proof card
  Type-check     pass
  Tests          520 passed, 0 failed, in 52 files
  Accessibility  10 automated axe scans of the pages, 0 with violations
  Eval set       52/52 cases (100%)
  First-load JS  home 182 kB, largest page / 182 kB (budget 200 kB), shared 156 kB (gzip)
  Audit          0 vulnerabilities in runtime dependencies
```
Plus `npm run e2e`: 39 browser tests passed (3 skipped by design) in desktop and 390 px phone profiles.

## Code quality
- Strict TypeScript, plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` and `noImplicitOverride`. Every array read is checked, so a missing hour or city cannot crash a render.
- ESLint with type-aware rules (`no-floating-promises`, `no-misused-promises`, unsafe-`any` rules), the SonarJS rule set, React hooks, Next.js and jsx-a11y. CI enforces cyclomatic complexity 15, cognitive complexity 15, nesting depth 4, 5 parameters, 150 lines per function and 500 lines per file.
- Prettier formats everything (`npm run format`); CI fails on unformatted code. ESLint also enforces import order (`simple-import-sort`) and a 110-column limit for code and comments.
- `npm run dead` (knip) fails on unused files, exports and dependencies. `npm run dupes` (jscpd) fails above 1% duplicated lines; today it is 0%. `npm run circular` (madge) runs in CI and finds no circular imports.
- SonarQube Community scan of this repo (config in `sonar-project.properties`): 0 bugs, 0 vulnerabilities, 0 code smells, 0 security hotspots, 0% duplication, A on reliability, security and maintainability.
- Coverage floor in `vitest.config.mts` (`npm run coverage`): CI fails if line, branch, function or statement coverage drops below it.
- One source of numbers: [`lib/engine/`](../lib/engine) is pure and deterministic; the UI, chat context, MCP server and tests all call it. Nothing else computes exposure.
- Small modules with one job: [`lib/guard.ts`](../lib/guard.ts), [`lib/gemini.ts`](../lib/gemini.ts), [`lib/air/`](../lib/data.ts), [`lib/cities.ts`](../lib/cities.ts), [`lib/room.ts`](../lib/room.ts).
- Model assumptions are written down with ranges in [`methodology.md`](methodology.md).

## Security
- Trust boundary, threats and mitigations: [`SECURITY.md`](../SECURITY.md).
- The server recomputes every fact from the client's *choices only* ([`lib/chat.ts`](../lib/chat.ts)); the browser can never supply a number.
- The grounding guard and prompt-injection cases are exercised by the 52-case eval set ([`evals/`](../evals), report in [`EVAL_REPORT.md`](EVAL_REPORT.md)); a regression test proves the evals fail if the guard is weakened.
- `npm audit` on runtime dependencies: 0 vulnerabilities.

## Efficiency
- First-load JS (gzip) 182 kB for the heaviest page against a 200 kB budget (Next 16 with Turbopack; the earlier 142 kB figure was Next 15), enforced by [`scripts/budget.mjs`](../scripts/budget.mjs) in CI.
- The city table loads only on `/map`; the home page fetches only the chosen city; the map uses 3 batched air requests, cached on the server for 10 minutes.
- Verified model answers are cached for 10 minutes, and Gemini calls have per-call and overall time budgets.

## Testing
- 520 unit and component tests (Vitest, Testing Library) covering the engine, guard, data loading with partial failure, routes, pages, i18n parity (English and Hindi), city list integrity, the city picker, and the MCP tools.
- 52 eval cases for grounding, injection, Hindi and photo findings ([`evals/`](../evals)).
- Browser tests ([`e2e/`](../e2e)) for the core journey, layout at 360 and 390 px, focus never hidden behind the bottom bar.
- `npm run smoke` checks a running deployment.

## Accessibility
- 10 axe-core scans of the pages and the city picker: 0 violations. Automated scans do not replace testing with assistive technology, which has not been done here.
- Contrast is measured from the real design tokens ([`lib/contrast.test.ts`](../lib/contrast.test.ts)).
- Levels are shown by icon, shape and word, never colour alone; the map has an equivalent sortable table; the city picker is a keyboard-operable combobox; reduced motion is respected; Hindi sets `lang` correctly.

## Problem fit
- Covers urban air quality guidance for Indian households: live hourly PM2.5 for 118 cities, a personal exposure model, concrete fixes with their measured effect, a community notice, and a plain-language guide. See the table in the [README](../README.md).
- Limits are stated: the dose model is a planning aid, the cigarette equivalent is a rule of thumb, the air feed is gridded, and photo analysis has not been measured on a real-room test set. See [`methodology.md`](methodology.md).
