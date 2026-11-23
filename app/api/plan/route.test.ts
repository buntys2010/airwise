import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetGeminiBudget } from "@/lib/gemini";

import { must } from "../../../test-support/must";
import { POST } from "./route";

vi.mock("@/lib/data", async (orig) => {
  const real = await orig<typeof import("@/lib/data")>();
  return {
    ...real,
    getCityAir: (c: Parameters<typeof real.estimateHourly>[0]) =>
      Promise.resolve({
        hourly: real.estimateHourly(c),
        source: "live" as const,
        temp: 9,
        wind: 4,
        updated: "10:00",
      }),
  };
});

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
let callCount = 0;
const call = (body: unknown, ip = `10.1.0.${++callCount}`) =>
  POST(
    new Request("http://x/api/plan", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const bodyOf = (f: ReturnType<typeof vi.fn>) =>
  JSON.parse((must(f.mock.calls[0])[1] as RequestInit).body as string);
/**
 * Echoes the step times Gemini was asked to keep, so the reply is valid for whatever schedule the
 * server built.
 */
const echoPlan = (headline: string, textOf = (title: string) => `${title}.`) =>
  vi.fn().mockImplementation((_url: string, init: RequestInit) => {
    const prompt: string = JSON.parse(init.body as string).contents[0].parts[0].text;
    const facts = JSON.parse(must(must(prompt.split("<facts>\n")[1]).split("\n</facts>")[0])) as {
      steps: { time: string; title: string }[];
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      headline,
                      steps: facts.steps.map((s) => ({ time: s.time, text: textOf(s.title) })),
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });
  });

beforeEach(() => resetGeminiBudget());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/plan", () => {
  it("returns the deterministic plan when no key is set, with the reason", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await call({ choices });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ source: "offline", verified: false, reason: "no_key" });
    expect(json.steps.length).toBeGreaterThanOrEqual(6);
  });
  it("serves Gemini's plan when valid and grounded, with JSON output, thinking off and the key in a header", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = echoPlan("A calmer day");
    vi.stubGlobal("fetch", fetchMock);
    const json = await (await call({ choices })).json();
    expect(json).toMatchObject({ source: "gemini", verified: true, headline: "A calmer day" });
    expect(bodyOf(fetchMock).generationConfig).toMatchObject({
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(String(must(fetchMock.mock.calls[0])[0])).not.toContain("test-key");
  });
  it("rejects Gemini's plan when it invents a number, and says so", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", echoPlan("Cut 99% of smog"));
    const json = await (await call({ choices: { ...choices, city: "lucknow" } })).json();
    expect(json).toMatchObject({ source: "offline", verified: false, rejected: true });
  });
  it("serves a repeated verified plan from cache without another model call", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = echoPlan("Cached plan");
    vi.stubGlobal("fetch", fetchMock);
    const req = { choices: { ...choices, city: "kolkata" } };
    await call(req);
    expect(await (await call(req)).json()).toMatchObject({
      source: "gemini",
      verified: true,
      cached: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("validates input, size and rate", async () => {
    expect((await call("{bad")).status).toBe(400);
    expect((await call({})).status).toBe(400);
    expect((await call({ choices: { ...choices, home: "castle" } })).status).toBe(400);
    expect((await call({ choices, pad: "x".repeat(4000) })).status).toBe(413);
    vi.stubEnv("GEMINI_API_KEY", "");
    let last = 200;
    for (let i = 0; i < 8; i++) last = (await call({ choices }, "7.7.7.7")).status;
    expect(last).toBe(429);
  });
});
