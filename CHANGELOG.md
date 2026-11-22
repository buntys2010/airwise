# Changelog

All notable changes to AirWise. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
