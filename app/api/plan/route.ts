import { createCache } from "@/lib/cache";
import { parseChoices } from "@/lib/chat";
import { getCityAir, istClock } from "@/lib/data";
import { generateDetailed, REASON_TEXT } from "@/lib/gemini";
import { json, readGuarded } from "@/lib/http";
import { withObservability } from "@/lib/observe";
import {
  buildPlanPrompt,
  buildPlanRequest,
  type DayPlan,
  PLAN_SCHEMA,
  schedulePlan,
  validatePlan,
} from "@/lib/plan";
import { createLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
// Gemini calls are budgeted at 12 s (chat), 15 s (plan) and 20 s (vision); the map batches air
// requests. 30 s leaves headroom.
export const maxDuration = 30;

const limited = createLimiter(6, 60_000);
const verifiedPlans = createCache<DayPlan>(10 * 60_000, 100);

export const POST = withObservability("plan", async (req: Request) => {
  const parsed = await readGuarded(req, { limited, maxBytes: 3_000 });
  if (!parsed.ok) return parsed.res;

  const choices = parseChoices((parsed.body as { choices?: unknown } | null)?.choices);
  if (!choices) return json({ error: "Missing or invalid household choices." }, 400);

  // The schedule and its numbers are built here from the engine and live air data, never taken from
  // the client.
  const air = await getCityAir(choices.city);
  const clock = istClock();
  const request = buildPlanRequest(choices, air.hourly, clock.hour, clock.elapsed);

  const cacheKey = JSON.stringify([choices.lang, request]);
  const cached = verifiedPlans.get(cacheKey);
  if (cached)
    return json({ ...cached, source: "gemini", verified: true, cached: true, air: air.source });

  const generated = await generateDetailed({
    prompt: buildPlanPrompt(request, choices.lang),
    maxTokens: 900,
    temperature: 0.5,
    schema: PLAN_SCHEMA,
    budgetMs: 15_000,
    timeoutMs: 15_000,
    kind: "plan",
  });
  const plan = generated.ok ? validatePlan(generated.text, request) : null;
  if (plan) {
    verifiedPlans.set(cacheKey, plan);
    return json({ ...plan, source: "gemini", verified: true, air: air.source });
  }
  return json({
    ...schedulePlan(request),
    source: "offline",
    verified: false,
    air: air.source,
    rejected: generated.ok,
    ...(generated.ok
      ? {}
      : { reason: generated.reason, reasonText: REASON_TEXT[generated.reason] }),
  });
});
