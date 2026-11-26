/** One colour per AQI tone, shared by the map markers and the hour chart. Colour is never the only signal: shapes, icons and text carry the level too. */

import type { Tone } from "./engine";

export const TONE_FILL: Record<Tone, string> = {
  good: "#45d1b7",
  moderate: "#e9d758",
  sensitive: "#ffae4a",
  unhealthy: "#ff7a4d",
  severe: "#e0508a",
  hazardous: "#a56bff",
};
