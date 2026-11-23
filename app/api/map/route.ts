import { istClock, loadMap } from "@/lib/data";
import { json } from "@/lib/http";
import { withObservability } from "@/lib/observe";
import { clientIp, createLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
// Gemini calls are budgeted at 12 s (chat), 15 s (plan) and 20 s (vision); the map batches air
// requests. 30 s leaves headroom.
export const maxDuration = 30;

const limited = createLimiter(30, 60_000);

/**
 * Current PM2.5 for every supported city, from ONE batched request to the air feed, cached for ten
 * minutes on the server.
 * A city whose data is missing or malformed is labelled an estimate individually.
 */
export const GET = withObservability("map", async (req: Request) => {
  if (limited(clientIp(req)))
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  const clock = istClock();
  const points = await loadMap(clock.hour);
  // Shared, non-personal data: let the CDN absorb repeat requests instead of every instance
  // refetching the feed.
  return json(
    {
      points,
      hour: clock.hour,
      time: clock.label,
      live: points.filter((p) => p.source === "live").length,
    },
    200,
    { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  );
});
