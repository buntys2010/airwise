"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cigsSoFar, sticksFor, type Stick } from "@/lib/cigsHourly";
import { fmtHour } from "@/lib/engine";
import { useLang } from "./LangProvider";
import type { Airwise } from "./useAirwise";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Walks the clock from midnight to `target` so the day visibly builds up hour by hour. Jumps straight there for reduced motion. */
function useHourReplay(target: number) {
  const [hour, setHour] = useState(target);
  const raf = useRef(0);
  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (prefersReduced()) {
      setHour(target);
      return;
    }
    const start = performance.now();
    const ms = 2400;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / ms);
      setHour(-1 + (target + 1) * (1 - Math.pow(1 - progress, 2)));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [target]);
  useEffect(() => {
    play();
    return () => cancelAnimationFrame(raf.current);
  }, [play]);
  return { hour, play };
}

/** One row of cigarette sticks, each drawn partly burned according to its share of the day's exposure. */
export function CigRow({ sticks, tone }: Readonly<{ sticks: Stick[]; tone: "base" | "plan" }>) {
  return (
    <div className={`cigrow ${tone}`} aria-hidden="true">
      {sticks.map((s) => {
        const left = Math.max(0, s.total - s.burned);
        const burning = s.burned > 0.005 && s.burned < s.total - 0.005;
        return (
          <div className="stick" key={s.id}>
            <span className="cfilter" />
            <span className="ctrack">
              <span className="cpaper" style={{ width: `${left * 100}%` }} />
              <span
                className="cash"
                style={{ left: `${left * 100}%`, width: `${s.burned * 100}%` }}
              />
              {burning && (
                <span className="cember" style={{ left: `${left * 100}%` }}>
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** One column of the hero: a label with its figure, above that scenario's row of cigarettes. */
function CigColumn({
  tone,
  sticks,
  labelClass,
  ariaLabel,
  children,
}: Readonly<{
  tone: "base" | "plan";
  sticks: Stick[];
  labelClass: string;
  ariaLabel: string;
  children: ReactNode;
}>) {
  return (
    <div className="cigcol">
      <p className="cliglabel">
        <span className={labelClass} aria-label={ariaLabel}>
          <span>{children}</span>
        </span>
      </p>
      <CigRow sticks={sticks} tone={tone} />
    </div>
  );
}

/** Both scenarios side by side: today with no changes, and today with the plan. */
function CigRows({
  a,
  baseSticks,
  planSticks,
  changed,
}: Readonly<{ a: Airwise; baseSticks: Stick[]; planSticks: Stick[]; changed: boolean }>) {
  const { t } = useLang();
  const f1 = (n: number) => n.toFixed(1);
  return (
    <div className="cigrows">
      <CigColumn
        tone="base"
        sticks={baseSticks}
        labelClass="dialbefore"
        ariaLabel={`${f1(a.base.cigs)} ${t("dial.before")}`}
      >
        {t("cig.base")} <b>{f1(a.base.cigs)}</b>
      </CigColumn>
      <CigColumn
        tone="plan"
        sticks={planSticks}
        labelClass={`dialafter${changed ? " changed" : ""}`}
        ariaLabel={`${f1(a.withPlan.cigs)} ${t("dial.after")}`}
      >
        {t("cig.plan")}{" "}
        <b style={{ color: changed ? "var(--breath)" : "#fff" }}>{f1(a.withPlan.cigs)}</b>
        {changed && <em>{t("cig.less", { pct: a.savedPct })}</em>}
      </CigColumn>
    </div>
  );
}

/** The hero: today's smoke as cigarettes that burn down hour by hour, and shrink when a fix is switched on. Figures come from the engine. */
export function Cigarettes({ a }: Readonly<{ a: Airwise }>) {
  const { t } = useLang();
  const { hour, play } = useHourReplay(a.nowHour);
  const sofarBase = cigsSoFar(a.base, hour);
  const sofarPlan = cigsSoFar(a.withPlan, hour);
  const baseSticks = sticksFor(a.base.cigs, sofarBase);
  const planSticks = sticksFor(a.withPlan.cigs, sofarPlan);
  const changed = a.savedPct > 0;
  const f1 = (n: number) => n.toFixed(1);
  return (
    <section className="cigs" role="group" aria-label={t("dial.group")}>
      <div className="cigshead">
        <h2 id="h-cigs">{t("cig.h")}</h2>
        <button type="button" className="textbtn" onClick={play}>
          ↻ {t("cig.replay")}
        </button>
      </div>
      <div aria-live="polite">
        <p className="cignum">
          <strong>{f1(changed ? sofarPlan : sofarBase)}</strong>
          <span>{t("cig.full", { n: f1(changed ? a.withPlan.cigs : a.base.cigs) })}</span>
        </p>
        <p className="cigtime">{t("cig.hour", { time: fmtHour(a.nowHour) })}</p>
        <p className="cigtext sr-only">
          {t("cig.sofar", { time: fmtHour(a.nowHour), n: a.soFar.toFixed(1) })}
        </p>
        <CigRows a={a} baseSticks={baseSticks} planSticks={planSticks} changed={changed} />
      </div>
      <div className="meter" role="img" aria-label={t("dial.expo", { pct: a.savedPct })}>
        <i style={{ width: a.savedPct > 0 ? `${Math.max(2, a.savedPct)}%` : "0%" }} />
      </div>
      <p className="dialfoot">
        <strong>{t("dial.expo", { pct: a.savedPct })}</strong>,{" "}
        <strong>{t("dial.cigs", { n: a.saved.toFixed(1) })}</strong>,{" "}
        <strong>{t("dial.co2", { kg: a.co2Saved.toFixed(1) })}</strong>.
      </p>
      <p className="cignote">{t("cig.note")}</p>
    </section>
  );
}
