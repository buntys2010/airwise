# Contributing to AirWise

Thanks for helping. This page is the short version of how the code is kept readable and safe.

## Set up

```bash
npm ci
npm run hooks   # once per clone: runs lint, format check and tests before each commit
npm run dev
```

Node 20.9 or newer (see `.nvmrc`). Copy `.env.example` to `.env.local` to try the Gemini features; everything else works without a key.

## Before you push

| Command            | What it proves                                                          |
| ------------------ | ----------------------------------------------------------------------- |
| `npm run lint`     | Type-check plus ESLint (size, complexity, imports, accessibility rules) |
| `npm run format`   | Prettier formatting (CI runs `format:check`)                            |
| `npm test`         | Unit and component tests                                                |
| `npm run eval`     | The 52-case grounding and injection eval set                            |
| `npm run e2e`      | Real-browser tests and axe scans                                        |
| `npm run check`    | Everything above plus a production build, bundle budget and audit       |

CI runs the same gates. A change that fails any of them will not merge.

## House rules

- **Numbers come from `lib/engine/`.** UI, prompts and tools call it; nothing else computes exposure. If you need a new figure, add it to the engine with tests and document the assumption in `docs/methodology.md`.
- **The browser sends choices, never numbers.** New endpoints validate input against fixed lists and recompute facts on the server (see `docs/DECISIONS.md`).
- **Small modules.** Files up to 300 lines, functions up to 60, complexity up to 15. If you are near a limit, split by responsibility instead of raising it. Do not add `eslint-disable` for these rules.
- **Say what a module is for.** Start each file with a one-line `/** ... */` purpose comment, and give every exported function a doc comment that explains why or what it promises, not what the code already says.
- **Types do the checking.** No `any`, no `@ts-ignore`, no non-null `!` outside tests. Check outside data at the boundary.
- **Accessible by default.** Level is shown by icon, shape and word, never colour alone; controls are keyboard-operable and labelled; text that is English inside a Hindi page is marked `lang="en"`.
- **No inline styles for static values.** Use the classes in `app/globals.css`. Inline styles are for values that are computed at render time (a bar width) and for the share image, whose renderer requires them.
- **Add tests with the change.** Put a test beside the file it covers (`foo.ts` and `foo.test.ts`). Prefer testing behaviour through the public function or component.

## Commit messages

Say what changed and why, in the imperative: `Split engine into focused modules`. Keep unrelated changes in separate commits.

## Security

Report vulnerabilities as described in [`SECURITY.md`](SECURITY.md), not in a public issue.
