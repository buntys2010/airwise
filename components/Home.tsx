"use client";
/** The home screen. */

import { useMemo } from "react";

import { rankProducts } from "@/lib/room";

import { BottomDock } from "./BottomDock";
import { Header } from "./Chrome";
import { Cigarettes } from "./cigs/Cigarettes";
import { HomeFooter } from "./home/HomeFooter";
import { CopilotStage, PlanStage, RoomStage, ShareStage } from "./home/Stages";
import { useTabs } from "./home/useTabs";
import { useLang } from "./LangProvider";
import { MorningBrief } from "./plan/MorningBrief";
import { SeverityStrip } from "./plan/SeverityStrip";
import { PHOTO_INPUT_ID } from "./room/PhotoPicker";
import { useRoom } from "./room/useRoom";
import { type Airwise, useAirwise } from "./useAirwise";

/** The live-data badge: live with a time, still loading, or an offline estimate. Never claims live when it is not. */
function statusBadge(a: Airwise, t: ReturnType<typeof useLang>["t"]) {
  if (a.status === "live") return { cls: "live", text: t("badge.live", { time: a.air.updated ?? "" }) };
  if (a.status === "loading") return { cls: "loading", text: t("badge.loading") };
  return { cls: "estimate", text: t("badge.estimate") };
}

/** The home screen: a header, the headline numbers, and four stages (room, plan, ask, share) behind a bottom dock. */
export function Home() {
  const { lang, t } = useLang();
  const a = useAirwise(lang);
  const room = useRoom(a);
  const products = useMemo(() => rankProducts(a.hourly, a.profile), [a.hourly, a.profile]);
  const { tab, setTab } = useTabs();
  const badge = statusBadge(a, t);

  const pick = (id: string) => {
    const act = a.actions.find((x) => x.id === id);
    if (act) a.toggle(act);
  };
  const openPhoto = () => {
    setTab("room");
    document.getElementById(PHOTO_INPUT_ID)?.click();
  };

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
        <RoomStage
          a={a}
          hidden={tab !== "room"}
          room={room}
          hotspots={room.hotspots}
          onPick={pick}
          onNext={() => setTab("plan")}
        />
        <PlanStage a={a} hidden={tab !== "plan"} products={products} />
        <CopilotStage a={a} hidden={tab !== "copilot"} onCamera={openPhoto} />
        <ShareStage a={a} hidden={tab !== "share"} />
      </main>

      <HomeFooter />
      <BottomDock activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
