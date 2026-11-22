"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ActionList } from "@/components/ActionList";
import { Chat } from "@/components/Chat";
import { Header } from "@/components/Chrome";
import { DayPlan } from "@/components/DayPlan";
import { DoseBars } from "@/components/DoseBars";
import { FixRows } from "@/components/FixRows";
import { HourChart } from "@/components/HourChart";
import { MorningBrief } from "@/components/MorningBrief";
import { PlanTools } from "@/components/PlanTools";
import { useLang } from "@/components/LangProvider";
import { PHOTO_INPUT_ID, PhotoPicker } from "@/components/PhotoPicker";
import { ProfileForm } from "@/components/ProfileForm";
import { RoomPanel } from "@/components/RoomPanel";
import { SeverityStrip } from "@/components/SeverityStrip";
import { useAirwise } from "@/components/useAirwise";
import { useRoom } from "@/components/useRoom";
import { ValueList } from "@/components/ValueList";
import { OUTDOOR_HOUR, fmtHour } from "@/lib/engine";
import { englishIn } from "@/lib/i18n";
import { rankProducts } from "@/lib/room";

export default function Page() {
  const { lang, t } = useLang();
  const a = useAirwise(lang);
  const room = useRoom(a);
  const hotspots = room.hotspots;
  const products = useMemo(() => rankProducts(a.hourly, a.profile), [a.hourly, a.profile]);
  const pick = (id: string) => { const act = a.actions.find((x) => x.id === id); if (act) a.toggle(act); };
  const openPhoto = () => document.getElementById(PHOTO_INPUT_ID)?.click();

  const badge =
    a.status === "live" ? { cls: "live", text: t("badge.live", { time: a.air.updated ?? "" }) } :
    a.status === "loading" ? { cls: "loading", text: t("badge.loading") } :
    { cls: "estimate", text: t("badge.estimate") };

  return (
    <div className="wrap">
      <Header>
        <span className={`badge ${badge.cls}`} role="status"><i aria-hidden="true" />{badge.text}</span>
      </Header>

      <main id="main">
        <SeverityStrip a={a} />
        <MorningBrief a={a} />

        <div className="homegrid">
          <RoomPanel a={a} hotspots={hotspots} photoUrl={room.photoUrl} onPick={pick} footer={<PhotoPicker room={room} />} />
          <div className="homeside">
            <h2 className="sr-only">{t("fix.heading")}</h2>
            <FixRows a={a} hotspots={hotspots} />
            <h2 className="chat-h">{t("chat.title")}</h2>
            <Chat choices={a.choices} prefill={a.prefill} onCamera={openPhoto} />
            <PlanTools a={a} />
          </div>
        </div>

        <section aria-labelledby="h-value">
          <div className="sec-head"><h2 id="h-value">{t("value.h")}</h2><p>{t("value.sub")}</p></div>
          <ValueList products={products} />
        </section>

        <section aria-labelledby="h-home">
          <div className="sec-head"><h2 id="h-home">{t("sec.home.h")}</h2><p>{t("sec.home.p")}</p></div>
          <div {...englishIn(lang)}><ProfileForm profile={a.profile} onChange={a.setProfile} /></div>
        </section>

        <section aria-labelledby="h-day">
          <div className="sec-head"><h2 id="h-day">{t("sec.day.h")}</h2>
            <p {...englishIn(lang)}>The air is usually worst before dawn and again at dusk. The cleanest window is around <strong>{a.bestLabel}</strong>, when it is {a.hourly[a.best]} µg/m³ instead of {a.hourly[OUTDOOR_HOUR]} at your usual {fmtHour(OUTDOOR_HOUR)} outing.</p></div>
          <div {...englishIn(lang)}><HourChart hourly={a.hourly} best={a.best} usual={OUTDOOR_HOUR} /></div>
        </section>

        <section aria-labelledby="h-plan">
          <div className="sec-head"><h2 id="h-plan">{t("sec.plan.h")}</h2><p>{t("sec.plan.p")}</p></div>
          <div {...englishIn(lang)}><ActionList actions={a.actions} plan={a.plan} onChange={a.setPlan} /></div>
        </section>

        <section aria-labelledby="h-daily">
          <div className="sec-head"><h2 id="h-daily">{t("sec.daily.h")}</h2>
            <p {...englishIn(lang)}>What to do at each key hour, with the live outdoor air quality at that time. Gemini can rewrite it in your own words, and every number is checked first.</p></div>
          <div {...englishIn(lang)}><DayPlan schedule={a.schedule} choices={a.choices} /></div>
        </section>

        <section aria-labelledby="h-dose">
          <div className="sec-head"><h2 id="h-dose">{t("sec.dose.h")}</h2>
            <p {...englishIn(lang)}>Most families breathe more at home than on the street, so the biggest wins are often indoors.</p></div>
          <div {...englishIn(lang)}><DoseBars base={a.base} plan={a.withPlan} /></div>
        </section>
      </main>

      <footer>
        <p {...englishIn(lang)}><strong>How we calculate.</strong> Hourly PM2.5, temperature and wind come live from Open-Meteo for the city you pick. A small, tested model adds up the air you breathe at home, on your commute, outdoors and while cooking, hour by hour. The AI explains the result; it never invents the numbers. The cigarette comparison uses a rule of thumb of about 22 µg/m³ of PM2.5 per cigarette a day. Every factor is listed in the <Link className="textlink" href="/guide#how">guide</Link> and in docs/methodology.md.</p>
        <p style={{ marginTop: 10 }}>{t("foot.disclaimer")}</p>
      </footer>
    </div>
  );
}
