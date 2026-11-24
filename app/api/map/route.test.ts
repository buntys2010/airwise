import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CITIES, MAP_CHUNK, resetMapCache } from "@/lib/data";

import { GET } from "./route";

let n = 0;
const get = (ip = `10.9.0.${++n}`) =>
  GET(new Request("http://x/api/map", { headers: { "x-forwarded-for": ip } }));
const day = (v: number) => Array.from({ length: 24 }, (_, i) => v + i);
/** A fake feed that answers each batched request with the right number of cities, by parsing the latitude list. */
const feed = (make: (globalIndex: number) => unknown) => {
  return vi.fn().mockImplementation(async (url: string) => {
    const n = new URL(url).searchParams.get("latitude")!.split(",").length;
    const first = CITIES.findIndex(
      (c) => String(c.lat) === new URL(url).searchParams.get("latitude")!.split(",")[0],
    );
    return { ok: true, json: async () => Array.from({ length: n }, (_, k) => make(first + k)) };
  });
};

beforeEach(() => resetMapCache());
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/map", () => {
  it("returns every supported city from a few batched requests", async () => {
    const f = feed((i) => ({ hourly: { pm2_5: day(40 + (i % 20) * 10) } }));
    vi.stubGlobal("fetch", f);
    const res = await get();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.points).toHaveLength(CITIES.length);
    expect(json.live).toBe(CITIES.length);
    expect(json.time).toMatch(/^\d{2}:\d{2}$/);
    expect(f).toHaveBeenCalledTimes(Math.ceil(CITIES.length / MAP_CHUNK));
    for (const p of json.points) expect(["live", "estimate"]).toContain(p.source);
  });
  it("labels a city with bad data as an estimate and still returns the rest", async () => {
    vi.stubGlobal(
      "fetch",
      feed((i) => (i === 2 ? { hourly: { pm2_5: [1, 2] } } : { hourly: { pm2_5: day(90 + (i % 30)) } })),
    );
    const json = await (await get()).json();
    expect(json.points.filter((p: { source: string }) => p.source === "estimate")).toHaveLength(1);
    expect(json.points[2].source).toBe("estimate");
    expect(json.live).toBe(CITIES.length - 1);
  });
  it("labels only one chunk's cities as estimates when that request fails", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (++call === 1) throw new Error("one chunk down");
        const n = new URL(url).searchParams.get("latitude")!.split(",").length;
        return {
          ok: true,
          json: async () => Array.from({ length: n }, () => ({ hourly: { pm2_5: day(80) } })),
        };
      }),
    );
    const json = await (await get()).json();
    const est = json.points.filter((p: { source: string }) => p.source === "estimate").length;
    expect(est).toBe(MAP_CHUNK);
    expect(json.live).toBe(CITIES.length - MAP_CHUNK);
  });
  it("returns labelled estimates for every city when the feed is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const res = await get();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.live).toBe(0);
    expect(json.points.every((p: { source: string }) => p.source === "estimate")).toBe(true);
  });
  it("rate limits a client", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    let last = 200;
    for (let i = 0; i < 33; i++) last = (await get("4.4.4.4")).status;
    expect(last).toBe(429);
  });
});
