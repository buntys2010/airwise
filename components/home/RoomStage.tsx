/** The "your home" stage: the room photo, the fixes it points to, and the household. */
"use client";
import { FixRows } from "@/components/FixRows";
import { useLang } from "@/components/LangProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { ProfilePills } from "@/components/ProfilePills";
import { RoomPanel } from "@/components/RoomPanel";
import type { Airwise } from "@/components/useAirwise";
import type { Room } from "@/components/useRoom";
import type { Hotspot } from "@/lib/room";

export function RoomStage({
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
