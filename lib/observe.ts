/** Route wrapper: a safe request id, one structured log line per request, and a 500 instead of a crash. */
import { NextResponse } from "next/server";

import { logLine } from "./log";

type Handler = (req: Request) => Response | Promise<Response>;

/**
 * A caller-supplied id is kept only if it is short and harmless; anything else is replaced, so logs
 * cannot be forged or flooded.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;
/** The caller's x-request-id if it is safe, otherwise a fresh random id. */
export function requestIdFor(req: Request): string {
  const given = req.headers.get("x-request-id");
  return given && SAFE_ID.test(given) ? given : crypto.randomUUID();
}

/**
 * Wraps an API route so every request is observable and no throw escapes as a bare 500:
 *  - one structured JSON line per request: route, method, status, duration, request id (never the
 * body, question or image);
 *  - an `x-request-id` response header, so a user report can be matched to a log line;
 *  - an unexpected error is logged (name and message only) and answered with a JSON 500 that
 * carries the same id.
 */
export function withObservability(
  route: string,
  handler: Handler,
): (req: Request) => Promise<Response> {
  return async (req) => {
    const id = requestIdFor(req);
    const started = Date.now();
    let res: Response;
    try {
      res = await handler(req);
    } catch (err) {
      const failure = err instanceof Error ? err : new Error(String(err));
      logLine(
        JSON.stringify({
          evt: "error",
          route,
          method: req.method,
          id,
          name: failure.name,
          message: failure.message.slice(0, 300),
        }),
      );
      res = NextResponse.json(
        { error: "Something went wrong on our side. Please try again.", requestId: id },
        { status: 500 },
      );
    }
    try {
      res.headers.set("x-request-id", id);
    } catch {
      /* an immutable response keeps working without the header */
    }
    logLine(
      JSON.stringify({
        evt: "request",
        route,
        method: req.method,
        status: res.status,
        ms: Date.now() - started,
        id,
      }),
    );
    return res;
  };
}
