"use client";
import { fmtHour } from "@/lib/engine";
import type { Key } from "@/lib/i18n";
import type { Hotspot } from "@/lib/room";
import { useLang } from "./LangProvider";
import { CigaretteRow } from "./CigaretteRow";
import { SampleRoom } from "./SampleRoom";
import { useCountUp } from "./useCountUp";
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

/** The room is the interface: numbered markers on the room, a smog layer driven by the same exposure number, and the dial. */
export function RoomPanel({ a, hotspots, photoUrl, onPick, footer }: Props) {
  const { t } = useLang();
  const before = useCountUp(a.base.cigs);
  const after = useCountUp(a.withPlan.cigs);
  const sofar = useCountUp(a.soFar);
  const drawn = hotspots.filter((h) => h.bbox).length;
  return (
    <div className="roompanel">
      <div className="room" data-sample={photoUrl ? "false" : "true"}>
        {photoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="roomphoto" src={photoUrl} alt={t("room.photoAlt", { n: drawn })} />
          : <SampleRoom label={t("room.sampleAlt")} />}
        <div className="smog" aria-hidden="true" />
        {hotspots.map((h, i) => {
          if (!h.bbox) return null; // checklist answers are listed, not drawn
          const act = a.actions.find((x) => x.id === h.actionId);
          const on = act ? act.isOn(a.plan) : false;
          const cx = (h.bbox.x + h.bbox.w / 2) * 100, cy = (h.bbox.y + h.bbox.h / 2) * 100;
          const label = t(`kind.${h.kind}` as Key);
          return (
            <button key={h.id} type="button" className={`marker${on ? " on" : ""}`} style={{ left: `${cx}%`, top: `${cy}%` }}
              aria-pressed={on} aria-label={`${t("room.fix", { n: i + 1, label })} ${on ? t("room.markerOn") : t("room.markerOff")}`}
              onClick={() => onPick(h.actionId)}>
              <span aria-hidden="true">{on ? "✓" : i + 1}</span>
            </button>
          );
        })}
        {!photoUrl && <span className="roomtag">{t("room.sample")}</span>}
      </div>

      <div className="dial" role="group" aria-label={t("dial.group")}>
        <div aria-live="polite">
        <div className="dialnums">
          <span className="dialbefore" aria-label={`${a.base.cigs.toFixed(1)} ${t("dial.before")}`}><b aria-hidden="true">{before.toFixed(1)}</b><small>{t("dial.before")}</small></span>
          <span className="dialarrow" aria-hidden="true">{t("dial.to")}</span>
          <span className="dialafter" aria-label={`${a.withPlan.cigs.toFixed(1)} ${t("dial.after")}`}><b aria-hidden="true">{after.toFixed(1)}</b><small>{t("dial.after")}</small></span>
        </div>
        <CigaretteRow base={a.base.cigs} plan={a.withPlan.cigs} soFar={a.soFar} />
        <p className="cigtext">
          <span className="sr-only">{t("cig.sofar", { time: fmtHour(a.nowHour), n: a.soFar.toFixed(1) })}</span>
          <span aria-hidden="true">{t("cig.sofar", { time: fmtHour(a.nowHour), n: sofar.toFixed(1) })}</span>
        </p>
        </div>
        <div className="meter" role="img" aria-label={t("dial.expo", { pct: a.savedPct })}><i style={{ width: `${Math.max(2, a.savedPct)}%` }} /></div>
        <p className="dim cignote">{t("cig.note")}</p>
        <p className="dialfoot"><strong>{t("dial.expo", { pct: a.savedPct })}</strong>, <strong>{t("dial.cigs", { n: a.saved.toFixed(1) })}</strong>, <strong>{t("dial.co2", { kg: a.co2Saved.toFixed(1) })}</strong>.</p>
      </div>
      {footer}
    </div>
  );
}
