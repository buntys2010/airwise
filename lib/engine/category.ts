/** AQI maths: PM2.5 concentration to an index value, and an index value to a named band. */

import type { Category } from "./types";

/** US-EPA style PM2.5 breakpoints (µg/m³ to AQI). */
const BREAKS: { pm: number; aqi: number }[] = [
  { pm: 0, aqi: 0 },
  { pm: 12, aqi: 50 },
  { pm: 35.4, aqi: 100 },
  { pm: 55.4, aqi: 150 },
  { pm: 150.4, aqi: 200 },
  { pm: 250.4, aqi: 300 },
  { pm: 350.4, aqi: 400 },
  { pm: 500.4, aqi: 500 },
];
const MAX_AQI = 500;

/** US-EPA style AQI from PM2.5 (µg/m³), piecewise linear. */
export function aqiFromPm(pm: number): number {
  const x = Math.max(0, pm);
  for (let i = 1; i < BREAKS.length; i++) {
    if (x <= BREAKS[i].pm) {
      const lower = BREAKS[i - 1];
      const upper = BREAKS[i];
      return Math.round(lower.aqi + ((x - lower.pm) * (upper.aqi - lower.aqi)) / (upper.pm - lower.pm));
    }
  }
  return MAX_AQI;
}

/** Upper AQI bound of each band, with how to present it. The last band has no bound. */
const BANDS: { upTo: number; category: Category }[] = [
  { upTo: 50, category: { label: "Good", tone: "good", icon: "●", advice: "Air is clean. Open windows." } },
  {
    upTo: 100,
    category: {
      label: "Moderate",
      tone: "moderate",
      icon: "◆",
      advice: "The air is acceptable. Sensitive lungs may notice it.",
    },
  },
  {
    upTo: 150,
    category: {
      label: "Poor for sensitive groups",
      tone: "sensitive",
      icon: "▲",
      advice: "Children, older adults and asthma: keep outdoor time short.",
    },
  },
  {
    upTo: 200,
    category: {
      label: "Unhealthy",
      tone: "unhealthy",
      icon: "■",
      advice: "Cut outdoor time. Wear an N95 outside.",
    },
  },
  {
    upTo: 300,
    category: {
      label: "Very unhealthy",
      tone: "severe",
      icon: "⬣",
      advice: "Stay in. Run a purifier. N95 for any trip.",
    },
  },
];
const HAZARDOUS: Category = {
  label: "Hazardous",
  tone: "hazardous",
  icon: "✖",
  advice: "Avoid going out. Treat indoor air as your priority.",
};

/** The AQI band a PM2.5 level falls in. */
export function categoryOf(pm: number): Category {
  const aqi = aqiFromPm(pm);
  return BANDS.find((band) => aqi <= band.upTo)?.category ?? HAZARDOUS;
}
