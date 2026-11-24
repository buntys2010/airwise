/** The planner's state and derived values: profile, plan, live air, fixes and schedule. */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type AirResult, estimateHourly, istClock, loadAir } from "@/lib/air/live";
import { runInBackground } from "@/lib/background";
import { CITIES, type City } from "@/lib/cities";
import { FALLBACK_CITY } from "@/lib/cities";
import {
  type ActionResult,
  buildActions,
  fmtHour,
  planSummary,
  toggleAction,
} from "@/lib/engine/actions";
import { aqiFromPm, categoryOf } from "@/lib/engine/aqi";
import {
  bestHour,
  cigsSoFar,
  NO_PLAN,
  OUTDOOR_HOUR,
  outdoorCigs,
  outdoorCigsSoFar,
  type Plan,
  pmAt,
  type Profile,
  simulate,
} from "@/lib/engine/model";
import { hazeLevel } from "@/lib/haze";
import type { Lang } from "@/lib/lang";
import { SAMPLE_PROFILE_PATCH } from "@/lib/room";
import { buildSchedule } from "@/lib/schedule";
import { decodeChoices, sanitizePlan } from "@/lib/share";
import { clearSaved, readSaved, type StoreState, writeSaved } from "@/lib/store";

const REFRESH_MS = 15 * 60 * 1000;
const LOAD_TIMEOUT_MS = 10_000;
const sameProfile = (a: Profile, b: Profile) =>
  a.home === b.home &&
  a.commute === b.commute &&
  a.km === b.km &&
  a.cooking === b.cooking &&
  a.vulnerable === b.vulnerable;
/**
 * The sample-room family: an older flat in Lucknow, gas cooking, a two-wheeler commute, an
 * asthmatic child.
 */
export const DEFAULT_PROFILE: Profile = {
  home: SAMPLE_PROFILE_PATCH.home,
  commute: "bike",
  km: 8,
  cooking: SAMPLE_PROFILE_PATCH.cooking,
  vulnerable: true,
};
const DEFAULT_CITY = "lucknow";

type Status = "loading" | "live" | "estimate";

/**
 * Live air for a city, refreshed on a timer. Falls back to this city's own estimate and says so in
 * `status`.
 */
function useLiveAir(city: City) {
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

/**
 * All home-screen state and everything derived from it, in one place. The engine does the
 * arithmetic; this only holds choices.
 */
export function useAirwise(lang: Lang = "en") {
  const [cityId, setCityIdRaw] = useState(DEFAULT_CITY);
  const city = CITIES.find((c) => c.id === cityId) ?? FALLBACK_CITY;
  const { air, status, nowHour, elapsed } = useLiveAir(city);
  const [profile, setProfileRaw] = useState<Profile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<Plan>(NO_PLAN);
  const [prefill, setPrefill] = useState("");
  const [storeState, setStoreState] = useState<StoreState>("empty");
  const [hydrated, setHydrated] = useState(false);
  // always the latest profile, so async callers never write over newer edits
  const profileRef = useRef<Profile>(DEFAULT_PROFILE);
  profileRef.current = profile;
  // only the user's own changes are saved; opening someone's shared link never overwrites your save
  const touched = useRef(false);

  // First run: sample room first. City and household come from a shared link if there is one, else
  // from this device's save, else the defaults.
  useEffect(() => {
    const shared = decodeChoices(window.location.search);
    const { data, state } = readSaved();
    setStoreState(state);
    const nextCity = shared.city ?? data?.city;
    if (nextCity) setCityIdRaw(nextCity);
    const merged: Profile = {
      ...DEFAULT_PROFILE,
      ...(data?.profile ?? {}),
      ...(shared.profile ?? {}),
    };
    if (data || shared.profile) setProfileRaw(merged);
    if (shared.plan) setPlan(sanitizePlan(shared.plan, merged.commute));
    const ask = new URLSearchParams(window.location.search).get("ask"); // questions sent from the guide page
    if (ask) setPrefill(ask.slice(0, 400));
    setHydrated(true);
  }, []);

  // Device-only save of the user's own choices. Never sent anywhere.
  useEffect(() => {
    if (!hydrated || !touched.current) return;
    setStoreState(writeSaved({ city: cityId, profile }));
  }, [hydrated, cityId, profile]);

  const hourly = air.hourly;
  const base = useMemo(() => simulate(hourly, profile, NO_PLAN), [hourly, profile]);
  const withPlan = useMemo(() => simulate(hourly, profile, plan), [hourly, profile, plan]);
  const actions = useMemo(() => buildActions(hourly, profile, lang), [hourly, profile, lang]);
  const schedule = useMemo(() => buildSchedule(hourly, profile, lang), [hourly, profile, lang]);
  const best = bestHour(hourly);
  const category = categoryOf(pmAt(hourly, nowHour));
  const outdoorDay = useMemo(() => outdoorCigs(hourly), [hourly]);
  const outdoorSoFar = useMemo(() => outdoorCigsSoFar(hourly, elapsed), [hourly, elapsed]);
  const soFar = useMemo(
    () => cigsSoFar(hourly, profile, plan, elapsed),
    [hourly, profile, plan, elapsed],
  );
  const saved = base.cigs - withPlan.cigs;
  const savedPct = base.meanPm > 0 ? Math.round((saved / base.cigs) * 100) : 0;

  // The page itself clears as your exposure drops: --haze drives the sky, the sun, the grain and
  // the room's smog layer.
  // It is relative to your own before and after, so the change is visible on moderate days too (lib/haze.ts).
  const nowPm = pmAt(hourly, nowHour);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--haze",
      hazeLevel(nowPm, base.meanPm, withPlan.meanPm).toFixed(3),
    );
  }, [nowPm, base.meanPm, withPlan.meanPm]);

  const setCityId = useCallback((id: string) => {
    touched.current = true;
    setCityIdRaw(id);
    setPlan(NO_PLAN);
  }, []);
  /**
   * Changing the household resets the plan, but only when something actually changed: an unchanged
   * profile keeps the fixes already ticked.
   */
  const updateProfile = useCallback((next: Profile | ((cur: Profile) => Profile)) => {
    const nextProfile = typeof next === "function" ? next(profileRef.current) : next;
    if (sameProfile(nextProfile, profileRef.current)) return;
    touched.current = true;
    profileRef.current = nextProfile;
    setProfileRaw(nextProfile);
    setPlan(NO_PLAN);
  }, []);
  const setProfile = updateProfile;
  const toggle = useCallback((a: ActionResult) => setPlan((p) => toggleAction(p, a)), []);
  /** Forget what is saved on this device and go back to the sample family. */
  const forget = useCallback(() => {
    touched.current = false;
    setStoreState(clearSaved());
    setCityIdRaw(DEFAULT_CITY);
    setProfileRaw(DEFAULT_PROFILE);
    setPlan(NO_PLAN);
  }, []);

  /** The only thing sent to the server: choices from fixed lists. The server recomputes every figure. */
  const choices = useMemo(
    () => ({ city: cityId, ...profile, plan, lang }),
    [cityId, profile, plan, lang],
  );

  return {
    cityId,
    city,
    setCityId,
    air,
    hourly,
    status,
    nowHour,
    profile,
    setProfile,
    plan,
    setPlan,
    toggle,
    prefill,
    base,
    withPlan,
    actions,
    schedule,
    best,
    cat: category,
    saved,
    savedPct,
    storeState,
    forget,
    soFar,
    elapsed,
    outdoorDay,
    outdoorSoFar,
    peak: Math.max(...hourly),
    aqi: aqiFromPm(pmAt(hourly, nowHour)),
    bestLabel: fmtHour(best),
    planWords: planSummary(plan),
    choices,
    co2Saved: base.co2Kg - withPlan.co2Kg,
  };
}

/** Everything the planner page needs, as returned by useAirwise. */
export type Airwise = ReturnType<typeof useAirwise>;
