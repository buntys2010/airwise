import { ImageResponse } from "next/og";
import { cigsSoFar, sticksFor } from "@/lib/cigsHourly";
import { CITIES, getCityAir, istClock } from "@/lib/data";
import { NO_PLAN, aqiFromPm, categoryOf, planSummary, simulate, type Plan, type Profile } from "@/lib/engine";
import { decodeChoices } from "@/lib/share";

export const runtime = "nodejs";

const DEFAULT_PROFILE: Profile = { home: "leaky", commute: "bike", km: 8, cooking: "lpg", vulnerable: true };
const f1 = (n: number) => n.toFixed(1);

/** One cigarette, drawn with plain boxes (the image renderer has no SVG filters or grid). Widths are shares of a whole stick. */
function Stick({ total, burned, w }: { total: number; burned: number; w: number }) {
  const left = Math.max(0, total - burned);
  const L = w * 0.84;
  return (
    <div style={{ display: "flex", alignItems: "center", height: 26, marginBottom: 10, flexShrink: 0 }}>
      <div style={{ display: "flex", width: w * 0.16, height: 26, background: "#e1a94f", borderRadius: "13px 3px 3px 13px" }} />
      <div style={{ display: "flex", width: L, height: 26, border: "2px dashed rgba(180,200,209,0.35)", borderLeft: "0", borderRadius: "3px 13px 13px 3px" }}>
        <div style={{ display: "flex", width: Math.round(L * left), height: 22, background: "#f4f8f9" }} />
        {burned > 0.01 && <div style={{ display: "flex", width: Math.round(L * burned), height: 22, background: "#6b7c84", borderRadius: "3px 11px 11px 3px" }} />}
      </div>
    </div>
  );
}

function Rows({ value, sofar, w }: { value: number; sofar: number; w: number }) {
  return <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>{sticksFor(value, sofar).map((s, i) => <Stick key={i} total={s.total} burned={s.burned} w={w} />)}</div>;
}

/**
 * GET /api/share-image?city=…&home=…&plan=seal,purifier&size=card|og
 * The query carries CHOICES only (same format as a share link). Every number is recomputed here from live air data, so a link cannot forge a figure.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const shared = decodeChoices(url.search);
  const city = CITIES.find((c) => c.id === shared.city) ?? CITIES.find((c) => c.id === "delhi") ?? CITIES[0];
  const profile: Profile = { ...DEFAULT_PROFILE, ...(shared.profile ?? {}) };
  const plan: Plan = shared.plan ?? NO_PLAN;
  const og = url.searchParams.get("size") === "og";

  const air = await getCityAir(city);
  const hour = istClock().hour;
  const base = simulate(air.hourly, profile, NO_PLAN);
  const withPlan = simulate(air.hourly, profile, plan);
  const saved = Math.max(0, base.cigs - withPlan.cigs);
  const pct = base.cigs > 0 ? Math.round((saved / base.cigs) * 100) : 0;
  const level = categoryOf(air.hourly[hour]).label;
  const aqi = aqiFromPm(air.hourly[hour]);
  const fixes = planSummary(plan).slice(0, 3);
  const changed = pct > 0;

  const W = og ? 1200 : 1080;
  const H = og ? 630 : 1350;
  const sw = og ? 440 : 880;
  const pad = og ? 48 : 64;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: og ? "row" : "column", width: W, height: H, padding: pad, background: "linear-gradient(160deg, #1f3a47 0%, #0f1f27 60%)", color: "#f1f7f9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: og ? 30 : 38, fontWeight: 800 }}>
            <div style={{ display: "flex", width: og ? 38 : 48, height: og ? 38 : 48, borderRadius: 99, background: "#28c7a8", marginRight: 14 }} />
            AirWise
            <div style={{ display: "flex", marginLeft: "auto", fontSize: og ? 24 : 30, color: "#b4c8d1", fontWeight: 700 }}>{`${city.name} · AQI ${aqi} · ${level}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: og ? 8 : 28 }}>
            <div style={{ display: "flex", fontSize: og ? 26 : 34, color: "#b4c8d1", fontWeight: 700 }}>Cigarettes equivalent a day</div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: og ? 150 : 230, fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>{f1(base.cigs)}</div>
              {changed && (
                <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, marginBottom: og ? 18 : 30 }}>
                  <div style={{ display: "flex", fontSize: og ? 34 : 46, color: "#28c7a8", fontWeight: 800 }}>{`down to ${f1(withPlan.cigs)}`}</div>
                  <div style={{ display: "flex", fontSize: og ? 26 : 34, color: "#28c7a8", fontWeight: 700 }}>{`${pct}% less with this plan`}</div>
                </div>
              )}
            </div>
          </div>
          {!og && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26, flexShrink: 0 }}>
              <div style={{ display: "flex", fontSize: 28, color: "#b4c8d1", fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>If nothing changes</div>
              <Rows value={base.cigs} sofar={cigsSoFar(base, hour)} w={sw} />
              {changed && (<div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ display: "flex", fontSize: 28, color: "#b4c8d1", fontWeight: 700, marginTop: 18, marginBottom: 12, flexShrink: 0 }}>With the plan</div>
                <Rows value={withPlan.cigs} sofar={cigsSoFar(withPlan, hour)} w={sw} />
              </div>)}
            </div>
          )}
          {!og && fixes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontSize: 30, fontWeight: 700 }}>
              {fixes.map((f) => <div key={f} style={{ display: "flex", marginBottom: 8 }}>{`• ${f}`}</div>)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 24, color: "#b4c8d1", fontSize: og ? 20 : 26 }}>
            <div style={{ display: "flex", color: "#f1f7f9", fontWeight: 800, fontSize: og ? 26 : 34 }}>Numbers from code. Words from AI.</div>
            <div style={{ display: "flex", marginTop: 6 }}>A rule of thumb, not a measure of anyone's health. General guidance, not medical advice.</div>
          </div>
        </div>
        {og && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 480, marginLeft: 36 }}>
            <Rows value={base.cigs} sofar={cigsSoFar(base, hour)} w={sw} />
            {changed && <div style={{ display: "flex", height: 22 }} />}
            {changed && <Rows value={withPlan.cigs} sofar={cigsSoFar(withPlan, hour)} w={sw} />}
          </div>
        )}
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } },
  );
}
