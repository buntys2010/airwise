import { NextResponse } from "next/server";

import { clientIp } from "./ratelimit";

/** A JSON response with a status and optional headers. */
export const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers });

export type Parsed = { ok: true; body: unknown } | { ok: false; res: Response };

/** Reads a body stream as text, giving up (null) as soon as it passes `maxBytes`. */
async function readLimited(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined); // already over the limit: a failed cancel changes nothing
      return null;
    }
    raw += decoder.decode(value, { stream: true });
  }
  return raw + decoder.decode();
}

/**
 * The shared front door for API routes: rate limit by client, cap the body size, parse JSON.
 * Returns either the parsed body or a ready-made error response.
 */
export async function readGuarded(
  req: Request,
  {
    limited,
    maxBytes,
    tooMany = "Too many requests. Try again in a minute.",
  }: { limited: (key: string) => boolean; maxBytes: number; tooMany?: string },
): Promise<Parsed> {
  if (limited(clientIp(req))) return { ok: false, res: json({ error: tooMany }, 429) };

  const cl = req.headers.get("content-length");
  if (cl) {
    const len = Number.parseInt(cl, 10);
    if (Number.isFinite(len) && len > maxBytes) {
      return { ok: false, res: json({ error: "Request too large." }, 413) };
    }
  }

  const tooLarge = { ok: false, res: json({ error: "Request too large." }, 413) } as const;
  let raw: string;
  if (req.body && typeof req.body.getReader === "function") {
    try {
      const read = await readLimited(req.body, maxBytes);
      if (read === null) return tooLarge;
      raw = read;
    } catch {
      return { ok: false, res: json({ error: "Failed to read request body." }, 400) };
    }
  } else {
    raw = await req.text();
    if (raw.length > maxBytes) return tooLarge;
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: json({ error: "Send valid JSON." }, 400) };
  }
}
