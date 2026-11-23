# Changelog

All notable changes to AirWise. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Quality
- Prettier, type-aware ESLint with the SonarJS rule set, knip (unused code) and jscpd (duplication) now run in CI.
- `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` and `noImplicitOverride` enabled; every array read is checked.
- Removed three unused components and about 30 unused exports; removed all nested ternaries; split the longest components and hooks.
- Hardened the grounding-guard regexes against long digit runs; fixed two unhandled promises in `useAirwise`; the request-body reader in `lib/http.ts` is its own function.
- 516 unit tests (up from 471). Coverage now includes `app/**`: 95% lines, 88% branches, with CI floors raised to match.
- `sonar-project.properties` for SonarQube: 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, 0% duplication.

### Added
- Structured request logging for every API route: one JSON line with route, method, status, duration and a request id. Bodies, questions and photos are never logged.
- `x-request-id` response header on every API response, and a JSON 500 that carries the same id when a route throws unexpectedly.
- `GET /api/health` liveness probe, used by the smoke test and CI.
- `docs/openapi.yaml`: OpenAPI 3 description of every API route, with a test that fails when a route and the spec drift apart.
- App error page, 404 page and a last-resort global error page.
- CONTRIBUTING guide, `.editorconfig`, Dependabot, and a pull request template.

### Changed
- `/api/map` is cached at the CDN (`s-maxage=300`).
- The server air cache now holds every supported city instead of 12.
- `GEMINI_BUDGET_PER_MIN` must be a whole number of at least 1; anything else falls back to 40 instead of silently blocking or disabling model calls.
- CI: least-privilege token, run cancellation on new pushes, job timeouts, a health-probe wait instead of `sleep`, Playwright traces uploaded on failure, and the MCP package is audited.
