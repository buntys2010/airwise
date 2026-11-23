import { describe, expect, it } from "vitest";
import { must } from "../test-support/must";
const CONFIG_PATH = "../next.config.mjs";

describe("security headers", () => {
  it("send the expected headers on every route, allowing the microphone for same-origin voice only", async () => {
    const config = (await import(/* @vite-ignore */ CONFIG_PATH)).default as {
      headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };
    const rules = await config.headers();
    const headers = Object.fromEntries(must(rules[0]).headers.map((x) => [x.key, x.value]));
    expect(must(rules[0]).source).toBe("/(.*)");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("microphone=(self)");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });
});
