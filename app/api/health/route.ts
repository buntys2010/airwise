import { NextResponse } from "next/server";

import { withObservability } from "@/lib/observe";

export const runtime = "nodejs";
// Never cached: a health check that answers from a cache says nothing about the server behind it.
export const dynamic = "force-dynamic";

/**
 * Liveness probe for load balancers, uptime monitors and the smoke test. Makes no outbound calls,
 * so it stays fast and cannot spend quota.
 */
export const GET = withObservability("health", () =>
  NextResponse.json(
    { status: "ok", uptimeSeconds: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } },
  ),
);
