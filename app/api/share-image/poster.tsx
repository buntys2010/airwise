import { Sticks } from "./sticks";
import { COLOR, type Layout, pick } from "./theme";

/** Everything the poster shows. Every figure is computed on the server; none comes from the link. */
export interface PosterData {
  cityName: string;
  aqi: number;
  level: string;
  /** Cigarettes a day with no plan, and with the plan. */
  baseCigs: number;
  planCigs: number;
  /** Share of the day already breathed, as burned parts of each stick. */
  baseSoFar: number;
  planSoFar: number;
  /** Percent fewer cigarettes with the plan; 0 when the plan changes nothing. */
  pctLess: number;
  fixes: string[];
}

const f1 = (n: number) => n.toFixed(1);
const column = { display: "flex", flexDirection: "column" } as const;

function Header({ data, layout }: { data: PosterData; layout: Layout }) {
  const { og } = layout;
  return (
    <div style={{ display: "flex", alignItems: "center", fontSize: pick(og, 30, 38), fontWeight: 800 }}>
      <div
        style={{
          display: "flex",
          width: pick(og, 38, 48),
          height: pick(og, 38, 48),
          borderRadius: 99,
          background: COLOR.accent,
          marginRight: 14,
        }}
      />
      AirWise
      <div
        style={{
          display: "flex",
          marginLeft: "auto",
          fontSize: pick(og, 24, 30),
          color: COLOR.muted,
          fontWeight: 700,
        }}
      >{`${data.cityName} · AQI ${data.aqi} · ${data.level}`}</div>
    </div>
  );
}

function Headline({ data, layout }: { data: PosterData; layout: Layout }) {
  const { og } = layout;
  return (
    <div style={{ ...column, marginTop: pick(og, 8, 28) }}>
      <div style={{ display: "flex", fontSize: pick(og, 26, 34), color: COLOR.muted, fontWeight: 700 }}>
        Cigarettes equivalent a day
      </div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            display: "flex",
            fontSize: pick(og, 150, 230),
            fontWeight: 800,
            lineHeight: 1,
            color: COLOR.white,
          }}
        >
          {f1(data.baseCigs)}
        </div>
        {data.pctLess > 0 && <Improvement data={data} og={og} />}
      </div>
    </div>
  );
}

function Improvement({ data, og }: { data: PosterData; og: boolean }) {
  return (
    <div style={{ ...column, marginLeft: 28, marginBottom: pick(og, 18, 30) }}>
      <div
        style={{ display: "flex", fontSize: pick(og, 34, 46), color: COLOR.accent, fontWeight: 800 }}
      >{`down to ${f1(data.planCigs)}`}</div>
      <div
        style={{ display: "flex", fontSize: pick(og, 26, 34), color: COLOR.accent, fontWeight: 700 }}
      >{`${data.pctLess}% less with this plan`}</div>
    </div>
  );
}

function SticksLabel({ text, top }: { text: string; top: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 28,
        color: COLOR.muted,
        fontWeight: 700,
        marginTop: top,
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      {text}
    </div>
  );
}

/** The card layout's two stacks of sticks: today as it is, and with the plan. */
function StickStacks({ data, layout }: { data: PosterData; layout: Layout }) {
  return (
    <div style={{ ...column, marginTop: 26, flexShrink: 0 }}>
      <SticksLabel text="If nothing changes" top={0} />
      <Sticks value={data.baseCigs} sofar={data.baseSoFar} w={layout.stick} />
      {data.pctLess > 0 && (
        <div style={{ ...column, flexShrink: 0 }}>
          <SticksLabel text="With the plan" top={18} />
          <Sticks value={data.planCigs} sofar={data.planSoFar} w={layout.stick} />
        </div>
      )}
    </div>
  );
}

function Fixes({ fixes }: { fixes: string[] }) {
  return (
    <div style={{ ...column, marginTop: 26, fontSize: 30, fontWeight: 700 }}>
      {fixes.map((f) => (
        <div key={f} style={{ display: "flex", marginBottom: 8 }}>{`• ${f}`}</div>
      ))}
    </div>
  );
}

function Footer({ og }: { og: boolean }) {
  return (
    <div style={{ ...column, marginTop: 24, color: COLOR.muted, fontSize: pick(og, 20, 26) }}>
      <div style={{ display: "flex", color: COLOR.ink, fontWeight: 800, fontSize: pick(og, 26, 34) }}>
        Numbers from code. Words from AI.
      </div>
      <div style={{ display: "flex", marginTop: 6 }}>
        A rule of thumb, not a measure of anyone's health. General guidance, not medical advice.
      </div>
    </div>
  );
}

/** The wide layout puts both stacks in a column beside the text. */
function SideSticks({ data, layout }: { data: PosterData; layout: Layout }) {
  return (
    <div style={{ ...column, justifyContent: "center", width: 480, marginLeft: 36 }}>
      <Sticks value={data.baseCigs} sofar={data.baseSoFar} w={layout.stick} />
      {data.pctLess > 0 && <div style={{ display: "flex", height: 22 }} />}
      {data.pctLess > 0 && <Sticks value={data.planCigs} sofar={data.planSoFar} w={layout.stick} />}
    </div>
  );
}

/** The share image: a tall card, or a wide social preview when `layout.og` is set. */
export function Poster({ data, layout }: { data: PosterData; layout: Layout }) {
  const { og } = layout;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: og ? "row" : "column",
        width: layout.width,
        height: layout.height,
        padding: layout.padding,
        background: COLOR.background,
        color: COLOR.ink,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ ...column, flex: 1, justifyContent: "space-between" }}>
        <Header data={data} layout={layout} />
        <Headline data={data} layout={layout} />
        {!og && <StickStacks data={data} layout={layout} />}
        {!og && data.fixes.length > 0 && <Fixes fixes={data.fixes} />}
        <Footer og={og} />
      </div>
      {og && <SideSticks data={data} layout={layout} />}
    </div>
  );
}
