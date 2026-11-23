import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetGeminiBudget } from "@/lib/gemini";
import { POST } from "./route";
import { must } from "../../../test-support/must";

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
let n = 0;
const call = (
  body: unknown,
  headers: Record<string, string> = { "x-forwarded-for": `10.0.0.${++n}` },
) =>
  POST(
    new Request("http://x/api/chat", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const geminiText = (text: string) => ({
  ok: true,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
});
const status = (s: number) => ({ ok: false, status: s, json: () => Promise.resolve({}) });
const bodyOf = (f: ReturnType<typeof vi.fn>, i = 0) =>
  JSON.parse((must(f.mock.calls[i])[1] as RequestInit).body as string);

beforeEach(() => resetGeminiBudget());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/chat", () => {
  it("answers offline when no key is set, and names the reason", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await call({ question: "Do I need a mask?", choices });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      source: "offline",
      verified: false,
      reason: "no_key",
      air: "live",
    });
    expect(json.reasonText).toMatch(/not set up/);
    expect(json.answer).toMatch(/N95/);
  });
  it("validates JSON, question, choices and size", async () => {
    expect((await call("{nope")).status).toBe(400);
    expect((await call({ question: "", choices })).status).toBe(400);
    expect((await call({ question: "a".repeat(401), choices })).status).toBe(400);
    expect((await call({ question: "hi" })).status).toBe(400);
    expect((await call({ question: "hi", choices: { ...choices, city: "atlantis" } })).status).toBe(
      400,
    );
    expect((await call({ question: "hi", choices, pad: "x".repeat(4000) })).status).toBe(413);
  });
  it("rate limits one client after 12 requests a minute", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    let last = 200;
    for (let i = 0; i < 14; i++)
      last = (await call({ question: "hi", choices }, { "x-forwarded-for": "9.9.9.9" })).status;
    expect(last).toBe(429);
  });
  it("cannot be bypassed by spoofing earlier X-Forwarded-For entries", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    let last = 200;
    for (let i = 0; i < 14; i++)
      last = (await call({ question: "hi", choices }, { "x-forwarded-for": `1.2.3.${i}, 8.8.8.8` }))
        .status;
    expect(last).toBe(429);
  });
  it("uses Gemini with the key in a header, and recomputes the facts itself", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = vi.fn().mockResolvedValue(geminiText("Wear an N95."));
    vi.stubGlobal("fetch", f);
    const json = await (
      await call({
        question: "which mask works?",
        choices: { ...choices, baselineCigs: 0.1, pm: 1, options: [{ pct: 99 }] },
      })
    ).json();
    expect(json).toMatchObject({ answer: "Wear an N95.", source: "gemini", verified: true });
    expect(String(must(f.mock.calls[0])[0])).not.toContain("test-key");
    expect(must(f.mock.calls[0])[1]).toMatchObject({ headers: { "x-goog-api-key": "test-key" } });
    const prompt: string = bodyOf(f).contents[0].parts[0].text;
    expect(prompt).toContain('"city":"Delhi"');
    expect(prompt).not.toContain('"pm":1,'); // the client's fake number never reaches the model
    expect(prompt).not.toContain("99");
  });
  it("serves a repeated verified question from cache without another model call", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = vi.fn().mockResolvedValue(geminiText("Keep windows shut."));
    vi.stubGlobal("fetch", f);
    const q = { question: "windows cache check", choices };
    expect((await (await call(q)).json()).cached).toBeUndefined();
    expect(await (await call(q)).json()).toMatchObject({
      answer: "Keep windows shut.",
      verified: true,
      cached: true,
    });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("keeps languages apart in the cache and asks for Hindi", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = vi.fn().mockResolvedValue(geminiText("Keep windows shut."));
    vi.stubGlobal("fetch", f);
    await call({ question: "language cache check", choices });
    await call({ question: "language cache check", choices: { ...choices, lang: "hi" } });
    expect(f).toHaveBeenCalledTimes(2);
    expect(bodyOf(f, 1).contents[0].parts[0].text).toMatch(/Hindi/);
  });
  it("falls through to the next model when the first is rate limited", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = vi
      .fn()
      .mockResolvedValueOnce(status(429))
      .mockResolvedValueOnce(geminiText("Use a purifier."));
    vi.stubGlobal("fetch", f);
    expect(await (await call({ question: "chain fallback check", choices })).json()).toMatchObject({
      source: "gemini",
      verified: true,
    });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("rejects a Gemini answer with a number we did not compute, and does not cache it", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = vi.fn().mockResolvedValue(geminiText("An N95 cuts your exposure by 87% in Delhi."));
    vi.stubGlobal("fetch", f);
    const q = { question: "invented number check", choices };
    const json = await (await call(q)).json();
    expect(json).toMatchObject({ source: "offline", verified: false, rejected: true });
    expect(json.answer).not.toMatch(/87/);
    const before = f.mock.calls.length;
    await call(q);
    expect(f.mock.calls.length).toBeGreaterThan(before);
  });
  it("names the reason when Gemini is rate limited, times out, or cannot be reached", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(status(429)));
    expect(await (await call({ question: "quota reason check", choices })).json()).toMatchObject({
      reason: "quota",
      rejected: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );
    expect(await (await call({ question: "timeout reason check", choices })).json()).toMatchObject({
      reason: "timeout",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await (await call({ question: "network reason check", choices })).json()).toMatchObject({
      reason: "network",
      source: "offline",
    });
  });
  it("stops calling Gemini when the global budget is spent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_BUDGET_PER_MIN", "1");
    const f = vi.fn().mockResolvedValue(status(503));
    vi.stubGlobal("fetch", f);
    const json = await (await call({ question: "budget check", choices })).json();
    expect(f).toHaveBeenCalledTimes(1);
    expect(json.reason).toBe("budget");
  });
  it("turns off hidden thinking for 2.5 models", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const f = vi.fn().mockResolvedValue(geminiText("Wear an N95."));
    vi.stubGlobal("fetch", f);
    await call({ question: "thinking budget check", choices });
    expect(bodyOf(f).generationConfig.thinkingConfig.thinkingBudget).toBe(0);
  });
});

describe("chat time budget", () => {
  it("answers within the 12 second budget even when every model hangs, trying at most two models", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const hang = vi
      .fn()
      .mockImplementation(
        (_u: string, init: RequestInit) =>
          new Promise((_r, rej) =>
            must(init.signal).addEventListener("abort", () =>
              rej(Object.assign(new Error("aborted"), { name: "AbortError" })),
            ),
          ),
      );
    vi.stubGlobal("fetch", hang);
    const started = Date.now();
    let finished = 0;
    const pending = call({ question: "budget timing check", choices }).then((r) => {
      finished = Date.now();
      return r;
    });
    await vi.advanceTimersByTimeAsync(20_000);
    const res = await pending;
    const json = await res.json();
    expect(json).toMatchObject({ source: "offline", reason: "timeout" });
    expect(finished - started).toBeLessThanOrEqual(12_500);
    expect(hang.mock.calls.length).toBeLessThanOrEqual(2); // 6 s each, not a third attempt past the budget
    vi.useRealTimers();
  });
  it("a hanging first model still leaves the second one time to answer", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_u: string, init: RequestInit) => {
        if (++n === 1)
          return new Promise((_r, rej) =>
            must(init.signal).addEventListener("abort", () =>
              rej(Object.assign(new Error("aborted"), { name: "AbortError" })),
            ),
          );
        return Promise.resolve(geminiText("Use a purifier."));
      }),
    );
    const pending = call({ question: "second model after hang", choices });
    await vi.advanceTimersByTimeAsync(7_000);
    expect(await (await pending).json()).toMatchObject({ source: "gemini", verified: true });
    vi.useRealTimers();
  });
});
