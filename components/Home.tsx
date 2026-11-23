"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BottomDock, type ActiveTab } from "@/components/BottomDock";
import { Chat } from "@/components/Chat";
import { Cigarettes } from "@/components/Cigarettes";
import { Header } from "@/components/Chrome";
import { DayPlan } from "@/components/DayPlan";
import { DoseBars } from "@/components/DoseBars";
import { FixRows } from "@/components/FixRows";
import { HourChart } from "@/components/HourChart";
import { MorningBrief } from "@/components/MorningBrief";
import { PlanTools } from "@/components/PlanTools";
import { useLang } from "@/components/LangProvider";
import { PHOTO_INPUT_ID, PhotoPicker } from "@/components/PhotoPicker";
import { ProfilePills } from "@/components/ProfilePills";
import { RoomPanel } from "@/components/RoomPanel";
import { SeverityStrip } from "@/components/SeverityStrip";
import { ShareCard } from "@/components/ShareCard";
import { useAirwise, type Airwise } from "@/components/useAirwise";
import { useRoom, type Room } from "@/components/useRoom";
import { ValueList } from "@/components/ValueList";
import { OUTDOOR_HOUR, fmtHour } from "@/lib/engine";
import { englishIn } from "@/lib/i18n";
import type { Lang } from "@/lib/chat";
import { rankProducts, type Hotspot, type RankedProduct } from "@/lib/room";

/** The "your home" stage: the room photo, the fixes it points to, and the household. */
function RoomStage({
  airwise,
  room,
  hotspots,
  onPick,
  hidden,
  onNext,
}: Readonly<{
  airwise: Airwise;
  room: Room;
  hotspots: Hotspot[];
  onPick: (id: string) => void;
  hidden: boolean;
  onNext: () => void;
}>) {
  const { lang, t } = useLang();
  return (
    <section id="stage-room" aria-labelledby="h-room" hidden={hidden}>
      <h2 id="h-room" className="sr-only">
        {t("dock.room")}
      </h2>
      <div className="homegrid">
        <RoomPanel
          a={airwise}
          hotspots={hotspots}
          photoUrl={room.photoUrl}
          onPick={onPick}
          footer={<PhotoPicker room={room} />}
        />
        <div className="homeside">
          <h2 className="sr-only">{t("fix.heading")}</h2>
          <FixRows a={airwise} hotspots={hotspots} />
          <ProfilePills profile={airwise.profile} onChange={airwise.setProfile} lang={lang} />
          <button type="button" className="btn ghost nextstage" onClick={onNext}>
            {t("plan.cta")} ➔
          </button>
        </div>
      </div>
    </section>
  );
}

/** The "plan" stage: the cleanest hour, the day's schedule, what is worth buying, and where the dose comes from. */
function PlanStage({
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

/** The home screen: air strip, actions, plan, cigarettes, chat and room panel, wired to useAirwise. */
export function Home() {
  const { lang, t } = useLang();
  const airwise = useAirwise(lang);
  const room = useRoom(airwise);
  const hotspots = room.hotspots;
  const products = useMemo(
    () => rankProducts(airwise.hourly, airwise.profile),
    [airwise.hourly, airwise.profile],
  );
  const [tab, setTabRaw] = useState<ActiveTab>("room");
  /** Switching a tab also brings its content into view; the hero above is tall, so without this a tap seems to do nothing. */
  const setTab = (next: ActiveTab) => {
    setTabRaw(next);
    requestAnimationFrame(() => {
      const target =
        next === "room"
          ? document.getElementById("main")
          : document.getElementById(`stage-${next}`);
      target?.scrollIntoView?.({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  };
  const pick = (id: string) => {
    const act = airwise.actions.find((x) => x.id === id);
    if (act) airwise.toggle(act);
  };
  const openPhoto = () => {
    setTab("room");
    document.getElementById(PHOTO_INPUT_ID)?.click();
  };

  const badges = {
    live: { cls: "live", text: t("badge.live", { time: airwise.air.updated ?? "" }) },
    loading: { cls: "loading", text: t("badge.loading") },
    estimate: { cls: "estimate", text: t("badge.estimate") },
  };
  const badge =
    airwise.status === "live" || airwise.status === "loading"
      ? badges[airwise.status]
      : badges.estimate;

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
        <SeverityStrip a={airwise} />
        <Cigarettes a={airwise} />
        <MorningBrief a={airwise} />

        <RoomStage
          airwise={airwise}
          room={room}
          hotspots={hotspots}
          onPick={pick}
          hidden={tab !== "room"}
          onNext={() => setTab("plan")}
        />

        <PlanStage
          airwise={airwise}
          lang={lang}
          products={products}
          hidden={tab !== "plan"}
          active={tab === "plan"}
        />

        <section id="stage-copilot" aria-labelledby="h-chat" hidden={tab !== "copilot"}>
          <h2 id="h-chat" className="chat-h">
            {t("chat.title")}
          </h2>
          <Chat choices={airwise.choices} prefill={airwise.prefill} onCamera={openPhoto} />
        </section>

        <section id="stage-share" aria-labelledby="h-share" hidden={tab !== "share"}>
          <h2 id="h-share" className="sr-only">
            {t("dock.share")}
          </h2>
          <ShareCard a={airwise} />
          <PlanTools a={airwise} />
        </section>
      </main>

      <footer>
        <p {...englishIn(lang)}>
          <strong>How we calculate.</strong> Hourly PM2.5, temperature and wind come live from
          Open-Meteo for the city you pick. A small, tested model adds up the air you breathe at
          home, on your commute, outdoors and while cooking, hour by hour. The AI explains the
          result; it never invents the numbers. The cigarette comparison uses a rule of thumb of
          about 22 µg/m³ of PM2.5 per cigarette a day. Every factor is listed in the{" "}
          <Link className="textlink" href="/guide#how">
            guide
          </Link>{" "}
          and in docs/methodology.md.
        </p>
        <p className="u-mt-10">{t("foot.disclaimer")}</p>
      </footer>

      <BottomDock activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
