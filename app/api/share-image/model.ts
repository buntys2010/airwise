/** The share card's data and its two layouts' pixel sizes. */

/**
 * Everything the card draws. The route computes every figure and passes it in; the card is
 * presentation only.
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

export const f1 = (n: number) => n.toFixed(1);

/** Pixel sizes for the two layouts: the 1080x1350 card and the 1200x630 link preview. */
export function sizes(og: boolean) {
  return { W: og ? 1200 : 1080, H: og ? 630 : 1350, stickWidth: og ? 440 : 880, pad: og ? 48 : 64 };
}
