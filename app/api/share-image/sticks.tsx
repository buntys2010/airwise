/** Cigarette sticks for the share card, drawn with flex boxes and inline styles only. */
import { sticksFor } from "@/lib/cigsHourly";
import { CARD } from "@/lib/palette";

/** One cigarette. Widths are shares of a whole stick. */
function Stick({ total, burned, w }: Readonly<{ total: number; burned: number; w: number }>) {
  const left = Math.max(0, total - burned);
  const labelWidth = w * 0.84;
  return (
    <div
      style={{ display: "flex", alignItems: "center", height: 26, marginBottom: 10, flexShrink: 0 }}
    >
      <div
        style={{
          display: "flex",
          width: w * 0.16,
          height: 26,
          background: CARD.ember,
          borderRadius: "13px 3px 3px 13px",
        }}
      />
      <div
        style={{
          display: "flex",
          width: labelWidth,
          height: 26,
          border: "2px dashed rgba(180,200,209,0.35)",
          borderLeft: "0",
          borderRadius: "3px 13px 13px 3px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: Math.round(labelWidth * left),
            height: 22,
            background: CARD.paper,
          }}
        />
        {burned > 0.01 && (
          <div
            style={{
              display: "flex",
              width: Math.round(labelWidth * burned),
              height: 22,
              background: CARD.ash,
              borderRadius: "3px 11px 11px 3px",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function Rows({ value, sofar, w }: Readonly<{ value: number; sofar: number; w: number }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {sticksFor(value, sofar).map((s) => (
        <Stick key={s.id} total={s.total} burned={s.burned} w={w} />
      ))}
    </div>
  );
}
