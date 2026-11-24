/** POST /api/vision: reads a room photo for window gaps, a stove or a purifier, then discards the photo. */
import { createHash } from "node:crypto";

import { createCache } from "@/lib/cache";
import { generateDetailed, REASON_TEXT } from "@/lib/gemini";
import { json, readGuarded } from "@/lib/http";
import { parseDataUrl } from "@/lib/image";
import { asRecord } from "@/lib/json";
import { withObservability } from "@/lib/observe";
import { createLimiter } from "@/lib/ratelimit";
import { validateVision, VISION_PROMPT, VISION_SCHEMA, type VisionOutcome } from "@/lib/room";

export const runtime = "nodejs";
// Gemini calls are budgeted at 12 s (chat), 15 s (plan) and 20 s (vision); the map batches air
// requests. 30 s leaves headroom.
export const maxDuration = 30;

const limited = createLimiter(4, 60_000);
/** Findings are cached by the hash of the downscaled photo, never the photo itself. */
const findings = createCache<VisionOutcome>(30 * 60_000, 50);

/**
 * Reads a room photo for the three things that change indoor air; the photo is never stored, and
 * the findings are cached.
 */
export const POST = withObservability("vision", async (req: Request) => {
  // Decoded photo is capped at 1.5 MB (parseDataUrl); base64 plus JSON framing stays under this.
  const parsed = await readGuarded(req, {
    limited,
    maxBytes: 2_200_000,
    tooMany: "Too many photos. Try again in a minute.",
  });
  if (!parsed.ok) return parsed.res;

  const img = parseDataUrl(asRecord(parsed.body).image);
  if (img === "bad_type") return json({ error: "Send a JPEG, PNG or WebP photo." }, 415);
  if (img === "too_large")
    return json({ error: "That photo is too large. Try a smaller one." }, 413);

  const key = createHash("sha256").update(img.data).digest("hex");
  const hit = findings.get(key);
  if (hit) return json({ ...hit, source: "gemini", cached: true });

  const generated = await generateDetailed({
    prompt: VISION_PROMPT,
    maxTokens: 600,
    temperature: 0.1,
    schema: VISION_SCHEMA,
    images: [img],
    budgetMs: 20_000,
    timeoutMs: 20_000,
    kind: "vision",
  });
  if (!generated.ok)
    return json({
      status: "unavailable",
      reason: generated.reason,
      reasonText: REASON_TEXT[generated.reason],
    });

  // The model's reply is untrusted: only enum kinds, in-image boxes and sane confidences survive validation.
  const outcome = validateVision(generated.text);
  if (outcome.status !== "unreadable") findings.set(key, outcome);
  return json({ ...outcome, source: "gemini", model: generated.model });
});
