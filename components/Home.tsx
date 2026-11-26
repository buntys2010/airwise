/** The planner page body: profile, fixes, plan and the panels around them. */
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type ActiveTab, BottomDock } from "@/components/BottomDock";
import { Chat } from "@/components/chat/Chat";
import { Header } from "@/components/Chrome";
import { Cigarettes } from "@/components/Cigarettes";
import { useLang } from "@/components/LangProvider";
import { MorningBrief } from "@/components/MorningBrief";
import { PHOTO_INPUT_ID } from "@/components/PhotoPicker";
import { PlanTools } from "@/components/PlanTools";
import { SeverityStrip } from "@/components/SeverityStrip";
import { ShareCard } from "@/components/ShareCard";
import { useAirwise } from "@/components/useAirwise";
import { useRoom } from "@/components/useRoom";
import { englishIn } from "@/lib/i18n";
import { rankProducts } from "@/lib/room";

import { PlanStage } from "./home/PlanStage";
import { RoomStage } from "./home/RoomStage";

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
  /**
   * Switching a tab also brings its content into view; the hero above is tall, so without this a
   * tap seems to do nothing.
   */
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

  /*
   * Every stage stays mounted and is only hidden, so a typed question, an answer or a photo
   * survives a tab change.
   */
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
