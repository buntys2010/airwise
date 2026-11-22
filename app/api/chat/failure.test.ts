import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// The air lookup throws: an unexpected failure that no route handles itself.
vi.mock("@/lib/data", async (orig) => ({
  ...(await orig<typeof import("@/lib/data")>()),
  getCityAir: async () => {
    throw new Error("air feed exploded");
  },
}));

const choices = {
  city: "delhi",
  home: "typical",
  commute: "bike",
  km: 8,
  cooking: "lpg",
  vulnerable: true,
  plan: {},
  lang: "en",
};

describe("POST /api/chat on an unexpected failure", () => {
  it("answers a JSON 500 with a request id instead of a bare crash, and leaks no internals", async () => {
    const res = await POST(
      new Request("http://x/api/chat", {
        method: "POST",
        headers: { "x-forwarded-for": "10.7.7.7" },
        body: JSON.stringify({ question: "Do I need a mask?", choices }),
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/try again/i);
    expect(body.requestId).toBe(res.headers.get("x-request-id"));
    expect(JSON.stringify(body)).not.toContain("exploded");
  });
});
