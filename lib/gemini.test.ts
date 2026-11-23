import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generate,
  generateDetailed,
  generationConfig,
  modelChain,
  resetGeminiBudget,
  setLogSink,
} from "./gemini";
import { must } from "../test-support/must";

beforeEach(() => resetGeminiBudget());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  setLogSink(() => undefined);
});

const reply = (text: string) => ({
  ok: true,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
});
const status = (s: number) => ({ ok: false, status: s, json: () => Promise.resolve({}) });
const opts = { prompt: "hi", maxTokens: 10 };

describe("modelChain", () => {
  it("defaults to a primary model plus lite fallbacks", () => {
    const chain = modelChain({} as NodeJS.ProcessEnv);
    expect(chain[0]).toBe("gemini-2.5-flash");
    expect(chain.length).toBeGreaterThan(1);
  });
  it("honours environment overrides and removes duplicates", () => {
    expect(
      modelChain({
        GEMINI_MODEL: "a",
        GEMINI_FALLBACK_MODELS: "b, a ,c",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("generationConfig", () => {
  it("turns hidden thinking off only for 2.5 models", () => {
    expect(generationConfig("gemini-2.5-flash", { maxTokens: 100 }).thinkingConfig).toEqual({
      thinkingBudget: 0,
    });
    expect(generationConfig("gemini-3.5-flash-lite", { maxTokens: 100 })).not.toHaveProperty(
      "thinkingConfig",
    );
  });
  it("asks for JSON only when a schema is given", () => {
    expect(generationConfig("x", { maxTokens: 10, schema: { type: "OBJECT" } })).toMatchObject({
      responseMimeType: "application/json",
    });
    expect(generationConfig("x", { maxTokens: 10 })).not.toHaveProperty("responseMimeType");
  });
});

describe("generateDetailed: typed failure reasons", () => {
  it("no_key without touching the network", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "no_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    [429, "quota"],
    [400, "rejected"],
    [403, "rejected"],
    [503, "unavailable"],
    [404, "unavailable"],
  ])("HTTP %i becomes %s", async (code, reason) => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(status(code)));
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason });
  });
  it("blocked when the prompt or the answer is blocked", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ promptFeedback: { blockReason: "SAFETY" } }),
      }),
    );
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "blocked" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ finishReason: "SAFETY" }] }),
      }),
    );
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "blocked" });
  });
  it("empty, network and timeout", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { role: "model" } }] }),
      }),
    );
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "empty" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "network" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("a"), { name: "AbortError" })),
    );
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "timeout" });
  });
  it("reports the most informative reason across the chain", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(status(503))
        .mockResolvedValueOnce(status(429))
        .mockResolvedValueOnce(status(503)),
    );
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "quota" });
  });
});

describe("generateDetailed: chain, images, budget", () => {
  it("falls through the chain when the primary is rate limited, and names the model that answered", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-lite-x");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(status(429))
      .mockResolvedValueOnce(reply("from the lite model"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateDetailed(opts)).toEqual({
      ok: true,
      text: "from the lite model",
      model: "gemini-lite-x",
    });
    expect(
      JSON.parse((must(fetchMock.mock.calls[1])[1] as RequestInit).body as string).generationConfig,
    ).not.toHaveProperty("thinkingConfig");
  });
  it("sends images as inline parts after the text, and keeps the key out of the URL", async () => {
    vi.stubEnv("GEMINI_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(reply("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await generateDetailed({ ...opts, images: [{ mimeType: "image/jpeg", data: "QUJD" }] });
    const parts = JSON.parse((must(fetchMock.mock.calls[0])[1] as RequestInit).body as string)
      .contents[0].parts;
    expect(parts[0]).toEqual({ text: "hi" });
    expect(parts[1]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "QUJD" } });
    expect(String(must(fetchMock.mock.calls[0])[0])).not.toContain("secret-key");
    expect((must(fetchMock.mock.calls[0])[1] as RequestInit).headers).toMatchObject({
      "x-goog-api-key": "secret-key",
    });
  });
  it("stops at the global budget and says so", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_BUDGET_PER_MIN", "2");
    const fetchMock = vi.fn().mockResolvedValue(status(503));
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateDetailed(opts)).toEqual({ ok: false, reason: "budget" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("gives up on the whole chain when the overall budget is spent, even if each call is slow", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "k");
    // each call hangs until it is aborted
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          (_u: string, init: RequestInit) =>
            new Promise((_r, rej) =>
              must(init.signal).addEventListener("abort", () =>
                rej(Object.assign(new Error("a"), { name: "AbortError" })),
              ),
            ),
        ),
    );
    const result = generateDetailed({ ...opts, timeoutMs: 8000, budgetMs: 12_000 });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await result).toEqual({ ok: false, reason: "timeout" });
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2); // 8 s + 4 s, not 3 x 8 s
  });
});

describe("structured log", () => {
  it("writes one JSON line per attempt and never the prompt or image", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply("ok")));
    await generateDetailed({
      prompt: "my private question",
      maxTokens: 10,
      kind: "vision",
      images: [{ mimeType: "image/jpeg", data: "SECRETIMAGEDATA" }],
    });
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(must(lines[0]));
    expect(rec).toMatchObject({ evt: "gemini", kind: "vision", ok: true, images: 1 });
    expect(lines[0]).not.toContain("private question");
    expect(lines[0]).not.toContain("SECRETIMAGEDATA");
  });
});

describe("generate (thin wrapper)", () => {
  it("returns the text, or null on any failure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply("hello")));
    expect(await generate(opts)).toBe("hello");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(status(503)));
    expect(await generate(opts)).toBeNull();
  });
});

describe("positiveInt", () => {
  it("accepts whole numbers of at least 1 and falls back for anything else", async () => {
    const { positiveInt } = await import("./gemini");
    expect(positiveInt("12", 40)).toBe(12);
    for (const bad of [undefined, "", "0", "-5", "abc", "2.5", "NaN"])
      expect(positiveInt(bad, 40)).toBe(40);
  });
});
