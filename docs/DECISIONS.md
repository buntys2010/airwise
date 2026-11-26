# Architecture decisions

Short records of choices that shape the code. Each says what was decided, why, and what it costs. New decisions go at the bottom; a changed decision gets a new record that supersedes the old one.

## ADR 1: Numbers come from code; the model only explains

**Decision.** All figures (exposure, cigarettes, savings, CO₂, costs) are computed by the pure engine in [`lib/engine/`](../lib/engine/index.ts). Gemini receives a facts block built from that engine and may only restate it.

**Why.** A language model that computes health figures will sometimes invent them. A deterministic engine is testable, explainable (every action card shows its working) and identical in the UI, the chat context, the day plan and the MCP server.

**Cost.** The model cannot answer questions the engine has no number for. That is intended: it says so instead.

## ADR 2: The browser sends choices, never numbers

**Decision.** Chat, plan and share-image endpoints accept only choices from fixed lists ([`lib/chat.ts`](../lib/chat.ts), [`lib/share.ts`](../lib/share.ts)). The server recomputes every fact from live air data.

**Why.** A forged link or request then cannot make AirWise display or repeat a figure it did not calculate, and free text never reaches the model as an instruction.

**Cost.** Each request does a little server work. The result is cached for ten minutes.

## ADR 3: A grounding guard checks every model answer

**Decision.** Every number in a model reply must appear in the facts block, and attributions such as "53% of people" are rejected ([`lib/guard.ts`](../lib/guard.ts)). A reply that fails is replaced by checked offline guidance, labelled as such.

**Why.** Prompting alone is not a guarantee. The 52-case eval set in [`evals/`](../evals) exercises the guard, and a regression test proves those evals fail if the guard is weakened.

**Cost.** Some good answers are rejected for using a number we did not supply. The fallback is always usable.

## ADR 4: One module calls Gemini

**Decision.** [`lib/gemini.ts`](../lib/gemini.ts) is the only code that talks to the Gemini API. It owns time limits, a per-minute budget, model fallback and structured logs that never contain the prompt, question or image.

**Why.** One place to bound cost and latency, and one place to audit what leaves the server.

## ADR 5: Photos show evidence, not absence

**Decision.** The vision step reports only what is visible (a gap, a gas stove, a purifier) through an enum-only schema, validated strictly ([`lib/room/vision.ts`](../lib/room/vision.ts)). Everything a photo cannot prove is a yes/no question for the person.

**Why.** A photo cannot show that something is missing, and an enum-only schema leaves no free text for an image to smuggle instructions into.

## ADR 6: Device-only memory

**Decision.** Saved choices live in the browser's storage, never on a server ([`lib/store.ts`](../lib/store.ts)). Share links carry choices only.

**Why.** No accounts, no database, nothing to leak. Opening someone else's link never overwrites your own save.

## ADR 7: English and Hindi from one typed dictionary

**Decision.** [`lib/i18n/`](../lib/i18n/index.ts) holds an English dictionary and a Hindi one typed against its keys. A missing key fails the build; tests check that placeholders match and that Hindi entries are Devanagari. Numbers are always ASCII digits.

**Why.** Parity is enforced by the compiler, and the grounding guard and screen readers behave the same in both languages.

## ADR 8: Size and complexity limits are lint errors

**Decision.** ESLint fails the build on files over 300 lines, functions over 60 lines, complexity above 15, nesting above 4 and more than 5 parameters ([`eslint.config.mjs`](../eslint.config.mjs)). Imports are sorted and accessibility rules are on.

**Why.** Limits that are only written down erode. Making them errors keeps every module small enough to read in one sitting. Nothing is exempted: even the city list and the two dictionaries are kept under the file cap.

**Cost.** Some UI is split into more components than a reader might first expect. Each carries a one-line purpose comment.

## ADR 9: Folders by feature

**Decision.** Components live in feature folders (`chat/`, `map/`, `plan/`, `room/`, `cigs/`, `share/`, `home/`); domain logic lives in `lib/` as small folders with an `index.ts` (`engine/`, `room/`, `cities/`, `i18n/`). Logic that a component needs (state, fetching, keyboard handling) sits in a hook or a pure function beside it so it can be tested without a DOM.

**Why.** A reader looking for "how the map picks a city" finds one folder; dependencies run one way, from components to `lib/`, never back.
