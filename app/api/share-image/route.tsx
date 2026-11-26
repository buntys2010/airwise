/** Share-image endpoint: draws the plan as a picture from choices only. */

import { ImageResponse } from "next/og";

import { cigsSoFar } from "@/lib/cigsHourly";
import { CITIES, getCityAir, istClock } from "@/lib/data";
import { aqiFromPm, categoryOf, NO_PLAN, planSummary, type Profile, simulate } from "@/lib/engine";
import { json } from "@/lib/http";
import { clientIp, createLimiter } from "@/lib/ratelimit";
import { decodeChoices } from "@/lib/share";

import { Poster, type PosterData } from "./poster";
import { layoutFor } from "./theme";

export const runtime = "nodejs";
export const maxDuration = 30;

const limited = createLimiter(20, 60_000);

const DEFAULT_PROFILE: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };
const MAX_FIXES_SHOWN = 3;
const IMAGE_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=600",
  "X-Content-Type-Options": "nosniff",
};

/** Recomputes every figure on the poster from live air data and the shared choices. */
async function buildPosterData(search: string): Promise<PosterData> {
  const shared = decodeChoices(search);
  const city = CITIES.find((c) => c.id === shared.city) ?? CITIES.find((c) => c.id === "delhi") ?? CITIES[0];
  const profile: Profile = { ...DEFAULT_PROFILE, ...(shared.profile ?? {}) };
  const plan = shared.plan ?? NO_PLAN;
  const air = await getCityAir(city);
  const hour = istClock().hour;
  const base = simulate(air.hourly, profile, NO_PLAN);
  const withPlan = simulate(air.hourly, profile, plan);
  const saved = Math.max(0, base.cigs - withPlan.cigs);
  return {
    cityName: city.name,
    aqi: aqiFromPm(air.hourly[hour]),
    level: categoryOf(air.hourly[hour]).label,
    baseCigs: base.cigs,
    planCigs: withPlan.cigs,
    baseSoFar: cigsSoFar(base, hour),
    planSoFar: cigsSoFar(withPlan, hour),
    pctLess: base.cigs > 0 ? Math.round((saved / base.cigs) * 100) : 0,
    fixes: planSummary(plan).slice(0, MAX_FIXES_SHOWN),
  };
}

/**
 * GET /api/share-image?city=…&home=…&plan=seal,purifier&size=card|og
 * The query carries CHOICES only (same format as a share link). Every number is recomputed here from live air data, so a link cannot forge a figure.
 */
export async function GET(req: Request) {
  if (limited(clientIp(req))) return json({ error: "Too many requests. Try again in a minute." }, 429);
  const url = new URL(req.url);
  const layout = layoutFor(url.searchParams.get("size") === "og");
  const data = await buildPosterData(url.search);
  return new ImageResponse(<Poster data={data} layout={layout} />, {
    width: layout.width,
    height: layout.height,
    headers: IMAGE_HEADERS,
  });
}
