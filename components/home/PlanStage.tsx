/** The "plan" stage: the cleanest hour, the day's schedule, what to buy, and where the dose comes from. */
"use client";
import { DayPlan } from "@/components/DayPlan";
import { DoseBars } from "@/components/DoseBars";
import { HourChart } from "@/components/HourChart";
import { useLang } from "@/components/LangProvider";
import type { Airwise } from "@/components/useAirwise";
import { ValueList } from "@/components/ValueList";
import { fmtHour } from "@/lib/engine/actions";
import { OUTDOOR_HOUR } from "@/lib/engine/model";
import { englishIn } from "@/lib/i18n";
import type { Lang } from "@/lib/lang";
import type { RankedProduct } from "@/lib/room";

/**
 * The "plan" stage: the cleanest hour, the day's schedule, what is worth buying, and where the dose
 * comes from.
 */
export function PlanStage({
  airwise,
  lang,
  products,
  hidden,
  active,
}: Readonly<{
  airwise: Airwise;
  lang: Lang;
  products: RankedProduct[];
  hidden: boolean;
  active: boolean;
}>) {
  const { t } = useLang();
  return (
    <section id="stage-plan" aria-labelledby="h-plan" hidden={hidden}>
      <div className="sec-head">
        <h2 id="h-plan">{t("dock.plan")}</h2>
        <p className="safewindow">{t("plan.window", { time: airwise.bestLabel })}</p>
        <p {...englishIn(lang)}>
          The air is usually worst before dawn and again at dusk. The cleanest window is around{" "}
          <strong>{airwise.bestLabel}</strong>, when it is {airwise.hourly[airwise.best]} µg/m³
          instead of {airwise.hourly[OUTDOOR_HOUR]} at your usual {fmtHour(OUTDOOR_HOUR)} outing.
        </p>
      </div>
      <div {...englishIn(lang)}>
        <HourChart hourly={airwise.hourly} best={airwise.best} usual={OUTDOOR_HOUR} />
      </div>
      <div className="sec-head">
        <h2 id="h-daily">{t("sec.daily.h")}</h2>
      </div>
      <DayPlan schedule={airwise.schedule} choices={airwise.choices} active={active} />
      <section aria-labelledby="h-value">
        <div className="sec-head">
          <h2 id="h-value">{t("value.h")}</h2>
          <p>{t("value.sub")}</p>
        </div>
        <ValueList products={products} />
      </section>
      <div className="sec-head">
        <h2 id="h-dose">{t("sec.dose.h")}</h2>
      </div>
      <div {...englishIn(lang)}>
        <DoseBars base={airwise.base} plan={airwise.withPlan} />
      </div>
    </section>
  );
}
