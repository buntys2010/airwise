/** Live air for the chosen city: fetched on a timer, falling back to a labelled estimate. */
"use client";
import { useEffect, useState } from "react";

import { type AirResult, estimateHourly, istClock, loadAir } from "@/lib/air/live";
import { runInBackground } from "@/lib/background";
import type { City } from "@/lib/cities";
import { OUTDOOR_HOUR } from "@/lib/engine/model";

const REFRESH_MS = 15 * 60 * 1000;
const LOAD_TIMEOUT_MS = 10_000;
export type Status = "loading" | "live" | "estimate";

/**
 * Live air for a city, refreshed on a timer. Falls back to this city's own estimate and says so in
 * `status`.
 */
export function useLiveAir(city: City) {
  const [air, setAir] = useState<AirResult>(() => ({
    hourly: estimateHourly(city),
    source: "estimate",
    temp: null,
    wind: null,
    updated: null,
  }));
  const [status, setStatus] = useState<Status>("loading");
  const [nowHour, setNowHour] = useState(OUTDOOR_HOUR);
  const [elapsed, setElapsed] = useState(OUTDOOR_HOUR); // hours since midnight India time, with minutes

  // Live by default, refreshed every 15 minutes. A failed fetch is labelled as an estimate, never as live.
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    // Never show the previous city's curve under this city's name while the fetch is out: start
    // from this city's own estimate.
    setAir({
      hourly: estimateHourly(city),
      source: "estimate",
      temp: null,
      wind: null,
      updated: null,
    });
    const run = () => {
      // one request: cancelled with the effect, or after a timeout so a hung fetch falls back to
      // the estimate
      const req = new AbortController();
      const onAbort = () => req.abort();
      ctrl.signal.addEventListener("abort", onAbort);
      const timeout = setTimeout(onAbort, LOAD_TIMEOUT_MS);
      return loadAir(city, req.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setAir(r);
          setStatus(r.source);
          const clock = istClock();
          setNowHour(clock.hour);
          setElapsed(clock.elapsed);
        })
        .finally(() => {
          clearTimeout(timeout);
          ctrl.signal.removeEventListener("abort", onAbort);
        });
    };
    runInBackground(run());
    const timer = setInterval(() => runInBackground(run()), REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [city]);
  return { air, status, nowHour, elapsed };
}
