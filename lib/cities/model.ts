/**
 * Cities AirWise covers: every state and union-territory capital plus the largest cities, 100 or
 * so, from public knowledge of
 * their positions (latitude and longitude to about 0.1 degree, which is finer than the air feed's own grid).
 *
 * Be honest about resolution: Open-Meteo's air-quality data is gridded, so cities close together
 * can share a value.
 * The offline estimate curve (used only if the live feed is unreachable, and always labelled an
 * estimate) comes from a rough
 * winter level per region (`ZONE_LEVELS`), not a measurement.
 *
 * `unsure: true` marks a position or choice of reference point that should be double-checked (see
 * docs/CITIES.md).
 */
export type Zone =
  | "igp"
  | "north"
  | "central"
  | "east"
  | "west"
  | "coast"
  | "south"
  | "hills"
  | "northeast"
  | "island";

/**
 * Typical winter pre-dawn peak and mid-afternoon low, PM2.5 in ug/m3, by region. Rough, for the
 * offline estimate only.
 */
export const ZONE_LEVELS: Record<Zone, { peak: number; trough: number }> = {
  igp: { peak: 310, trough: 150 },
  north: { peak: 240, trough: 115 },
  central: { peak: 170, trough: 85 },
  east: { peak: 190, trough: 95 },
  west: { peak: 120, trough: 60 },
  coast: { peak: 95, trough: 45 },
  south: { peak: 70, trough: 32 },
  hills: { peak: 95, trough: 40 },
  northeast: { peak: 110, trough: 50 },
  island: { peak: 30, trough: 14 },
};

/** A city with its coordinates and the typical daily range used when the live feed is down. */
export interface City {
  id: string;
  name: string;
  state: string;
  /** Other names people search for (Bombay, Madras, Allahabad...). The English name always works too. */
  aka?: string[];
  /** The monitoring area in the first six cities. */
  area: string;
  lat: number;
  lon: number;
  zone: Zone;
  peak: number;
  trough: number;
  /** Drawn with a name on the map. The rest are dots you can tap. */
  label?: boolean;
  /** Position or reference point to double-check. */
  unsure?: boolean;
}

interface Extra {
  aka?: string[];
  area?: string;
  peak?: number;
  trough?: number;
  label?: boolean;
  unsure?: boolean;
}
/** Where a city is and which pollution zone it belongs to, as one compact table row. */
type Place = [id: string, name: string, state: string, lat: number, lon: number, zone: Zone];

/** One row of the city table: the place, plus optional overrides for its area, labels and estimate levels. */
export const cityRow = ([id, name, state, lat, lon, zone]: Place, extra: Extra = {}): City => ({
  id,
  name,
  state,
  lat,
  lon,
  zone,
  area: extra.area ?? state,
  aka: extra.aka,
  label: extra.label,
  unsure: extra.unsure,
  peak: extra.peak ?? ZONE_LEVELS[zone].peak,
  trough: extra.trough ?? ZONE_LEVELS[zone].trough,
});
