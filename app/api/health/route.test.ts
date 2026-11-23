import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("answers ok, uncached, with a request id", async () => {
    const res = await GET(new Request("http://x/api/health"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-request-id")).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
