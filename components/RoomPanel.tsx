"use client";
import type { Key } from "@/lib/i18n";
import type { Hotspot } from "@/lib/room";
import { useLang } from "./LangProvider";
import { SampleRoom } from "./SampleRoom";
import type { Airwise } from "./useAirwise";

interface Props {
  a: Airwise;
  hotspots: Hotspot[];
  /** Object URL of the user's photo, or null for the sample room. */
  photoUrl: string | null;
  /** Called with the action id when a marker is pressed. */
  onPick: (actionId: string) => void;
  /** Extra controls under the room (photo picker). */
  footer?: React.ReactNode;
}

/** The room is the interface: numbered markers on the room and a smog layer driven by the same exposure number. */
export function RoomPanel({ a, hotspots, photoUrl, onPick, footer }: Readonly<Props>) {
  const { t } = useLang();
  const drawn = hotspots.filter((h) => h.bbox).length;
  return (
    <div className="roompanel">
      <div className="room" data-sample={photoUrl ? "false" : "true"}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="roomphoto" src={photoUrl} alt={t("room.photoAlt", { n: drawn })} />
        ) : (
          <SampleRoom label={t("room.sampleAlt")} />
        )}
        <div className="smog" aria-hidden="true" />
        {hotspots.map((h, i) => {
          if (!h.bbox) return null; // checklist answers are listed, not drawn
          const act = a.actions.find((x) => x.id === h.actionId);
          const on = act ? act.isOn(a.plan) : false;
          const cx = (h.bbox.x + h.bbox.w / 2) * 100,
            cy = (h.bbox.y + h.bbox.h / 2) * 100;
          const label = t(`kind.${h.kind}` as Key);
          return (
            <button
              key={h.id}
              type="button"
              className={`marker${on ? " on" : ""}`}
              style={{ left: `${cx}%`, top: `${cy}%` }}
              aria-pressed={on}
              aria-label={`${t("room.fix", { n: i + 1, label })} ${on ? t("room.markerOn") : t("room.markerOff")}`}
              onClick={() => onPick(h.actionId)}
            >
              <span aria-hidden="true">{on ? "✓" : i + 1}</span>
            </button>
          );
        })}
        {!photoUrl && <span className="roomtag">{t("room.sample")}</span>}
      </div>

      {footer}
    </div>
  );
}
