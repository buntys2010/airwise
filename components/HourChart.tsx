import { aqiFromPm, categoryOf, fmtHour, pmAt } from "@/lib/engine";

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

/** The chart's data as a table, for screen readers. */
function HourTable({ hourly }: Readonly<{ hourly: number[] }>) {
  return (
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
          <tr key={fmtHour(h)}>
            <td>{fmtHour(h)}</td>
            <td>{v}</td>
            <td>{aqiFromPm(v)}</td>
            <td>{categoryOf(v).label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 24 bars, one per hour. Colour is never the only signal: the best hour is outlined and labelled,
 * and a table is provided for screen readers.
 */
export function HourChart({ hourly, best, usual }: Readonly<Props>) {
  const CHART_WIDTH = 960,
    CHART_HEIGHT = 260,
    padL = 8,
    padB = 30,
    padT = 34;
  const max = Math.max(...hourly, 60);
  const bw = (CHART_WIDTH - padL) / 24;
  const yFor = (v: number) => padT + (CHART_HEIGHT - padT - padB) * (1 - v / max);
  const summary = `Outdoor PM2.5 by hour. Highest ${Math.max(...hourly)} at ${fmtHour(hourly.indexOf(Math.max(...hourly)))}. Cleanest afternoon hour ${fmtHour(best)} at ${hourly[best]}.`;
  return (
    <div className="panel chartbox">
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={summary}
      >
        {hourly.map((v, h) => {
          const barLeft = padL + h * bw;
          const tone = categoryOf(v).tone;
          return (
            <rect
              key={fmtHour(h)}
              x={barLeft + 3}
              y={yFor(v)}
              width={bw - 6}
              height={CHART_HEIGHT - padB - yFor(v)}
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
          height={CHART_HEIGHT - padT - padB + 6}
          rx={7}
          fill="none"
          className="hc-ink"
          strokeWidth={3}
        />
        <text
          x={Math.min(CHART_WIDTH - 150, Math.max(padL, padL + best * bw - 52))}
          y={padT - 14}
          className="hc-label hc-label-lg"
        >
          Best: {fmtHour(best)}
        </text>
        <line
          x1={padL + usual * bw + bw / 2}
          x2={padL + usual * bw + bw / 2}
          y1={yFor(pmAt(hourly, usual)) - 4}
          y2={yFor(pmAt(hourly, usual)) - 20}
          className="hc-ink"
          strokeWidth={2}
        />
        <text x={padL + usual * bw - 4} y={yFor(pmAt(hourly, usual)) - 26} className="hc-label">
          Your usual outing
        </text>
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={padL + h * bw + bw / 2} y={CHART_HEIGHT - 8} textAnchor="middle">
            {fmtHour(h)}
          </text>
        ))}
      </svg>
      <div className="legend" aria-hidden="true">
        {(["good", "moderate", "sensitive", "unhealthy", "severe", "hazardous"] as const).map(
          (t, i) => (
            <span key={t}>
              <i className="sw" style={{ background: TONE_FILL[t] }} />
              {
                [
                  "Good",
                  "Moderate",
                  "Sensitive groups",
                  "Unhealthy",
                  "Very unhealthy",
                  "Hazardous",
                ][i]
              }
            </span>
          ),
        )}
      </div>
      <HourTable hourly={hourly} />
    </div>
  );
}
