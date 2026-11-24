import { afterEach, describe, expect, it, vi } from "vitest";

import { CITIES, estimateHourly, istClock, loadAir, parseHourly, parseWeather, weatherNote } from "./data";

const delhi = CITIES[0];
const day = (v: number) => Array.from({ length: 24 }, (_, i) => v + i);
const ok = (json: unknown) => ({ ok: true, json: async () => json });

afterEach(() => vi.unstubAllGlobals());

describe("parseHourly", () => {
  it("accepts 24 finite non-negative numbers and rounds them", () => {
    expect(parseHourly({ hourly: { pm2_5: day(10.4) } })).toHaveLength(24);
    expect(parseHourly({ hourly: { pm2_5: day(10.4) } })![0]).toBe(10);
  });
  it("rejects short, missing, null-containing, negative or non-numeric data", () => {
    expect(parseHourly(null)).toBeNull();
    expect(parseHourly({})).toBeNull();
    expect(parseHourly({ hourly: { pm2_5: [1, 2, 3] } })).toBeNull();
    expect(parseHourly({ hourly: { pm2_5: [...day(5).slice(0, 23), null] } })).toBeNull();
    expect(parseHourly({ hourly: { pm2_5: [...day(5).slice(0, 23), -3] } })).toBeNull();
    expect(parseHourly({ hourly: { pm2_5: [...day(5).slice(0, 23), "x"] } })).toBeNull();
  });
});

describe("parseWeather", () => {
  it("reads temperature and wind", () =>
    expect(parseWeather({ current: { temperature_2m: 9.4, wind_speed_10m: 3.6 } })).toEqual({
      temp: 9,
      wind: 4,
    }));
  it("returns nulls on bad input", () =>
    expect(parseWeather({ current: { temperature_2m: "x" } })).toEqual({ temp: null, wind: null }));
});

describe("loadAir", () => {
  it("is labelled live only when the feed answered with valid data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          String(url).includes("air-quality")
            ? ok({ hourly: { pm2_5: day(100) } })
            : ok({ current: { temperature_2m: 12, wind_speed_10m: 5 } }),
        ),
    );
    const r = await loadAir(delhi);
    expect(r.source).toBe("live");
    expect(r.hourly[0]).toBe(100);
    expect(r.temp).toBe(12);
    expect(r.updated).toMatch(/^\d{2}:\d{2}$/);
  });
  it("still goes live when only the weather call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes("air-quality")) return ok({ hourly: { pm2_5: day(80) } });
        throw new Error("weather down");
      }),
    );
    const r = await loadAir(delhi);
    expect(r.source).toBe("live");
    expect(r.temp).toBeNull();
  });
  it("falls back to a labelled estimate on network failure, HTTP error or bad data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await loadAir(delhi)).source).toBe("estimate");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect((await loadAir(delhi)).source).toBe("estimate");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ hourly: { pm2_5: [1] } })));
    const r = await loadAir(delhi);
    expect(r.source).toBe("estimate");
    expect(r.hourly).toEqual(estimateHourly(delhi));
    expect(r.updated).toBeNull();
  });
});

describe("weatherNote", () => {
  it("derives a sentence from wind and temperature", () => {
    expect(weatherNote(9, 3)).toMatch(/Cold, still air/);
    expect(weatherNote(25, 3)).toMatch(/lingers/);
    expect(weatherNote(20, 20)).toMatch(/disperse/);
    expect(weatherNote(20, 10)).toMatch(/breeze/);
    expect(weatherNote(null, null)).toBe("");
  });
});

describe("istClock", () => {
  it("returns India time", () => {
    const c = istClock(new Date("2026-11-22T04:30:00Z")); // 10:00 IST
    expect(c.hour).toBe(10);
    expect(c.label).toBe("10:00");
  });
});

describe("getCityAir (server cache)", () => {
  it("caches a live result for ten minutes and de-duplicates concurrent requests", async () => {
    const { getCityAir, resetAirCache } = await import("./data");
    resetAirCache();
    const f = vi
      .fn()
      .mockImplementation(async (url: string) =>
        String(url).includes("air-quality")
          ? ok({ hourly: { pm2_5: day(100) } })
          : ok({ current: { temperature_2m: 12, wind_speed_10m: 5 } }),
      );
    vi.stubGlobal("fetch", f);
    const [a, b] = await Promise.all([getCityAir(delhi), getCityAir(delhi)]);
    expect(a).toBe(b);
    expect(f).toHaveBeenCalledTimes(2); // one air and one weather call, not four
    await getCityAir(delhi);
    expect(f).toHaveBeenCalledTimes(2); // served from cache
  });
  it("never caches an estimate", async () => {
    const { getCityAir, resetAirCache } = await import("./data");
    resetAirCache();
    const f = vi.fn().mockRejectedValue(new Error("down"));
    vi.stubGlobal("fetch", f);
    expect((await getCityAir(delhi)).source).toBe("estimate");
    const calls = f.mock.calls.length;
    await getCityAir(delhi);
    expect(f.mock.calls.length).toBeGreaterThan(calls);
  });
});

describe("loadMap (batched)", () => {
  it("fetches cities in batches and labels a bad city as an estimate on its own", async () => {
    const { loadMap, MAP_CHUNK } = await import("./data");
    const good = { hourly: { pm2_5: day(50) } };
    const f = vi.fn().mockImplementation(async (url: string) => {
      const n = new URL(url).searchParams.get("latitude")!.split(",").length;
      return ok(
        Array.from({ length: n }, (_, i) =>
          url.includes("latitude=28.65,") && i === 1 ? { hourly: { pm2_5: [1] } } : good,
        ),
      );
    });
    vi.stubGlobal("fetch", f);
    const pts = await loadMap(9);
    expect(f).toHaveBeenCalledTimes(Math.ceil(CITIES.length / MAP_CHUNK));
    expect(String(f.mock.calls[0][0])).toContain("latitude=28.65,26.85");
    expect(pts).toHaveLength(CITIES.length);
    expect(pts[0]).toMatchObject({ id: "delhi", source: "live", pm: 59 });
    expect(pts[1]).toMatchObject({ id: "lucknow", source: "estimate" });
  });
  it("labels every city an estimate when the feed is down, and does not cache that", async () => {
    const { loadMap } = await import("./data");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const pts = await loadMap(10);
    expect(pts.every((p) => p.source === "estimate")).toBe(true);
  });
});

describe("parseMapBatch", () => {
  it("handles the single-object response Open-Meteo sends for one location", async () => {
    const { parseMapBatch } = await import("./data");
    expect(parseMapBatch({ hourly: { pm2_5: day(5) } }, 1)[0]).toHaveLength(24);
    expect(parseMapBatch(null, 2)).toEqual([null, null]);
  });
});

describe("istClock elapsed hours", () => {
  it("reports hours since midnight India time including minutes", () => {
    expect(istClock(new Date("2026-11-22T10:30:00Z")).elapsed).toBe(16); // 16:00 IST
    expect(istClock(new Date("2026-11-22T00:15:00Z")).elapsed).toBeCloseTo(5.75, 9); // 05:45 IST
    expect(istClock(new Date("2026-11-21T18:30:00Z")).elapsed).toBe(0); // midnight IST
  });
});
