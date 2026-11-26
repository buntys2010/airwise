/**
 * The share card's layout for the image renderer (inline styles only, because that renderer
 * supports no stylesheet).
 */
import { CARD } from "@/lib/palette";

import { type CardData, sizes } from "./model";
import { Fixes, Footer, Header, Headline } from "./sections";
import { Rows } from "./sticks";

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
