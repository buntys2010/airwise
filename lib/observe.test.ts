import { afterEach, describe, expect, it } from "vitest";

import { must } from "../test-support/must";
import { requestIdFor, setRequestLogSink, withObservability } from "./observe";

const lines: string[] = [];
setRequestLogSink((l) => lines.push(l));
afterEach(() => {
  lines.length = 0;
});
const req = (headers: Record<string, string> = {}) =>
  new Request("http://x/api/t", { method: "POST", headers });

describe("withObservability", () => {
  it("logs one structured line per request and sets x-request-id", async () => {
    const res = await withObservability("t", () => Response.json({ ok: true }, { status: 201 }))(
      req(),
    );
    expect(res.status).toBe(201);
    const id = must(res.headers.get("x-request-id"));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(must(lines[0]))).toMatchObject({
      evt: "request",
      route: "t",
      method: "POST",
      status: 201,
      id,
    });
    expect(typeof JSON.parse(must(lines[0])).ms).toBe("number");
  });

  it("turns a thrown error into a JSON 500 with the request id, and logs it without leaking the stack", async () => {
    const res = await withObservability("t", () => {
      throw new Error("boom");
    })(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/try again/i);
    expect(body.requestId).toBe(res.headers.get("x-request-id"));
    const logged = lines.map((l) => JSON.parse(l));
    expect(logged[0]).toMatchObject({ evt: "error", route: "t", name: "Error", message: "boom" });
    expect(JSON.stringify(logged)).not.toContain("at ");
    expect(logged[1]).toMatchObject({ evt: "request", status: 500 });
  });

  it("handles a rejected promise the same way", async () => {
    const res = await withObservability("t", () => {
      return Promise.reject(new TypeError("bad"));
    })(req());
    expect(res.status).toBe(500);
  });

  it("keeps a safe caller id and replaces an unsafe one", () => {
    expect(requestIdFor(req({ "x-request-id": "abc12345-def" }))).toBe("abc12345-def");
    expect(requestIdFor(req({ "x-request-id": "bad id with spaces" }))).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFor(req({ "x-request-id": "x".repeat(200) }))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
