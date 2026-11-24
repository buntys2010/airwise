import { aqiFromPm, categoryOf, fmtHour } from "@/lib/engine";

const TONE_FILL: Record<string, string> = {
  good: "#45d1b7",
  moderate: "#e9d758",
  sensitive: "#ffae4a",
  unhealthy: "#ff7a4d",
  severe: "#e0508a",
  hazardous: "#a56bff",
};

interface Props {
  hourly: number[];
  best: number;
  usual: number;
}

/** 24 bars, one per hour. Colour is never the only signal: the best hour is outlined and labelled, and a table is provided for screen readers. */
export function HourChart({ hourly, best, usual }: Props) {
  const W = 960,
    H = 260,
    padL = 8,
    padB = 30,
    padT = 34;
  const max = Math.max(...hourly, 60);
  const bw = (W - padL) / 24;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const summary = `Outdoor PM2.5 by hour. Highest ${Math.max(...hourly)} at ${fmtHour(hourly.indexOf(Math.max(...hourly)))}. Cleanest afternoon hour ${fmtHour(best)} at ${hourly[best]}.`;
  return (
    <div className="panel chartbox">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {hourly.map((v, h) => {
          const x = padL + h * bw;
          const tone = categoryOf(v).tone;
          return (
            <rect
              key={h}
              x={x + 3}
              y={y(v)}
              width={bw - 6}
              height={H - padB - y(v)}
              rx={5}
              fill={TONE_FILL[tone]}
              opacity={h === best || h === usual ? 1 : 0.78}
            />
          );
        })}
        <rect
          x={padL + best * bw}
          y={padT - 6}
          width={bw}
          height={H - padT - padB + 6}
          rx={7}
          fill="none"
          stroke="#0f1f27"
          strokeWidth={3}
        />
        <text
          x={Math.min(W - 150, Math.max(padL, padL + best * bw - 52))}
          y={padT - 14}
          style={{ fill: "#0f1f27", fontWeight: 700, fontSize: 14 }}
        >
          Best: {fmtHour(best)}
        </text>
        <line
          x1={padL + usual * bw + bw / 2}
          x2={padL + usual * bw + bw / 2}
          y1={y(hourly[usual]) - 4}
          y2={y(hourly[usual]) - 20}
          stroke="#0f1f27"
          strokeWidth={2}
        />
        <text
          x={padL + usual * bw - 4}
          y={y(hourly[usual]) - 26}
          style={{ fill: "#0f1f27", fontWeight: 700, fontSize: 13 }}
        >
          Your usual outing
        </text>
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={padL + h * bw + bw / 2} y={H - 8} textAnchor="middle">
            {fmtHour(h)}
          </text>
        ))}
      </svg>
      <div className="legend" aria-hidden="true">
        {(["good", "moderate", "sensitive", "unhealthy", "severe", "hazardous"] as const).map((t, i) => (
          <span key={t}>
            <i className="sw" style={{ background: TONE_FILL[t] }} />
            {["Good", "Moderate", "Sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous"][i]}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Outdoor PM2.5 and AQI by hour</caption>
        <thead>
          <tr>
            <th>Hour</th>
            <th>PM2.5 µg/m³</th>
            <th>AQI</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {hourly.map((v, h) => (
            <tr key={h}>
              <td>{fmtHour(h)}</td>
              <td>{v}</td>
              <td>{aqiFromPm(v)}</td>
              <td>{categoryOf(v).label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
