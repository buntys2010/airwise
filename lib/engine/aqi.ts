/** AQI bands: PM2.5 to AQI, and the category, icon and advice for each band. */
// ≈ one cigarette per 22 µg/m³ of daily PM2.5 (Berkeley Earth rule of thumb)

export interface Category {
  label: string;
  tone: "good" | "moderate" | "sensitive" | "unhealthy" | "severe" | "hazardous";
  icon: string;
  advice: string;
}

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

/** US-EPA style AQI from PM2.5 (µg/m³), piecewise linear. */
export function aqiFromPm(pm: number): number {
  const clamped = Math.max(0, pm);
  for (let i = 1; i < BREAKS.length; i++) {
    const lower = BREAKS[i - 1];
    const upper = BREAKS[i];
    if (lower && upper && clamped <= upper.pm) {
      return Math.round(
        lower.aqi + ((clamped - lower.pm) * (upper.aqi - lower.aqi)) / (upper.pm - lower.pm),
      );
    }
  }
  return 500;
}

/**
 * Upper AQI bound of each band, with what the band is called and what to do in it. The last band
 * has no upper bound.
 */
const CATEGORY_BANDS: { maxAqi: number; category: Category }[] = [
  {
    maxAqi: 50,
    category: { label: "Good", tone: "good", icon: "●", advice: "Air is clean. Open windows." },
  },
  {
    maxAqi: 100,
    category: {
      label: "Moderate",
      tone: "moderate",
      icon: "◆",
      advice: "The air is acceptable. Sensitive lungs may notice it.",
    },
  },
  {
    maxAqi: 150,
    category: {
      label: "Poor for sensitive groups",
      tone: "sensitive",
      icon: "▲",
      advice: "Children, older adults and asthma: keep outdoor time short.",
    },
  },
  {
    maxAqi: 200,
    category: {
      label: "Unhealthy",
      tone: "unhealthy",
      icon: "■",
      advice: "Cut outdoor time. Wear an N95 outside.",
    },
  },
  {
    maxAqi: 300,
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

/** The AQI band for a PM2.5 reading (µg/m³). */
export function categoryOf(pm: number): Category {
  const aqi = aqiFromPm(pm);
  return CATEGORY_BANDS.find((band) => aqi <= band.maxAqi)?.category ?? HAZARDOUS;
}

export type Tone = Category["tone"];
