import { createCache } from "@/lib/cache";
import {
  buildContext,
  buildPrompt,
  cleanQuestion,
  MAX_QUESTION,
  offlineAnswer,
  parseChoices,
} from "@/lib/chat";
import { getCityAir, istClock } from "@/lib/data";
import { generateDetailed, REASON_TEXT } from "@/lib/gemini";
import { verify } from "@/lib/guard";
import { json, readGuarded } from "@/lib/http";
import { withObservability } from "@/lib/observe";
import { createLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
// Gemini calls are budgeted at 12 s (chat), 15 s (plan) and 20 s (vision); the map batches air
// requests. 30 s leaves headroom.
export const maxDuration = 30;

const limited = createLimiter(12, 60_000);
/**
 * The whole request, air lookup included, answers within this. Each model gets half so a hanging
 * first model still leaves time for the next.
 */
const CHAT_BUDGET_MS = 12_000;
const PER_CALL_MS = 6_000;
/** Verified answers only, for 10 minutes: the same question about the same air costs no model call. */
const verifiedAnswers = createCache<string>(10 * 60_000);

export const POST = withObservability("chat", async (req: Request) => {
  const started = Date.now();
  const parsed = await readGuarded(req, {
    limited,
    maxBytes: 3_000,
    tooMany: "Too many questions. Try again in a minute.",
  });
  if (!parsed.ok) return parsed.res;

  const body = parsed.body as { question?: unknown; choices?: unknown } | null;
  const question = cleanQuestion(body?.question);
  const choices = parseChoices(body?.choices);
  if (!question) return json({ error: `Ask a question of up to ${MAX_QUESTION} characters.` }, 400);
  if (!choices) return json({ error: "Missing or invalid household choices." }, 400);

  // Facts are recomputed here from the engine. Nothing numeric from the client is ever shown as "verified".
  const air = await getCityAir(choices.city);
  const clock = istClock();
  const ctx = buildContext(choices, air.hourly, clock.hour, clock.elapsed);

  const cacheKey = JSON.stringify([question.toLowerCase(), choices.lang, ctx]);
  const cached = verifiedAnswers.get(cacheKey);
  if (cached)
    return json({
      answer: cached,
      source: "gemini",
      verified: true,
      cached: true,
      air: air.source,
    });

  const generated = await generateDetailed({
    prompt: buildPrompt(question, ctx, choices.lang),
    maxTokens: 260,
    kind: "chat",
    timeoutMs: PER_CALL_MS,
    budgetMs: Math.max(2_000, CHAT_BUDGET_MS - (Date.now() - started)),
  });
  if (generated.ok) {
    // Grounding guard: a Gemini answer is shown only if every number and claim in it traces back to
    // the engine's facts.
    const verdict = verify(generated.text, ctx);
    if (verdict.ok) {
      const answer = generated.text.slice(0, 900);
      verifiedAnswers.set(cacheKey, answer);
      return json({ answer, source: "gemini", verified: true, air: air.source });
    }
    return json({
      answer: offlineAnswer(question, ctx, choices.lang),
      source: "offline",
      verified: false,
      rejected: true,
      air: air.source,
    });
  }
  return json({
    answer: offlineAnswer(question, ctx, choices.lang),
    source: "offline",
    verified: false,
    rejected: false,
    reason: generated.reason,
    reasonText: REASON_TEXT[generated.reason],
    air: air.source,
  });
});
