import { sticksFor } from "@/lib/cigsHourly";

import { COLOR } from "./theme";

const STICK_HEIGHT = 26;
/** Share of a stick that is the filter. */
const FILTER_SHARE = 0.16;

/** One cigarette, drawn with plain boxes (the image renderer has no SVG filters or grid). Widths are shares of a whole stick. */
function Stick({ total, burned, w }: { total: number; burned: number; w: number }) {
  const left = Math.max(0, total - burned);
  const paperWidth = w * (1 - FILTER_SHARE);
  return (
    <div
      style={{ display: "flex", alignItems: "center", height: STICK_HEIGHT, marginBottom: 10, flexShrink: 0 }}
    >
      <div
        style={{
          display: "flex",
          width: w * FILTER_SHARE,
          height: STICK_HEIGHT,
          background: COLOR.filter,
          borderRadius: "13px 3px 3px 13px",
        }}
      />
      <div
        style={{
          display: "flex",
          width: paperWidth,
          height: STICK_HEIGHT,
          border: `2px dashed ${COLOR.dash}`,
          borderLeft: "0",
          borderRadius: "3px 13px 13px 3px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: Math.round(paperWidth * left),
            height: 22,
            background: COLOR.paper,
          }}
        />
        {burned > 0.01 && (
          <div
            style={{
              display: "flex",
              width: Math.round(paperWidth * burned),
              height: 22,
              background: COLOR.ash,
              borderRadius: "3px 11px 11px 3px",
            }}
          />
        )}
      </div>
    </div>
  );
}

/** A day's cigarettes as a stack of sticks, the burned part showing how much of the day has passed. */
export function Sticks({ value, sofar, w }: { value: number; sofar: number; w: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {sticksFor(value, sofar).map((s, i) => (
        <Stick key={i} total={s.total} burned={s.burned} w={w} />
      ))}
    </div>
  );
}
