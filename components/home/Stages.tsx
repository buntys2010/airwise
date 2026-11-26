"use client";
/** The four stages of the home page: room, plan, ask and share. */

import { fmtHour, OUTDOOR_HOUR } from "@/lib/engine";
import { englishIn } from "@/lib/i18n";
import type { Hotspot, RankedProduct } from "@/lib/room";

import { Chat } from "../chat/Chat";
import { useLang } from "../LangProvider";
import { DayPlan } from "../plan/DayPlan";
import { DoseBars } from "../plan/DoseBars";
import { HourChart } from "../plan/HourChart";
import { PlanTools } from "../plan/PlanTools";
import { ProfilePills } from "../plan/ProfilePills";
import { FixRows } from "../room/FixRows";
import { PhotoPicker } from "../room/PhotoPicker";
import { RoomPanel } from "../room/RoomPanel";
import type { useRoom } from "../room/useRoom";
import { ValueList } from "../room/ValueList";
import { ShareCard } from "../share/ShareCard";
import type { Airwise } from "../useAirwise";

/** Every stage stays mounted and is only hidden, so a typed question, an answer or a photo survives a tab change. */
interface StageProps {
  a: Airwise;
  hidden: boolean;
}

interface RoomStageProps extends StageProps {
  room: ReturnType<typeof useRoom>;
  hotspots: Hotspot[];
  onPick: (id: string) => void;
  onNext: () => void;
}

/** Stage 1: the room photo with its hotspots, the fixes they imply, and the household pills. */
export function RoomStage({ a, hidden, room, hotspots, onPick, onNext }: RoomStageProps) {
  const { lang, t } = useLang();
  return (
    <section id="stage-room" aria-labelledby="h-room" hidden={hidden}>
      <h2 id="h-room" className="sr-only">
        {t("dock.room")}
      </h2>
      <div className="homegrid">
        <RoomPanel
          a={a}
          hotspots={hotspots}
          photoUrl={room.photoUrl}
          onPick={onPick}
          footer={<PhotoPicker room={room} />}
        />
        <div className="homeside">
          <h2 className="sr-only">{t("fix.heading")}</h2>
          <FixRows a={a} hotspots={hotspots} />
          <ProfilePills profile={a.profile} onChange={a.setProfile} lang={lang} />
          <button type="button" className="btn ghost nextstage" onClick={onNext}>
            {t("plan.cta")} ➔
          </button>
        </div>
      </div>
    </section>
  );
}

/** The cleanest window of the day, in a sentence. */
function SafeWindow({ a }: { a: Airwise }) {
  const { lang, t } = useLang();
  return (
    <div className="sec-head">
      <h2 id="h-plan">{t("dock.plan")}</h2>
      <p className="safewindow">{t("plan.window", { time: a.bestLabel })}</p>
      <p {...englishIn(lang)}>
        The air is usually worst before dawn and again at dusk. The cleanest window is around{" "}
        <strong>{a.bestLabel}</strong>, when it is {a.hourly[a.best]} µg/m³ instead of{" "}
        {a.hourly[OUTDOOR_HOUR]} at your usual {fmtHour(OUTDOOR_HOUR)} outing.
      </p>
    </div>
  );
}

/** Stage 2: the day's air, a daily plan, what is worth buying, and where the dose comes from. */
export function PlanStage({ a, hidden, products }: StageProps & { products: RankedProduct[] }) {
  const { lang, t } = useLang();
  return (
    <section id="stage-plan" aria-labelledby="h-plan" hidden={hidden}>
      <SafeWindow a={a} />
      <div {...englishIn(lang)}>
        <HourChart hourly={a.hourly} best={a.best} usual={OUTDOOR_HOUR} />
      </div>
      <div className="sec-head">
        <h2 id="h-daily">{t("sec.daily.h")}</h2>
      </div>
      <DayPlan schedule={a.schedule} choices={a.choices} active={!hidden} />
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
  );
}

/** Stage 3: ask AirWise a question. */
export function CopilotStage({ a, hidden, onCamera }: StageProps & { onCamera: () => void }) {
  const { t } = useLang();
  return (
    <section id="stage-copilot" aria-labelledby="h-chat" hidden={hidden}>
      <h2 id="h-chat" className="chat-h">
        {t("chat.title")}
      </h2>
      <Chat choices={a.choices} prefill={a.prefill} onCamera={onCamera} />
    </section>
  );
}

/** Stage 4: share the plan, save it, or set a reminder. */
export function ShareStage({ a, hidden }: StageProps) {
  const { t } = useLang();
  return (
    <section id="stage-share" aria-labelledby="h-share" hidden={hidden}>
      <h2 id="h-share" className="sr-only">
        {t("dock.share")}
      </h2>
      <ShareCard a={a} />
      <PlanTools a={a} />
    </section>
  );
}
