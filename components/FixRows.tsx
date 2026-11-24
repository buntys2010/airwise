"use client";
import type { ActionResult } from "@/lib/engine";
import { ACTION_HI, englishIn, type Key } from "@/lib/i18n";
import type { Hotspot } from "@/lib/room";

import { useLang } from "./LangProvider";
import type { Airwise } from "./useAirwise";

/** One plain row per finding: what was seen, the fix, what it is worth. This list is also the text equivalent of the room markers. */
export function FixRows({ a, hotspots }: { a: Airwise; hotspots: Hotspot[] }) {
  const { lang, t } = useLang();
  const rows = hotspots
    .map((h) => ({ h, act: a.actions.find((x) => x.id === h.actionId) }))
    .filter((r): r is { h: Hotspot; act: ActionResult } => Boolean(r.act));
  if (rows.length === 0) return <p className="empty">{t("fix.empty")}</p>;
  return (
    <ol className="fixrows" aria-label={t("fix.list")}>
      {rows.map(({ h, act }, i) => {
        const on = act.isOn(a.plan);
        const pct = Math.round(act.savedPct * 100);
        const hi = lang === "hi" ? ACTION_HI[act.id] : undefined;
        return (
          <li key={h.id} className={on ? "on" : ""}>
            <span className="fixnum" aria-hidden="true">
              {on ? "✓" : i + 1}
            </span>
            <div className="fixbody">
              <p className="fixseen">{t(`kind.${h.kind}` as Key)}</p>
              <h3 lang={hi ? "hi" : undefined}>{hi ? hi.title : act.title}</h3>
              <p className="fiximpact">
                {act.applicable ? (
                  <>
                    <strong>{t("fix.impact", { pct })}</strong>
                    {act.savedCigs >= 0.05 ? `, ${t("fix.cigs", { n: act.savedCigs.toFixed(1) })}` : ""}.{" "}
                  </>
                ) : null}
                <span lang={hi ? "hi" : undefined}>{hi ? hi.cost : act.cost}</span>.
              </p>
              <details>
                <summary>{t("fix.math")}</summary>
                <ul {...englishIn(lang)}>
                  {act.math.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </details>
            </div>
            <button
              type="button"
              className="btn small"
              aria-pressed={on}
              disabled={!act.applicable}
              onClick={() => a.toggle(act)}
            >
              {on ? t("fix.done") : t("fix.do")}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
