"use client";
/** The headline gauge: today's air as cigarettes. */

import { useCallback, useEffect, useRef, useState } from "react";

import { cigsSoFar, type Stick, sticksFor } from "@/lib/cigsHourly";
import { fmtHour } from "@/lib/engine";

import { useLang } from "../LangProvider";
import type { Airwise } from "../useAirwise";

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
      const t = Math.min(1, (now - start) / ms);
      setHour(-1 + (target + 1) * (1 - Math.pow(1 - t, 2)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [target]);
  useEffect(() => {
    play();
    return () => cancelAnimationFrame(raf.current);
  }, [play]);
  return { hour, play };
}

/** A row of cigarette sticks, the burned part showing how much of the day has passed. */
export function CigRow({ sticks, tone }: { sticks: Stick[]; tone: "base" | "plan" }) {
  return (
    <div className={`cigrow ${tone}`} aria-hidden="true">
      {sticks.map((s, i) => {
        const left = Math.max(0, s.total - s.burned);
        const burning = s.burned > 0.005 && s.burned < s.total - 0.005;
        return (
          <div className="stick" key={i}>
            <span className="cfilter" />
            <span className="ctrack">
              <span className="cpaper" style={{ width: `${left * 100}%` }} />
              <span className="cash" style={{ left: `${left * 100}%`, width: `${s.burned * 100}%` }} />
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

interface CigColumnProps {
  tone: "base" | "plan";
  label: string;
  value: string;
  ariaLabel: string;
  sticks: ReturnType<typeof sticksFor>;
  /** Set when the plan helps: how much less, in words. */
  lessText?: string;
}

/** One side of the before/after pair: a label with its figure, and the sticks. */
function CigColumn({ tone, label, value, ariaLabel, sticks, lessText }: CigColumnProps) {
  const isBase = tone === "base";
  return (
    <div className="cigcol">
      <p className="cliglabel">
        <span
          className={isBase ? "dialbefore" : `dialafter${lessText ? " changed" : ""}`}
          aria-label={ariaLabel}
        >
          <span>
            {label} <b>{value}</b>
            {lessText && <em>{lessText}</em>}
          </span>
        </span>
      </p>
      <CigRow sticks={sticks} tone={tone} />
    </div>
  );
}

/** The hero: today's smoke as cigarettes that burn down hour by hour, and shrink when a fix is switched on. Figures come from the engine. */
export function Cigarettes({ a }: { a: Airwise }) {
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
        <div className="cigrows">
          <CigColumn
            tone="base"
            label={t("cig.base")}
            value={f1(a.base.cigs)}
            ariaLabel={`${f1(a.base.cigs)} ${t("dial.before")}`}
            sticks={baseSticks}
          />
          <CigColumn
            tone="plan"
            label={t("cig.plan")}
            value={f1(a.withPlan.cigs)}
            ariaLabel={`${f1(a.withPlan.cigs)} ${t("dial.after")}`}
            sticks={planSticks}
            lessText={changed ? t("cig.less", { pct: a.savedPct }) : undefined}
          />
        </div>
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
