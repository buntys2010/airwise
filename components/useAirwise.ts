"use client";
/** The home screen's state: household, live air and everything derived from them. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatContext, Lang } from "@/lib/chat";
import { type AirResult, CITIES, estimateHourly, istClock, loadAir } from "@/lib/data";
import {
  type ActionResult,
  aqiFromPm,
  bestHour,
  buildActions,
  categoryOf,
  cigsSoFar,
  fmtHour,
  NO_PLAN,
  OUTDOOR_HOUR,
  outdoorCigs,
  outdoorCigsSoFar,
  type Plan,
  planSummary,
  type Profile,
  simulate,
  toggleAction,
} from "@/lib/engine";
import { hazeLevel } from "@/lib/haze";
import { SAMPLE_PROFILE_PATCH } from "@/lib/room";
import { buildSchedule } from "@/lib/schedule";
import { decodeChoices } from "@/lib/share";
import { clearSaved, readSaved, type StoreState, writeSaved } from "@/lib/store";

const REFRESH_MS = 15 * 60 * 1000;
const MAX_PREFILL_LENGTH = 400;
/** The sample-room family: an older flat in Lucknow, gas cooking, a two-wheeler commute, an asthmatic child. */
export const DEFAULT_PROFILE: Profile = {
  home: SAMPLE_PROFILE_PATCH.home,
  commute: "bike",
  km: 8,
  cooking: SAMPLE_PROFILE_PATCH.cooking,
  vulnerable: true,
};
export const DEFAULT_CITY = "lucknow";

export type Status = "loading" | "live" | "estimate";

type CityRecord = (typeof CITIES)[number];

/** The saved household, loaded once from a shared link or this device, and saved again only when the user changes it. */
function useHousehold(lang: Lang) {
  const [cityId, setCityIdRaw] = useState(DEFAULT_CITY);
  const [profile, setProfileRaw] = useState<Profile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<Plan>(NO_PLAN);
  const [prefill, setPrefill] = useState("");
  const [storeState, setStoreState] = useState<StoreState>("empty");
  const [hydrated, setHydrated] = useState(false);
  const touched = useRef(false); // only the user's own changes are saved; opening someone's shared link never overwrites your save

  // First run: sample room first. City and household come from a shared link if there is one, else from this device's save, else the defaults.
  useEffect(() => {
    const shared = decodeChoices(window.location.search);
    const { data, state } = readSaved();
    setStoreState(state);
    const nextCity = shared.city ?? data?.city;
    if (nextCity) setCityIdRaw(nextCity);
    if (data || shared.profile)
      setProfileRaw({ ...DEFAULT_PROFILE, ...(data?.profile ?? {}), ...(shared.profile ?? {}) });
    if (shared.plan) setPlan(shared.plan);
    const ask = new URLSearchParams(window.location.search).get("ask"); // questions sent from the guide page
    if (ask) setPrefill(ask.slice(0, MAX_PREFILL_LENGTH));
    setHydrated(true);
  }, []);

  // Device-only save of the user's own choices. Never sent anywhere.
  useEffect(() => {
    if (!hydrated || !touched.current) return;
    setStoreState(writeSaved({ city: cityId, profile }));
  }, [hydrated, cityId, profile]);

  const setCityId = useCallback((id: string) => {
    touched.current = true;
    setCityIdRaw(id);
    setPlan(NO_PLAN);
  }, []);
  const setProfile = useCallback((p: Profile) => {
    touched.current = true;
    setProfileRaw(p);
    setPlan(NO_PLAN);
  }, []);
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
  const choices = useMemo(() => ({ city: cityId, ...profile, plan, lang }), [cityId, profile, plan, lang]);

  return {
    cityId,
    setCityId,
    profile,
    setProfile,
    plan,
    setPlan,
    toggle,
    prefill,
    storeState,
    forget,
    choices,
  };
}

/** Live air for a city, refreshed every 15 minutes. A failed fetch is labelled as an estimate, never as live. */
function useAirData(city: CityRecord) {
  const [air, setAir] = useState<AirResult>(() => ({
    hourly: estimateHourly(CITIES.find((c) => c.id === DEFAULT_CITY) ?? CITIES[0]),
    source: "estimate",
    temp: null,
    wind: null,
    updated: null,
  }));
  const [status, setStatus] = useState<Status>("loading");
  const [nowHour, setNowHour] = useState(OUTDOOR_HOUR);
  const [elapsed, setElapsed] = useState(OUTDOOR_HOUR); // hours since midnight India time, with minutes

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    const run = () => {
      void loadAir(city, ctrl.signal).then((r) => {
        if (ctrl.signal.aborted) return;
        setAir(r);
        setStatus(r.source);
        const c = istClock();
        setNowHour(c.hour);
        setElapsed(c.elapsed);
      });
    };
    run();
    const timer = setInterval(run, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [city]);

  return { air, status, nowHour, elapsed };
}

/** Everything derived from the air, the household and the plan. The engine does the arithmetic; this only memoises it. */
function useExposure(hourly: number[], profile: Profile, plan: Plan, nowHour: number, elapsed: number) {
  const base = useMemo(() => simulate(hourly, profile, NO_PLAN), [hourly, profile]);
  const withPlan = useMemo(() => simulate(hourly, profile, plan), [hourly, profile, plan]);
  const actions = useMemo(() => buildActions(hourly, profile), [hourly, profile]);
  const schedule = useMemo(() => buildSchedule(hourly, profile), [hourly, profile]);
  const outdoorDay = useMemo(() => outdoorCigs(hourly), [hourly]);
  const outdoorSoFar = useMemo(() => outdoorCigsSoFar(hourly, elapsed), [hourly, elapsed]);
  const soFar = useMemo(() => cigsSoFar(hourly, profile, plan, elapsed), [hourly, profile, plan, elapsed]);
  const saved = base.cigs - withPlan.cigs;
  return {
    base,
    withPlan,
    actions,
    schedule,
    outdoorDay,
    outdoorSoFar,
    soFar,
    saved,
    savedPct: base.meanPm > 0 ? Math.round((saved / base.cigs) * 100) : 0,
    best: bestHour(hourly),
    cat: categoryOf(hourly[nowHour]),
    co2Saved: base.co2Kg - withPlan.co2Kg,
  };
}

/** The page itself clears as your exposure drops: --haze drives the sky, the sun, the grain and the room's smog layer.
 * It is relative to your own before and after, so the change is visible on moderate days too (lib/haze.ts). */
function useHaze(nowPm: number, beforePm: number, afterPm: number) {
  useEffect(() => {
    document.documentElement.style.setProperty("--haze", hazeLevel(nowPm, beforePm, afterPm).toFixed(3));
  }, [nowPm, beforePm, afterPm]);
}

/** All home-screen state and everything derived from it, in one place. The engine does the arithmetic; this only holds choices. */
export function useAirwise(lang: Lang = "en") {
  const household = useHousehold(lang);
  const city = CITIES.find((c) => c.id === household.cityId) ?? CITIES[0];
  const { air, status, nowHour, elapsed } = useAirData(city);
  const hourly = air.hourly;
  const exposure = useExposure(hourly, household.profile, household.plan, nowHour, elapsed);
  useHaze(hourly[nowHour], exposure.base.meanPm, exposure.withPlan.meanPm);

  return {
    ...household,
    ...exposure,
    city,
    air,
    hourly,
    status,
    nowHour,
    elapsed,
    peak: Math.max(...hourly),
    aqi: aqiFromPm(hourly[nowHour]),
    bestLabel: fmtHour(exposure.best),
    planWords: planSummary(household.plan),
  };
}

export type Airwise = ReturnType<typeof useAirwise>;
export type { ChatContext };
