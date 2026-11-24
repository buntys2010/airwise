import { describe, expect, it } from "vitest";

import { GET } from "./route";

let n = 0;
const call = (query = "", ip = `10.8.0.${++n}`) =>
  GET(new Request(`http://localhost/api/share-image?${query}`, { headers: { "x-forwarded-for": ip } }));

describe("GET /api/share-image", () => {
  it("returns an image response with security and cache headers", async () => {
    const res = await call("city=delhi&size=card");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toContain("public");
  });

  it("handles og size parameter", async () => {
    const res = await call("city=delhi&size=og");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("enforces rate limits per client IP", async () => {
    const testIp = "192.168.100.99";
    // Send 20 requests (the limit)
    for (let i = 0; i < 20; i++) {
      const res = await call("city=delhi", testIp);
      expect(res.status).toBe(200);
    }
    // 21st request should be rate limited with 429
    const blocked = await call("city=delhi", testIp);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toContain("Too many requests");
  });
});
