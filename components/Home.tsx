"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type ActiveTab, BottomDock } from "@/components/BottomDock";
import { Chat } from "@/components/Chat";
import { Header } from "@/components/Chrome";
import { Cigarettes } from "@/components/Cigarettes";
import { DayPlan } from "@/components/DayPlan";
import { DoseBars } from "@/components/DoseBars";
import { FixRows } from "@/components/FixRows";
import { HourChart } from "@/components/HourChart";
import { useLang } from "@/components/LangProvider";
import { MorningBrief } from "@/components/MorningBrief";
import { PHOTO_INPUT_ID, PhotoPicker } from "@/components/PhotoPicker";
import { PlanTools } from "@/components/PlanTools";
import { ProfilePills } from "@/components/ProfilePills";
import { RoomPanel } from "@/components/RoomPanel";
import { SeverityStrip } from "@/components/SeverityStrip";
import { ShareCard } from "@/components/ShareCard";
import { useAirwise } from "@/components/useAirwise";
import { useRoom } from "@/components/useRoom";
import { ValueList } from "@/components/ValueList";
import { fmtHour, OUTDOOR_HOUR } from "@/lib/engine";
import { englishIn } from "@/lib/i18n";
import { rankProducts } from "@/lib/room";

export function Home() {
  const { lang, t } = useLang();
  const a = useAirwise(lang);
  const room = useRoom(a);
  const hotspots = room.hotspots;
  const products = useMemo(() => rankProducts(a.hourly, a.profile), [a.hourly, a.profile]);
  const [tab, setTabRaw] = useState<ActiveTab>("room");
  /** Switching a tab also brings its content into view; the hero above is tall, so without this a tap seems to do nothing. */
  const setTab = (next: ActiveTab) => {
    setTabRaw(next);
    requestAnimationFrame(() => {
      const target =
        next === "room" ? document.getElementById("main") : document.getElementById(`stage-${next}`);
      target?.scrollIntoView?.({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  };
  const pick = (id: string) => {
    const act = a.actions.find((x) => x.id === id);
    if (act) a.toggle(act);
  };
  const openPhoto = () => {
    setTab("room");
    document.getElementById(PHOTO_INPUT_ID)?.click();
  };

  const badge =
    a.status === "live"
      ? { cls: "live", text: t("badge.live", { time: a.air.updated ?? "" }) }
      : a.status === "loading"
        ? { cls: "loading", text: t("badge.loading") }
        : { cls: "estimate", text: t("badge.estimate") };

  /* Every stage stays mounted and is only hidden, so a typed question, an answer or a photo survives a tab change. */
  return (
    <div className="wrap hasdock">
      <Header>
        <span className={`badge ${badge.cls}`} role="status">
          <i aria-hidden="true" />
          {badge.text}
        </span>
      </Header>

      <main id="main" className="main-wrap">
        <SeverityStrip a={a} />
        <Cigarettes a={a} />
        <MorningBrief a={a} />

        <section id="stage-room" aria-labelledby="h-room" hidden={tab !== "room"}>
          <h2 id="h-room" className="sr-only">
            {t("dock.room")}
          </h2>
          <div className="homegrid">
            <RoomPanel
              a={a}
              hotspots={hotspots}
              photoUrl={room.photoUrl}
              onPick={pick}
              footer={<PhotoPicker room={room} />}
            />
            <div className="homeside">
              <h2 className="sr-only">{t("fix.heading")}</h2>
              <FixRows a={a} hotspots={hotspots} />
              <ProfilePills profile={a.profile} onChange={a.setProfile} lang={lang} />
              <button type="button" className="btn ghost nextstage" onClick={() => setTab("plan")}>
                {t("plan.cta")} ➔
              </button>
            </div>
          </div>
        </section>

        <section id="stage-plan" aria-labelledby="h-plan" hidden={tab !== "plan"}>
          <div className="sec-head">
            <h2 id="h-plan">{t("dock.plan")}</h2>
            <p className="safewindow">{t("plan.window", { time: a.bestLabel })}</p>
            <p {...englishIn(lang)}>
              The air is usually worst before dawn and again at dusk. The cleanest window is around{" "}
              <strong>{a.bestLabel}</strong>, when it is {a.hourly[a.best]} µg/m³ instead of{" "}
              {a.hourly[OUTDOOR_HOUR]} at your usual {fmtHour(OUTDOOR_HOUR)} outing.
            </p>
          </div>
          <div {...englishIn(lang)}>
            <HourChart hourly={a.hourly} best={a.best} usual={OUTDOOR_HOUR} />
          </div>
          <div className="sec-head">
            <h2 id="h-daily">{t("sec.daily.h")}</h2>
          </div>
          <DayPlan schedule={a.schedule} choices={a.choices} active={tab === "plan"} />
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
            <DoseBars base={a.base} plan={a.withPlan} />
          </div>
        </section>

        <section id="stage-copilot" aria-labelledby="h-chat" hidden={tab !== "copilot"}>
          <h2 id="h-chat" className="chat-h">
            {t("chat.title")}
          </h2>
          <Chat choices={a.choices} prefill={a.prefill} onCamera={openPhoto} />
        </section>

        <section id="stage-share" aria-labelledby="h-share" hidden={tab !== "share"}>
          <h2 id="h-share" className="sr-only">
            {t("dock.share")}
          </h2>
          <ShareCard a={a} />
          <PlanTools a={a} />
        </section>
      </main>

      <footer>
        <p {...englishIn(lang)}>
          <strong>How we calculate.</strong> Hourly PM2.5, temperature and wind come live from Open-Meteo for
          the city you pick. A small, tested model adds up the air you breathe at home, on your commute,
          outdoors and while cooking, hour by hour. The AI explains the result; it never invents the numbers.
          The cigarette comparison uses a rule of thumb of about 22 µg/m³ of PM2.5 per cigarette a day. Every
          factor is listed in the{" "}
          <Link className="textlink" href="/guide#how">
            guide
          </Link>{" "}
          and in docs/methodology.md.
        </p>
        <p style={{ marginTop: 10 }}>{t("foot.disclaimer")}</p>
      </footer>

      <BottomDock activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
