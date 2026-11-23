import { ImageResponse } from "next/og";

import { istClock } from "@/lib/air/live";
import { getCityAir } from "@/lib/air/server";
import { cigsSoFar } from "@/lib/cigsHourly";
import { CITIES } from "@/lib/cities";
import { FALLBACK_CITY } from "@/lib/cities";
import { planSummary } from "@/lib/engine/actions";
import { aqiFromPm, categoryOf } from "@/lib/engine/aqi";
import { NO_PLAN, type Plan, pmAt, type Profile, simulate } from "@/lib/engine/model";
import { json } from "@/lib/http";
import { categoryLabel } from "@/lib/i18n";
import { withObservability } from "@/lib/observe";
import { clientIp, createLimiter } from "@/lib/ratelimit";
import { decodeChoices } from "@/lib/share";

import { type CardData, cardSize, ShareCardImage } from "./card";

export const runtime = "nodejs";
export const maxDuration = 30;

const limited = createLimiter(20, 60_000);

const DEFAULT_PROFILE: Profile = {
  home: "leaky",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
};

/**
 * GET /api/share-image?city=…&home=…&plan=seal,purifier&size=card|og
 * The query carries CHOICES only (same format as a share link). Every number is recomputed here
 * from live air data, so a link cannot forge a figure.
 */
export const GET = withObservability("share-image", async (req: Request) => {
  if (limited(clientIp(req)))
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  const url = new URL(req.url);
  const shared = decodeChoices(url.search);
  const city =
    CITIES.find((c) => c.id === shared.city) ??
    CITIES.find((c) => c.id === "delhi") ??
    FALLBACK_CITY;
  const profile: Profile = { ...DEFAULT_PROFILE, ...(shared.profile ?? {}) };
  const plan: Plan = shared.plan ?? NO_PLAN;
  const og = url.searchParams.get("size") === "og";

  const air = await getCityAir(city);
  const hour = istClock().hour;
  const base = simulate(air.hourly, profile, NO_PLAN);
  const withPlan = simulate(air.hourly, profile, plan);
  const saved = Math.max(0, base.cigs - withPlan.cigs);

  const card: CardData = {
    og,
    cityName: city.name,
    aqi: aqiFromPm(pmAt(air.hourly, hour)),
    level: categoryLabel(categoryOf(pmAt(air.hourly, hour)).tone),
    baseCigs: base.cigs,
    planCigs: withPlan.cigs,
    baseSoFar: cigsSoFar(base, hour),
    planSoFar: cigsSoFar(withPlan, hour),
    pct: base.cigs > 0 ? Math.round((saved / base.cigs) * 100) : 0,
    fixes: planSummary(plan).slice(0, 3),
  };

  return new ImageResponse(<ShareCardImage d={card} />, {
    ...cardSize(og),
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
