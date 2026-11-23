"use client";
import { useEffect, useState } from "react";
import { sticksFor } from "@/lib/cigsHourly";
import { CigRow } from "./Cigarettes";
import { useLang } from "./LangProvider";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Burns from nothing up to `target` over 1.4 s (ease-out); remounting on a city change replays it. Static under reduced motion. */
function useBurn(target: number) {
  const [p, setP] = useState(0); // the same on server and client, so hydration never disagrees; the effect plays it
  useEffect(() => {
    if (prefersReduced()) {
      setP(1);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / 1400); // one clock for start and now, whatever the frame callback reports
      setP(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setP(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return p;
}

/**
 * The very top of the page: what a person would breathe outdoors all day in the chosen city, as cigarettes.
 * `day` and `soFar` are engine figures (outdoorCigs and outdoorCigsSoFar); nothing is computed here.
 */
export function CityCigs({
  day,
  soFar,
  city,
}: Readonly<{ day: number; soFar: number; city: string }>) {
  const { t } = useLang();
  const p = useBurn(soFar);
  const sticks = sticksFor(day, soFar * p);
  return (
    <div className="citycigs" data-city={city}>
      <CigRow sticks={sticks} tone="base" />
      <p>
        <span className="sr-only">
          {t("strip.cigs", { n: day.toFixed(1) })} {t("strip.cigsSo", { n: soFar.toFixed(1) })}
        </span>
        <span aria-hidden="true">
          <b>{t("strip.cigs", { n: day.toFixed(1) })}</b>{" "}
          <small>{t("strip.cigsSo", { n: soFar.toFixed(1) })}</small>
        </span>
      </p>
    </div>
  );
}
