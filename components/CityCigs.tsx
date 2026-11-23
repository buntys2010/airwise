"use client";
import { sticksFor } from "@/lib/cigsHourly";

import { CigRow } from "./Cigarettes";
import { useLang } from "./LangProvider";

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
  const sticks = sticksFor(day, soFar);
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
