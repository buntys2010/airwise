/** The text blocks of the share card: header, headline, fix list and footer. */
import { CARD } from "@/lib/palette";

import { type CardData, f1 } from "./model";

export function Header({ d }: Readonly<{ d: CardData }>) {
  const { og } = d;
  return (
    <div style={{ display: "flex", alignItems: "center", fontSize: og ? 30 : 38, fontWeight: 800 }}>
      <div
        style={{
          display: "flex",
          width: og ? 38 : 48,
          height: og ? 38 : 48,
          borderRadius: 99,
          background: CARD.accent,
          marginRight: 14,
        }}
      />
      AirWise
      <div
        style={{
          display: "flex",
          marginLeft: "auto",
          fontSize: og ? 24 : 30,
          color: CARD.muted,
          fontWeight: 700,
        }}
      >{`${d.cityName} · AQI ${d.aqi} · ${d.level}`}</div>
    </div>
  );
}

export function Headline({ d }: Readonly<{ d: CardData }>) {
  const { og } = d;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: og ? 8 : 28 }}>
      <div style={{ display: "flex", fontSize: og ? 26 : 34, color: CARD.muted, fontWeight: 700 }}>
        Cigarettes equivalent a day
      </div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            display: "flex",
            fontSize: og ? 150 : 230,
            fontWeight: 800,
            lineHeight: 1,
            color: CARD.white,
          }}
        >
          {f1(d.baseCigs)}
        </div>
        {d.pct > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 28,
              marginBottom: og ? 18 : 30,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: og ? 34 : 46,
                color: CARD.accent,
                fontWeight: 800,
              }}
            >{`down to ${f1(d.planCigs)}`}</div>
            <div
              style={{
                display: "flex",
                fontSize: og ? 26 : 34,
                color: CARD.accent,
                fontWeight: 700,
              }}
            >{`${d.pct}% less with this plan`}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Fixes({ fixes }: Readonly<{ fixes: string[] }>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: 26,
        fontSize: 30,
        fontWeight: 700,
      }}
    >
      {fixes.map((f) => (
        <div key={f} style={{ display: "flex", marginBottom: 8 }}>{`• ${f}`}</div>
      ))}
    </div>
  );
}

export function Footer({ og }: Readonly<{ og: boolean }>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: 24,
        color: CARD.muted,
        fontSize: og ? 20 : 26,
      }}
    >
      <div style={{ display: "flex", color: CARD.text, fontWeight: 800, fontSize: og ? 26 : 34 }}>
        Numbers from code. Words from AI.
      </div>
      <div style={{ display: "flex", marginTop: 6 }}>
        A rule of thumb, not a measure of anyone&apos;s health. General guidance, not medical
        advice.
      </div>
    </div>
  );
}
