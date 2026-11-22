import { NextResponse } from "next/server";
import { clientIp } from "./ratelimit";

export const json = (body: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });

export type Parsed = { ok: true; body: unknown } | { ok: false; res: Response };

/**
 * The shared front door for API routes: rate limit by client, cap the body size, parse JSON.
 * Returns either the parsed body or a ready-made error response.
 */
export async function readGuarded(
  req: Request,
  { limited, maxBytes, tooMany = "Too many requests. Try again in a minute." }: { limited: (key: string) => boolean; maxBytes: number; tooMany?: string },
): Promise<Parsed> {
  if (limited(clientIp(req))) return { ok: false, res: json({ error: tooMany }, 429) };

  const cl = req.headers.get("content-length");
  if (cl) {
    const len = parseInt(cl, 10);
    if (Number.isFinite(len) && len > maxBytes) {
      return { ok: false, res: json({ error: "Request too large." }, 413) };
    }
  }

  let raw = "";
  if (req.body && typeof req.body.getReader === "function") {
    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          return { ok: false, res: json({ error: "Request too large." }, 413) };
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } catch {
      return { ok: false, res: json({ error: "Failed to read request body." }, 400) };
    }
  } else {
    raw = await req.text();
    if (raw.length > maxBytes) return { ok: false, res: json({ error: "Request too large." }, 413) };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: json({ error: "Send valid JSON." }, 400) };
  }
}
