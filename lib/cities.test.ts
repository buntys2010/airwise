import { describe, expect, it } from "vitest";

import { CITIES, INDIA_BOUNDS, searchCities, ZONE_LEVELS } from "./cities";

const CAPITALS = [
  "Delhi",
  "Lucknow",
  "Kolkata",
  "Mumbai",
  "Chennai",
  "Hyderabad",
  "Bengaluru",
  "Jaipur",
  "Patna",
  "Bhopal",
  "Chandigarh",
  "Shimla",
  "Dehradun",
  "Srinagar",
  "Leh",
  "Ranchi",
  "Raipur",
  "Bhubaneswar",
  "Guwahati",
  "Itanagar",
  "Gangtok",
  "Shillong",
  "Kohima",
  "Imphal",
  "Aizawl",
  "Agartala",
  "Panaji",
  "Gandhinagar",
  "Thiruvananthapuram",
  "Puducherry",
  "Port Blair",
  "Kavaratti",
  "Amaravati",
  "Daman",
];

describe("city list", () => {
  it("has unique ids and names", () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length);
  });
  it("is large and every position is inside India's bounds", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(80);
    for (const c of CITIES) {
      expect(c.lat, c.id).toBeGreaterThanOrEqual(INDIA_BOUNDS.latMin);
      expect(c.lat, c.id).toBeLessThanOrEqual(INDIA_BOUNDS.latMax);
      expect(c.lon, c.id).toBeGreaterThanOrEqual(INDIA_BOUNDS.lonMin);
      expect(c.lon, c.id).toBeLessThanOrEqual(INDIA_BOUNDS.lonMax);
      expect(c.trough, c.id).toBeLessThan(c.peak);
      expect(ZONE_LEVELS[c.zone]).toBeTruthy();
    }
  });
  it("includes every state and union-territory capital", () => {
    const names = new Set(CITIES.map((c) => c.name));
    for (const n of CAPITALS) expect(names.has(n), n).toBe(true);
    expect(names.has("Thiruvananthapuram")).toBe(true);
  });
  it("keeps the original six cities' ids", () => {
    for (const id of ["delhi", "lucknow", "kolkata", "mumbai", "pune", "bengaluru"])
      expect(CITIES.some((c) => c.id === id)).toBe(true);
  });
  it("labels at most twelve cities on the map", () => {
    expect(CITIES.filter((c) => c.label).length).toBeLessThanOrEqual(12);
  });
});

describe("searchCities", () => {
  it("finds by name, old name, and state, ignoring case", () => {
    expect(searchCities("bombay")[0].id).toBe("mumbai");
    expect(searchCities("MADRAS")[0].id).toBe("chennai");
    expect(searchCities("kerala").map((c) => c.state)).toContain("Kerala");
    expect(searchCities("ben")[0].id).toBe("bengaluru");
  });
  it("returns everything for an empty query and nothing for nonsense", () => {
    expect(searchCities("  ").length).toBe(CITIES.length);
    expect(searchCities("zzzzqq")).toEqual([]);
  });
});
