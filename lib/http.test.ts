import { describe, expect, it } from "vitest";
import { json, readGuarded } from "./http";

const post = (body: string, ip = "1.1.1.1") =>
  new Request("http://x", { method: "POST", headers: { "x-forwarded-for": ip }, body });
const never = () => false;

describe("readGuarded", () => {
  it("returns the parsed body on success", async () => {
    const r = await readGuarded(post('{"a":1}'), { limited: never, maxBytes: 100 });
    expect(r).toEqual({ ok: true, body: { a: 1 } });
  });
  it("429 when the limiter says so, before reading the body", async () => {
    const r = await readGuarded(post("{}"), {
      limited: () => true,
      maxBytes: 100,
      tooMany: "Slow down.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.res.status).toBe(429);
      expect(await r.res.json()).toEqual({ error: "Slow down." });
    }
  });
  it("413 over the size cap, 400 on invalid JSON", async () => {
    const big = await readGuarded(post('{"a":"' + "x".repeat(200) + '"}'), {
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
    const r = json({ ok: true }, 201);
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true });
  });
});
