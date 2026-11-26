/** Map geometry: the outline of India, the projection from longitude and latitude, and hand-placed city labels. */

/** A rough outline of India, [longitude, latitude]. Schematic, drawn by hand, not for navigation. */
const OUTLINE: [number, number][] = [
  [68.2, 23.6],
  [70.3, 24.4],
  [70.9, 26.4],
  [71.9, 27.9],
  [73.5, 29.3],
  [74.5, 31.0],
  [75.3, 32.4],
  [74.2, 33.6],
  [74.3, 35.0],
  [76.0, 35.9],
  [77.8, 35.5],
  [79.2, 34.3],
  [78.8, 32.5],
  [79.3, 31.0],
  [81.0, 30.1],
  [84.0, 28.6],
  [87.6, 27.8],
  [88.2, 26.9],
  [88.9, 26.6],
  [89.6, 26.7],
  [91.5, 26.8],
  [92.9, 27.8],
  [95.2, 29.2],
  [97.3, 28.3],
  [96.2, 27.1],
  [97.0, 26.0],
  [95.0, 25.4],
  [94.5, 23.9],
  [93.5, 22.6],
  [92.6, 22.9],
  [92.3, 24.0],
  [91.6, 24.2],
  [91.1, 25.2],
  [89.8, 25.3],
  [89.0, 26.0],
  [88.6, 24.6],
  [88.9, 22.6],
  [88.0, 21.6],
  [86.9, 21.3],
  [85.0, 19.6],
  [83.0, 17.6],
  [81.0, 15.9],
  [80.2, 13.3],
  [79.9, 10.3],
  [78.2, 8.9],
  [77.5, 8.1],
  [76.5, 8.9],
  [75.4, 11.7],
  [74.4, 14.5],
  [73.6, 16.5],
  [72.8, 19.1],
  [72.7, 20.8],
  [70.9, 20.7],
  [69.2, 22.2],
];
const W = 620;
const H = 680;
const LON0 = 67;
const LON1 = 98.5;
const LAT0 = 6;
const LAT1 = 38;
/** Horizontal map position of a longitude, in SVG units. */
export const x = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
/** Vertical map position of a latitude, in SVG units (north is up). */
export const y = (lat: number) => H - ((lat - LAT0) / (LAT1 - LAT0)) * H;

/** Cropped to the country, with room for the islands and the north-east. */
export const VIEW = { x: -70, y: 40, w: 670, h: 640 };

/** Where the twelve named cities' labels sit, relative to their dots. Hand-placed so none overlap (checked in a real browser). */
export const LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "end" }> = {
  delhi: { dx: -20, dy: -4, anchor: "end" },
  jaipur: { dx: -18, dy: 8, anchor: "end" },
  lucknow: { dx: 14, dy: -24, anchor: "start" },
  patna: { dx: 18, dy: -4, anchor: "start" },
  kolkata: { dx: -20, dy: 4, anchor: "end" },
  ahmedabad: { dx: -18, dy: 0, anchor: "end" },
  bhopal: { dx: 18, dy: 2, anchor: "start" },
  mumbai: { dx: -18, dy: -6, anchor: "end" },
  pune: { dx: 18, dy: 36, anchor: "start" },
  hyderabad: { dx: 18, dy: -24, anchor: "start" },
  bengaluru: { dx: -18, dy: 10, anchor: "end" },
  chennai: { dx: 18, dy: 4, anchor: "start" },
};

/** The outline as an SVG polygon points string. */
export const OUTLINE_POINTS = OUTLINE.map(([lon, lat]) => `${x(lon).toFixed(1)},${y(lat).toFixed(1)}`).join(
  " ",
);
