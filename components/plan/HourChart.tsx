import { aqiFromPm, categoryOf, fmtHour, type Tone } from "@/lib/engine";
import { TONE_FILL } from "@/lib/toneColors";

interface Props {
  hourly: number[];
  best: number;
  usual: number;
}

/** Chart geometry in SVG units. */
const W = 960;
const H = 260;
const PAD_LEFT = 8;
const PAD_BOTTOM = 30;
const PAD_TOP = 34;
const HOURS = 24;
const MIN_SCALE_PM = 60;
const AXIS_HOURS = [0, 6, 12, 18, 23];
const INK = "#0f1f27";

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "good", label: "Good" },
  { tone: "moderate", label: "Moderate" },
  { tone: "sensitive", label: "Sensitive groups" },
  { tone: "unhealthy", label: "Unhealthy" },
  { tone: "severe", label: "Very unhealthy" },
  { tone: "hazardous", label: "Hazardous" },
];

interface Scale {
  barWidth: number;
  /** Vertical position of a PM2.5 value. */
  y: (pm: number) => number;
}

function scaleFor(hourly: number[]): Scale {
  const max = Math.max(...hourly, MIN_SCALE_PM);
  return {
    barWidth: (W - PAD_LEFT) / HOURS,
    y: (v) => PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - v / max),
  };
}

function Bars({ hourly, best, usual, scale }: Props & { scale: Scale }) {
  return hourly.map((v, h) => (
    <rect
      key={h}
      x={PAD_LEFT + h * scale.barWidth + 3}
      y={scale.y(v)}
      width={scale.barWidth - 6}
      height={H - PAD_BOTTOM - scale.y(v)}
      rx={5}
      fill={TONE_FILL[categoryOf(v).tone]}
      opacity={h === best || h === usual ? 1 : 0.78}
    />
  ));
}

/** The outline and label that mark the cleanest hour. */
function BestMarker({ best, scale }: { best: number; scale: Scale }) {
  const left = PAD_LEFT + best * scale.barWidth;
  return (
    <>
      <rect
        x={left}
        y={PAD_TOP - 6}
        width={scale.barWidth}
        height={H - PAD_TOP - PAD_BOTTOM + 6}
        rx={7}
        fill="none"
        stroke={INK}
        strokeWidth={3}
      />
      <text x={Math.min(W - 150, Math.max(PAD_LEFT, left - 52))} y={PAD_TOP - 14} className="chart-label">
        Best: {fmtHour(best)}
      </text>
    </>
  );
}

/** The tick and label that mark the usual outing hour. */
function UsualMarker({ hourly, usual, scale }: { hourly: number[]; usual: number; scale: Scale }) {
  const centre = PAD_LEFT + usual * scale.barWidth + scale.barWidth / 2;
  const top = scale.y(hourly[usual]);
  return (
    <>
      <line x1={centre} x2={centre} y1={top - 4} y2={top - 20} stroke={INK} strokeWidth={2} />
      <text x={PAD_LEFT + usual * scale.barWidth - 4} y={top - 26} className="chart-label chart-label-small">
        Your usual outing
      </text>
    </>
  );
}

function Legend() {
  return (
    <div className="legend" aria-hidden="true">
      {LEGEND.map(({ tone, label }) => (
        <span key={tone}>
          <i className="sw" style={{ background: TONE_FILL[tone] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** The same data as a table, for screen readers. */
function HourTable({ hourly }: { hourly: number[] }) {
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
          <tr key={h}>
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

/** 24 bars, one per hour. Colour is never the only signal: the best hour is outlined and labelled, and a table is provided for screen readers. */
export function HourChart({ hourly, best, usual }: Props) {
  const scale = scaleFor(hourly);
  const peak = Math.max(...hourly);
  const summary = `Outdoor PM2.5 by hour. Highest ${peak} at ${fmtHour(hourly.indexOf(peak))}. Cleanest afternoon hour ${fmtHour(best)} at ${hourly[best]}.`;
  return (
    <div className="panel chartbox">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        <Bars hourly={hourly} best={best} usual={usual} scale={scale} />
        <BestMarker best={best} scale={scale} />
        <UsualMarker hourly={hourly} usual={usual} scale={scale} />
        {AXIS_HOURS.map((h) => (
          <text key={h} x={PAD_LEFT + h * scale.barWidth + scale.barWidth / 2} y={H - 8} textAnchor="middle">
            {fmtHour(h)}
          </text>
        ))}
      </svg>
      <Legend />
      <HourTable hourly={hourly} />
    </div>
  );
}
