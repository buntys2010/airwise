/**
 * Every colour that cannot come from the stylesheet. CSS variables (app/globals.css) cover the page,
 * but the share image, the icons, the manifest and the SVG charts are drawn where a variable does not
 * reach, so their colours are named once here and kept in step with the page's tokens.
 */
import type { Tone } from "./engine/aqi";

/** The dark brand colours: the app mark, the manifest and the browser chrome. */
export const BRAND = {
  /** The page's deep background (the manifest and theme colour). */
  ink: "#12222a",
  /** A raised surface on the ink, like the disc behind the mark. */
  inkRaised: "#1c333e",
  /** The teal of the mark and of "good" air. */
  mark: "#45d1b7",
  /** Text on the ink. */
  onInk: "#f4f8f9",
} as const;

/** One colour per AQI band, for the map, the hour chart and the dose bars. */
export const TONE_COLOUR: Record<Tone, string> = {
  good: BRAND.mark,
  moderate: "#e9d758",
  sensitive: "#ffae4a",
  unhealthy: "#ff7a4d",
  severe: "#e0508a",
  hazardous: "#a56bff",
};

/** The share card, which the image renderer draws from fixed values. */
export const CARD = {
  muted: "#b4c8d1",
  accent: "#28c7a8",
  /** The part of a cigarette already smoked. */
  ash: "#6b7c84",
  /** The tip of a cigarette. */
  ember: "#e1a94f",
  /** The unsmoked part of a cigarette. */
  paper: "#f4f8f9",
  text: "#f1f7f9",
  white: "#ffffff",
  /** The card's background gradient, from the lighter top-left to the ink at the bottom. */
  background: "linear-gradient(160deg, #1f3a47 0%, #0f1f27 60%)",
} as const;
