"use client";
import { fmtHour } from "@/lib/engine";
import { ACTION_HI, CATEGORY_KEY, englishIn } from "@/lib/i18n";

import { useLang } from "./LangProvider";
import type { Airwise } from "./useAirwise";

/**
 * "Today, in one look": computed on every open from your saved household and the live air. There is no server memory behind it.
 */
export function MorningBrief({ a }: { a: Airwise }) {
  const { lang, t } = useLang();
  const first = [...a.actions].filter((x) => x.applicable).sort((x, y) => y.savedPm - x.savedPm)[0];
  const hi = first && lang === "hi" ? ACTION_HI[first.id] : undefined;
  return (
    <section className="brief" aria-labelledby="h-brief">
      <h2 id="h-brief">{t("brief.h")}</h2>
      <p>
        <strong>
          {t("brief.line", {
            city: a.city.name,
            time: fmtHour(a.nowHour),
            aqi: a.aqi,
            level: t(CATEGORY_KEY[a.cat.tone]),
          })}
        </strong>{" "}
        {t("brief.best", { hour: a.bestLabel, pm: a.hourly[a.best] })}{" "}
        {first && (
          <span {...(hi ? { lang: "hi" } : englishIn(lang))}>
            {t("brief.first", { fix: hi ? hi.title : first.title })}
          </span>
        )}
      </p>
    </section>
  );
}
