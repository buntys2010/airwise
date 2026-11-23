/**
 * Cities AirWise covers: every state and union-territory capital plus the largest cities, 100 or so, from public knowledge of
 * their positions (latitude and longitude to about 0.1 degree, which is finer than the air feed's own grid).
 *
 * Be honest about resolution: Open-Meteo's air-quality data is gridded, so cities close together can share a value.
 * The offline estimate curve (used only if the live feed is unreachable, and always labelled an estimate) comes from a rough
 * winter level per region (`ZONE_LEVELS`), not a measurement.
 *
 * `unsure: true` marks a position or choice of reference point that should be double-checked (see docs/CITIES.md).
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

/** Typical winter pre-dawn peak and mid-afternoon low, PM2.5 in ug/m3, by region. Rough, for the offline estimate only. */
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
// A positional row helper keeps the ~150-line city table readable at a glance; the optional extras are the 7th argument.
/* eslint-disable max-params */
const cityRow = (
  id: string,
  name: string,
  state: string,
  lat: number,
  lon: number,
  zone: Zone,
  x: Extra = {},
): City => ({
  id,
  name,
  state,
  lat,
  lon,
  zone,
  area: x.area ?? state,
  aka: x.aka,
  label: x.label,
  unsure: x.unsure,
  peak: x.peak ?? ZONE_LEVELS[zone].peak,
  trough: x.trough ?? ZONE_LEVELS[zone].trough,
});

export const CITIES: City[] = [
  // The first six keep their original monitoring areas and estimate levels.
  cityRow("delhi", "Delhi", "Delhi", 28.65, 77.31, "igp", {
    area: "Anand Vihar",
    peak: 360,
    trough: 185,
    label: true,
  }),
  cityRow("lucknow", "Lucknow", "Uttar Pradesh", 26.85, 80.99, "igp", {
    area: "Gomti Nagar",
    peak: 295,
    trough: 150,
    label: true,
  }),
  cityRow("kolkata", "Kolkata", "West Bengal", 22.52, 88.36, "east", {
    aka: ["Calcutta"],
    area: "Ballygunge",
    peak: 205,
    trough: 96,
    label: true,
  }),
  cityRow("mumbai", "Mumbai", "Maharashtra", 19.07, 72.87, "west", {
    aka: ["Bombay"],
    area: "Bandra Kurla",
    peak: 118,
    trough: 58,
    label: true,
  }),
  cityRow("pune", "Pune", "Maharashtra", 18.53, 73.85, "west", {
    area: "Shivajinagar",
    peak: 98,
    trough: 46,
    label: true,
  }),
  cityRow("bengaluru", "Bengaluru", "Karnataka", 12.92, 77.62, "south", {
    aka: ["Bangalore"],
    area: "Silk Board",
    peak: 52,
    trough: 24,
    label: true,
  }),

  // State and union-territory capitals, and the largest cities, in rough north-to-south order within each group.
  cityRow("chennai", "Chennai", "Tamil Nadu", 13.08, 80.27, "coast", {
    aka: ["Madras"],
    label: true,
  }),
  cityRow("hyderabad", "Hyderabad", "Telangana", 17.39, 78.49, "south", { label: true }),
  cityRow("ahmedabad", "Ahmedabad", "Gujarat", 23.02, 72.57, "west", { label: true }),
  cityRow("jaipur", "Jaipur", "Rajasthan", 26.91, 75.79, "north", { label: true }),
  cityRow("patna", "Patna", "Bihar", 25.59, 85.14, "igp", { label: true }),
  cityRow("bhopal", "Bhopal", "Madhya Pradesh", 23.26, 77.41, "central", { label: true }),

  cityRow("srinagar", "Srinagar", "Jammu and Kashmir", 34.08, 74.8, "hills"),
  cityRow("jammu", "Jammu", "Jammu and Kashmir", 32.73, 74.87, "north"),
  cityRow("leh", "Leh", "Ladakh", 34.15, 77.58, "hills"),
  cityRow("chandigarh", "Chandigarh", "Chandigarh", 30.73, 76.78, "north"),
  cityRow("shimla", "Shimla", "Himachal Pradesh", 31.1, 77.17, "hills"),
  cityRow("dehradun", "Dehradun", "Uttarakhand", 30.32, 78.03, "north"),
  cityRow("haridwar", "Haridwar", "Uttarakhand", 29.95, 78.16, "north"),
  cityRow("amritsar", "Amritsar", "Punjab", 31.63, 74.87, "north"),
  cityRow("ludhiana", "Ludhiana", "Punjab", 30.9, 75.86, "north"),
  cityRow("jalandhar", "Jalandhar", "Punjab", 31.33, 75.58, "north"),
  cityRow("patiala", "Patiala", "Punjab", 30.34, 76.39, "north"),
  cityRow("bathinda", "Bathinda", "Punjab", 30.21, 74.95, "north"),
  cityRow("panipat", "Panipat", "Haryana", 29.39, 76.97, "igp"),
  cityRow("karnal", "Karnal", "Haryana", 29.69, 76.99, "igp"),
  cityRow("rohtak", "Rohtak", "Haryana", 28.9, 76.61, "igp"),
  cityRow("hisar", "Hisar", "Haryana", 29.15, 75.72, "north"),
  cityRow("gurugram", "Gurugram", "Haryana", 28.46, 77.03, "igp", { aka: ["Gurgaon"] }),
  cityRow("faridabad", "Faridabad", "Haryana", 28.41, 77.31, "igp"),
  cityRow("noida", "Noida", "Uttar Pradesh", 28.54, 77.39, "igp"),
  cityRow("ghaziabad", "Ghaziabad", "Uttar Pradesh", 28.67, 77.45, "igp"),
  cityRow("meerut", "Meerut", "Uttar Pradesh", 28.98, 77.71, "igp"),
  cityRow("saharanpur", "Saharanpur", "Uttar Pradesh", 29.96, 77.55, "igp"),
  cityRow("muzaffarnagar", "Muzaffarnagar", "Uttar Pradesh", 29.47, 77.7, "igp"),
  cityRow("moradabad", "Moradabad", "Uttar Pradesh", 28.84, 78.78, "igp"),
  cityRow("bareilly", "Bareilly", "Uttar Pradesh", 28.35, 79.43, "igp"),
  cityRow("aligarh", "Aligarh", "Uttar Pradesh", 27.88, 78.08, "igp"),
  cityRow("mathura", "Mathura", "Uttar Pradesh", 27.49, 77.67, "igp"),
  cityRow("agra", "Agra", "Uttar Pradesh", 27.18, 78.02, "igp"),
  cityRow("firozabad", "Firozabad", "Uttar Pradesh", 27.15, 78.4, "igp"),
  cityRow("kanpur", "Kanpur", "Uttar Pradesh", 26.45, 80.35, "igp"),
  cityRow("jhansi", "Jhansi", "Uttar Pradesh", 25.45, 78.57, "central"),
  cityRow("prayagraj", "Prayagraj", "Uttar Pradesh", 25.44, 81.85, "igp", { aka: ["Allahabad"] }),
  cityRow("varanasi", "Varanasi", "Uttar Pradesh", 25.32, 82.97, "igp", {
    aka: ["Benares", "Banaras"],
  }),
  cityRow("gorakhpur", "Gorakhpur", "Uttar Pradesh", 26.76, 83.37, "igp"),

  cityRow("jodhpur", "Jodhpur", "Rajasthan", 26.3, 73.02, "north"),
  cityRow("bikaner", "Bikaner", "Rajasthan", 28.02, 73.31, "north"),
  cityRow("ajmer", "Ajmer", "Rajasthan", 26.45, 74.64, "north"),
  cityRow("kota", "Kota", "Rajasthan", 25.18, 75.84, "north"),
  cityRow("udaipur", "Udaipur", "Rajasthan", 24.58, 73.68, "north"),

  cityRow("gandhinagar", "Gandhinagar", "Gujarat", 23.22, 72.65, "west"),
  cityRow("surat", "Surat", "Gujarat", 21.17, 72.83, "west"),
  cityRow("vadodara", "Vadodara", "Gujarat", 22.31, 73.18, "west", { aka: ["Baroda"] }),
  cityRow("rajkot", "Rajkot", "Gujarat", 22.3, 70.8, "west"),
  cityRow("daman", "Daman", "Dadra and Nagar Haveli and Daman and Diu", 20.41, 72.83, "west", {
    unsure: true,
  }),

  cityRow("indore", "Indore", "Madhya Pradesh", 22.72, 75.86, "central"),
  cityRow("ujjain", "Ujjain", "Madhya Pradesh", 23.18, 75.78, "central"),
  cityRow("gwalior", "Gwalior", "Madhya Pradesh", 26.22, 78.18, "central"),
  cityRow("jabalpur", "Jabalpur", "Madhya Pradesh", 23.18, 79.99, "central"),
  cityRow("raipur", "Raipur", "Chhattisgarh", 21.25, 81.63, "central"),
  cityRow("bhilai", "Bhilai", "Chhattisgarh", 21.21, 81.38, "central"),
  cityRow("bilaspur", "Bilaspur", "Chhattisgarh", 22.08, 82.14, "central"),

  cityRow("gaya", "Gaya", "Bihar", 24.8, 85.0, "igp"),
  cityRow("muzaffarpur", "Muzaffarpur", "Bihar", 26.12, 85.39, "igp"),
  cityRow("darbhanga", "Darbhanga", "Bihar", 26.15, 85.9, "igp"),
  cityRow("bhagalpur", "Bhagalpur", "Bihar", 25.24, 86.97, "igp"),
  cityRow("ranchi", "Ranchi", "Jharkhand", 23.34, 85.31, "east"),
  cityRow("dhanbad", "Dhanbad", "Jharkhand", 23.8, 86.45, "east"),
  cityRow("jamshedpur", "Jamshedpur", "Jharkhand", 22.8, 86.2, "east"),
  cityRow("siliguri", "Siliguri", "West Bengal", 26.73, 88.4, "east"),
  cityRow("asansol", "Asansol", "West Bengal", 23.68, 86.98, "east"),
  cityRow("durgapur", "Durgapur", "West Bengal", 23.55, 87.32, "east"),
  cityRow("bhubaneswar", "Bhubaneswar", "Odisha", 20.3, 85.82, "east"),
  cityRow("cuttack", "Cuttack", "Odisha", 20.46, 85.88, "east"),
  cityRow("rourkela", "Rourkela", "Odisha", 22.26, 84.85, "east"),
  cityRow("sambalpur", "Sambalpur", "Odisha", 21.47, 83.97, "east"),
  cityRow("puri", "Puri", "Odisha", 19.81, 85.83, "coast"),

  cityRow("guwahati", "Guwahati", "Assam", 26.14, 91.74, "northeast"),
  cityRow("dibrugarh", "Dibrugarh", "Assam", 27.47, 94.91, "northeast"),
  cityRow("jorhat", "Jorhat", "Assam", 26.75, 94.2, "northeast"),
  cityRow("silchar", "Silchar", "Assam", 24.83, 92.78, "northeast"),
  cityRow("itanagar", "Itanagar", "Arunachal Pradesh", 27.08, 93.61, "northeast", { unsure: true }),
  cityRow("gangtok", "Gangtok", "Sikkim", 27.33, 88.61, "northeast"),
  cityRow("shillong", "Shillong", "Meghalaya", 25.57, 91.88, "northeast"),
  cityRow("kohima", "Kohima", "Nagaland", 25.67, 94.11, "northeast"),
  cityRow("imphal", "Imphal", "Manipur", 24.82, 93.94, "northeast"),
  cityRow("aizawl", "Aizawl", "Mizoram", 23.73, 92.72, "northeast"),
  cityRow("agartala", "Agartala", "Tripura", 23.83, 91.28, "northeast"),

  cityRow("thane", "Thane", "Maharashtra", 19.22, 72.98, "west"),
  cityRow("nashik", "Nashik", "Maharashtra", 19.99, 73.79, "west"),
  cityRow("nagpur", "Nagpur", "Maharashtra", 21.15, 79.09, "central"),
  cityRow("aurangabad", "Chhatrapati Sambhajinagar", "Maharashtra", 19.88, 75.34, "west", {
    aka: ["Aurangabad"],
  }),
  cityRow("nanded", "Nanded", "Maharashtra", 19.15, 77.31, "central"),
  cityRow("solapur", "Solapur", "Maharashtra", 17.66, 75.91, "south"),
  cityRow("kolhapur", "Kolhapur", "Maharashtra", 16.7, 74.24, "west"),
  cityRow("panaji", "Panaji", "Goa", 15.5, 73.83, "coast", { aka: ["Panjim"] }),

  cityRow("visakhapatnam", "Visakhapatnam", "Andhra Pradesh", 17.69, 83.22, "coast", {
    aka: ["Vizag"],
  }),
  cityRow("vijayawada", "Vijayawada", "Andhra Pradesh", 16.51, 80.65, "south"),
  cityRow("amaravati", "Amaravati", "Andhra Pradesh", 16.57, 80.36, "south", { unsure: true }),
  cityRow("guntur", "Guntur", "Andhra Pradesh", 16.31, 80.44, "south"),
  cityRow("nellore", "Nellore", "Andhra Pradesh", 14.44, 79.99, "coast"),
  cityRow("tirupati", "Tirupati", "Andhra Pradesh", 13.63, 79.42, "south"),
  cityRow("warangal", "Warangal", "Telangana", 17.97, 79.6, "south"),

  cityRow("belagavi", "Belagavi", "Karnataka", 15.85, 74.5, "south", { aka: ["Belgaum"] }),
  cityRow("hubballi", "Hubballi", "Karnataka", 15.36, 75.12, "south", { aka: ["Hubli"] }),
  cityRow("mysuru", "Mysuru", "Karnataka", 12.3, 76.64, "south", { aka: ["Mysore"] }),
  cityRow("mangaluru", "Mangaluru", "Karnataka", 12.91, 74.86, "coast", { aka: ["Mangalore"] }),

  cityRow("coimbatore", "Coimbatore", "Tamil Nadu", 11.02, 76.96, "south"),
  cityRow("tiruchirappalli", "Tiruchirappalli", "Tamil Nadu", 10.79, 78.69, "south", {
    aka: ["Trichy"],
  }),
  cityRow("madurai", "Madurai", "Tamil Nadu", 9.93, 78.12, "south"),
  cityRow("puducherry", "Puducherry", "Puducherry", 11.93, 79.83, "coast", {
    aka: ["Pondicherry"],
  }),
  cityRow("kochi", "Kochi", "Kerala", 9.93, 76.27, "coast", { aka: ["Cochin"] }),
  cityRow("thrissur", "Thrissur", "Kerala", 10.53, 76.21, "coast"),
  cityRow("kozhikode", "Kozhikode", "Kerala", 11.26, 75.78, "coast", { aka: ["Calicut"] }),
  cityRow("thiruvananthapuram", "Thiruvananthapuram", "Kerala", 8.52, 76.94, "coast", {
    aka: ["Trivandrum"],
  }),
  cityRow("kavaratti", "Kavaratti", "Lakshadweep", 10.57, 72.64, "island", { unsure: true }),
  cityRow("port-blair", "Port Blair", "Andaman and Nicobar Islands", 11.62, 92.73, "island"),
];

/** The city shown when an id is unknown. The list is never empty, so this always exists. */
export const FALLBACK_CITY: City =
  CITIES[0] ??
  (() => {
    throw new Error("CITIES must not be empty");
  })();

/** India's bounding box, for a sanity check on every position. */
export const INDIA_BOUNDS = { latMin: 6, latMax: 37.2, lonMin: 68, lonMax: 97.6 };

const squash = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** City search: matches the name, any other name (Bombay, Madras...) or the state, ignoring case and punctuation. */
export function searchCities(query: string, list: City[] = CITIES): City[] {
  const squashed = squash(query);
  if (!squashed) return list;
  const score = (cty: City): number => {
    const name = squash(cty.name),
      aka = (cty.aka ?? []).map(squash),
      state = squash(cty.state);
    if (name === squashed || aka.includes(squashed)) return 0;
    if (name.startsWith(squashed) || aka.some((a) => a.startsWith(squashed))) return 1;
    if (name.includes(squashed) || aka.some((a) => a.includes(squashed))) return 2;
    if (state.startsWith(squashed)) return 3;
    if (state.includes(squashed)) return 4;
    return 99;
  };
  return list
    .map((cty) => ({ cty, s: score(cty) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.cty.name.localeCompare(b.cty.name))
    .map((x) => x.cty);
}
