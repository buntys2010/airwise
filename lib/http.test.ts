import { describe, expect, it } from "vitest";

import { json, readGuarded } from "./http";

const post = (body: string, ip = "1.1.1.1") =>
  new Request("http://x", { method: "POST", headers: { "x-forwarded-for": ip }, body });
const never = () => false;

describe("readGuarded", () => {
  it("returns the parsed body on success", async () => {
    const parsed = await readGuarded(post('{"a":1}'), { limited: never, maxBytes: 100 });
    expect(parsed).toEqual({ ok: true, body: { a: 1 } });
  });
  it("429 when the limiter says so, before reading the body", async () => {
    const parsed = await readGuarded(post("{}"), {
      limited: () => true,
      maxBytes: 100,
      tooMany: "Slow down.",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.res.status).toBe(429);
      expect(await parsed.res.json()).toEqual({ error: "Slow down." });
    }
  });
  it("413 over the size cap, 400 on invalid JSON", async () => {
    const big = await readGuarded(post(`{"a":"${"x".repeat(200)}"}`), {
      limited: never,
      maxBytes: 100,
    });
    expect(!big.ok && big.res.status).toBe(413);
    const bad = await readGuarded(post("{nope"), { limited: never, maxBytes: 100 });
    expect(!bad.ok && bad.res.status).toBe(400);
  });
  it("rejects early with 413 when content-length exceeds maxBytes", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1", "content-length": "9999" },
      body: "{}",
    });
    const res = await readGuarded(req, { limited: never, maxBytes: 100 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.res.status).toBe(413);
  });
  it("limits by the trusted client address", async () => {
    const seen: string[] = [];
    await readGuarded(post("{}", "6.6.6.6, 7.7.7.7"), {
      limited: (k) => {
        seen.push(k);
        return false;
      },
      maxBytes: 100,
    });
    expect(seen).toEqual(["7.7.7.7"]);
  });
});

describe("json", () => {
  it("builds a JSON response with a status", async () => {
    const response = json({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });
});
