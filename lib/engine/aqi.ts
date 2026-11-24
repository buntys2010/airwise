/** AQI bands: PM2.5 to AQI, and the tone and icon of each band. The words live in lib/i18n. */

/** An AQI band: a tone for styling and an icon. The wording lives in lib/i18n. */
export interface Category {
  tone: "good" | "moderate" | "sensitive" | "unhealthy" | "severe" | "hazardous";
  icon: string;
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
    category: { tone: "good", icon: "●" },
  },
  {
    maxAqi: 100,
    category: {
      tone: "moderate",
      icon: "◆",
    },
  },
  {
    maxAqi: 150,
    category: {
      tone: "sensitive",
      icon: "▲",
    },
  },
  {
    maxAqi: 200,
    category: {
      tone: "unhealthy",
      icon: "■",
    },
  },
  {
    maxAqi: 300,
    category: {
      tone: "severe",
      icon: "⬣",
    },
  },
];

const HAZARDOUS: Category = {
  tone: "hazardous",
  icon: "✖",
};

/** The AQI band for a PM2.5 reading (µg/m³). */
export function categoryOf(pm: number): Category {
  const aqi = aqiFromPm(pm);
  return CATEGORY_BANDS.find((band) => aqi <= band.maxAqi)?.category ?? HAZARDOUS;
}

/** The band's name as a code, used to pick colours and translations. */
export type Tone = Category["tone"];
