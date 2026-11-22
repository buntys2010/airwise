import { NextResponse } from "next/server";
import { clientIp } from "./ratelimit";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

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
  const raw = await req.text();
  if (raw.length > maxBytes) return { ok: false, res: json({ error: "Request too large." }, 413) };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: json({ error: "Send valid JSON." }, 400) };
  }
}
