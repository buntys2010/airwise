"use client";
/** The strip under the header: city, today's level and advice. */

import Link from "next/link";

import { weatherKey } from "@/lib/data";
import { fmtHour } from "@/lib/engine";
import { ADVICE_KEY, CATEGORY_KEY } from "@/lib/i18n";

import { CityCigs } from "../cigs/CityCigs";
import { useLang } from "../LangProvider";
import { CityPicker } from "../map/CityPicker";
import type { Airwise } from "../useAirwise";

/** First thing on screen: where you are, how bad the air is (icon and word, never colour alone), and what you can do about it. */
export function SeverityStrip({ a }: { a: Airwise }) {
  const { lang, t } = useLang();
  const level = t(CATEGORY_KEY[a.cat.tone]);
  const wk = weatherKey(a.air.temp, a.air.wind);
  const weather =
    a.air.temp !== null && a.air.wind !== null
      ? t("strip.weather", { temp: a.air.temp, wind: a.air.wind })
      : "";
  return (
    <section className="severity" aria-labelledby="h1">
      <div className="cityline">
        <CityPicker value={a.cityId} onChange={a.setCityId} />
        <span className="cat">
          <i aria-hidden="true">{a.cat.icon}</i>
          {level}
        </span>
        <span>{t("strip.pm", { pm: a.hourly[a.nowHour], time: fmtHour(a.nowHour) })}</span>
        <span>{t("strip.aqi", { aqi: a.aqi })}</span>
        {weather && <span>{weather}</span>}
      </div>
      <CityCigs key={a.cityId} city={a.cityId} day={a.outdoorDay} soFar={a.outdoorSoFar} />
      <h1 id="h1">{t("strip.headline", { level: lang === "en" ? level.toLowerCase() : level })}</h1>
      <p className="lede">
        {[wk ? t(wk) : "", t(ADVICE_KEY[a.cat.tone])].filter(Boolean).join(" ")}{" "}
        <Link className="textlink" href="/guide">
          {t("strip.guide")}
        </Link>
      </p>
    </section>
  );
}
