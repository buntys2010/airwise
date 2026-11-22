import { createHash } from "node:crypto";
import { createCache } from "@/lib/cache";
import { generateDetailed, REASON_TEXT } from "@/lib/gemini";
import { json, readGuarded } from "@/lib/http";
import { parseDataUrl } from "@/lib/image";
import { createLimiter } from "@/lib/ratelimit";
import { VISION_PROMPT, VISION_SCHEMA, validateVision, type VisionOutcome } from "@/lib/room";
import { withObservability } from "@/lib/observe";

export const runtime = "nodejs";
// Gemini calls are budgeted at 12 s (chat), 15 s (plan) and 20 s (vision); the map batches air requests. 30 s leaves headroom.
export const maxDuration = 30;

const limited = createLimiter(4, 60_000);
/** Findings are cached by the hash of the downscaled photo, never the photo itself. */
const findings = createCache<VisionOutcome>(30 * 60_000, 50);

export const POST = withObservability("vision", async (req: Request) => {
  // Decoded photo is capped at 1.5 MB (parseDataUrl); base64 plus JSON framing stays under this.
  const parsed = await readGuarded(req, {
    limited,
    maxBytes: 2_200_000,
    tooMany: "Too many photos. Try again in a minute.",
  });
  if (!parsed.ok) return parsed.res;

  const img = parseDataUrl((parsed.body as { image?: unknown } | null)?.image);
  if (img === "bad_type") return json({ error: "Send a JPEG, PNG or WebP photo." }, 415);
  if (img === "too_large")
    return json({ error: "That photo is too large. Try a smaller one." }, 413);

  const key = createHash("sha256").update(img.data).digest("hex");
  const hit = findings.get(key);
  if (hit) return json({ ...hit, source: "gemini", cached: true });

  const r = await generateDetailed({
    prompt: VISION_PROMPT,
    maxTokens: 600,
    temperature: 0.1,
    schema: VISION_SCHEMA,
    images: [img],
    budgetMs: 20_000,
    timeoutMs: 20_000,
    kind: "vision",
  });
  if (!r.ok)
    return json({ status: "unavailable", reason: r.reason, reasonText: REASON_TEXT[r.reason] });

  // The model's reply is untrusted: only enum kinds, in-image boxes and sane confidences survive validation.
  const outcome = validateVision(r.text);
  if (outcome.status !== "unreadable") findings.set(key, outcome);
  return json({ ...outcome, source: "gemini", model: r.model });
});
