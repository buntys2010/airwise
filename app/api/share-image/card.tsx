/**
 * The share card's layout for the image renderer (inline styles only, because that renderer
 * supports no stylesheet).
 */
import { sticksFor } from "@/lib/cigsHourly";
import { CARD } from "@/lib/palette";

/**
 * The share image, drawn with plain flex boxes (the image renderer has no SVG filters or grid).
 * Everything here is presentation: the route computes every figure and passes it in.
 */
export interface CardData {
  og: boolean;
  cityName: string;
  aqi: number;
  level: string;
  /** Cigarettes a day with no changes, and with the plan. */
  baseCigs: number;
  planCigs: number;
  /** Cigarettes' worth already breathed today, for each. */
  baseSoFar: number;
  planSoFar: number;
  /** Percent cut by the plan; 0 when nothing changed. */
  pct: number;
  fixes: string[];
}

const f1 = (n: number) => n.toFixed(1);

/** Pixel sizes for the two layouts: the 1080x1350 card and the 1200x630 link preview. */
function sizes(og: boolean) {
  return { W: og ? 1200 : 1080, H: og ? 630 : 1350, stickWidth: og ? 440 : 880, pad: og ? 48 : 64 };
}

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

function Rows({ value, sofar, w }: Readonly<{ value: number; sofar: number; w: number }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {sticksFor(value, sofar).map((s) => (
        <Stick key={s.id} total={s.total} burned={s.burned} w={w} />
      ))}
    </div>
  );
}

function Header({ d }: Readonly<{ d: CardData }>) {
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

function Headline({ d }: Readonly<{ d: CardData }>) {
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

/** The two stacks of cigarettes under the headline, on the tall card only. */
function Comparison({ d }: Readonly<{ d: CardData }>) {
  const stickWidth = sizes(false).stickWidth;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 26, flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: CARD.muted,
          fontWeight: 700,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        If nothing changes
      </div>
      <Rows value={d.baseCigs} sofar={d.baseSoFar} w={stickWidth} />
      {d.pct > 0 && (
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: CARD.muted,
              fontWeight: 700,
              marginTop: 18,
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            With the plan
          </div>
          <Rows value={d.planCigs} sofar={d.planSoFar} w={stickWidth} />
        </div>
      )}
    </div>
  );
}

function Fixes({ fixes }: Readonly<{ fixes: string[] }>) {
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

function Footer({ og }: Readonly<{ og: boolean }>) {
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

/** The link-preview layout puts the cigarettes in a column beside the text. */
function OgSticks({ d }: Readonly<{ d: CardData }>) {
  const stickWidth = sizes(true).stickWidth;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: 480,
        marginLeft: 36,
      }}
    >
      <Rows value={d.baseCigs} sofar={d.baseSoFar} w={stickWidth} />
      {d.pct > 0 && <div style={{ display: "flex", height: 22 }} />}
      {d.pct > 0 && <Rows value={d.planCigs} sofar={d.planSoFar} w={stickWidth} />}
    </div>
  );
}

/** Pixel size of the card, so the route and the image element agree. */
export function cardSize(og: boolean) {
  const { W, H } = sizes(og);
  return { width: W, height: H };
}

/** The share card drawn for the image renderer, which supports only inline styles and a subset of CSS. */
export function ShareCardImage({ d }: Readonly<{ d: CardData }>) {
  const { og } = d;
  const { W, H, pad } = sizes(og);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: og ? "row" : "column",
        width: W,
        height: H,
        padding: pad,
        background: CARD.background,
        color: CARD.text,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <Header d={d} />
        <Headline d={d} />
        {!og && <Comparison d={d} />}
        {!og && d.fixes.length > 0 && <Fixes fixes={d.fixes} />}
        <Footer og={og} />
      </div>
      {og && <OgSticks d={d} />}
    </div>
  );
}
