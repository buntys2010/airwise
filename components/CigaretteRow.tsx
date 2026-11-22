"use client";
import { useEffect, useState } from "react";
import { cigaretteRow } from "@/lib/cigs";

const FULL = { slot: 40, bodyW: 22, filterH: 20, bodyMax: 96, cap: 10 };
/** Compact: for the strip beside the city, where it must fit a 360 px phone. */
const COMPACT = { slot: 22, bodyW: 12, filterH: 11, bodyMax: 40, cap: 6 };

/**
 * Today's air as cigarettes: one per whole cigarette-equivalent, the last one partial. From the filter up: what is still ahead
 * today (pale), the ember where it is burning, and the ash already burned. Applying a fix shortens the same cigarettes.
 * Every length is an engine figure. The drawing is decorative; the same numbers are plain text beside it.
 */
export function CigaretteRow({ base, plan, soFar, compact = false }: { base: number; plan: number; soFar: number; compact?: boolean }) {
  const { slot: SLOT, bodyW: BODY_W, filterH: FILTER_H, bodyMax: BODY_MAX, cap } = compact ? COMPACT : FULL;
  const HEIGHT = FILTER_H + BODY_MAX + 6, FILTER_TOP = HEIGHT - FILTER_H;
  // Start unburned and let the burn-down play once the row is on screen (the stylesheet turns the motion off for reduced-motion users).
  const [live, setLive] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setLive(true)); return () => cancelAnimationFrame(id); }, []);
  const { slots, extra } = cigaretteRow(base, plan, live ? soFar : 0, cap);
  return (
    <div className={compact ? "cigrow compact" : "cigrow"} aria-hidden="true">
      <svg className="cigs" viewBox={`0 0 ${slots.length * SLOT} ${HEIGHT}`} style={{ width: slots.length * SLOT }} preserveAspectRatio="xMinYMax meet" focusable="false">
        {slots.map((s) => {
          const x = s.index * SLOT + (SLOT - BODY_W) / 2;
          const toCome = s.toCome * BODY_MAX, ash = s.ash * BODY_MAX;
          const bodyTop = FILTER_TOP - toCome;
          return (
            <g key={s.index} data-burning={s.burning ? "true" : undefined}>
              {s.ghost && <rect className="cig-ghost" x={x} y={FILTER_TOP - BODY_MAX} width={BODY_W} height={BODY_MAX} rx={2} />}
              <rect className="cig-ash" x={x} width={BODY_W} rx={2} style={{ y: bodyTop - ash, height: ash }} />
              <rect className="cig-body" x={x} width={BODY_W} style={{ y: bodyTop, height: toCome }} />
              <rect className="cig-ember" x={x} width={BODY_W} rx={1.5} style={{ y: bodyTop - 3, height: s.burning ? 4 : 0 }} />
              <rect className="cig-filter" x={x} y={FILTER_TOP} width={BODY_W} height={FILTER_H} rx={2} />
            </g>
          );
        })}
      </svg>
      {extra > 0 && <span className="cigmore">+{extra}</span>}
    </div>
  );
}
