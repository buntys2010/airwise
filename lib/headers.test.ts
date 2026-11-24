import { describe, expect, it } from "vitest";
const CONFIG_PATH = "../next.config.mjs";

describe("security headers", () => {
  it("send the expected headers on every route, allowing the microphone for same-origin voice only", async () => {
    const config = (await import(/* @vite-ignore */ CONFIG_PATH)).default as {
      headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };
    const rules = await config.headers();
    const h = Object.fromEntries(rules[0].headers.map((x) => [x.key, x.value]));
    expect(rules[0].source).toBe("/(.*)");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("microphone=(self)");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Permissions-Policy"]).toContain("geolocation=()");
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });
});
