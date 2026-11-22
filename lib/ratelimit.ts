/**
 * Small in-memory limiters. Enough to blunt abuse on one or two instances (see docs/deploy.md for the max-instances cap);
 * use the platform WAF or a shared store if the app is scaled out.
 */

const lastOf = (times: number[]): number => times.at(-1) ?? 0;

/** Sliding-window limiter per key. Stale keys are evicted by age, so a flood of new keys cannot wipe an attacker's own counter. */
export function createLimiter(limit: number, windowMs: number, maxKeys = 2000) {
  const hits = new Map<string, number[]>();

  function evict(now: number) {
    for (const [k, times] of hits) if (now - lastOf(times) >= windowMs) hits.delete(k);
    // Still over the cap: drop the least active keys first (fewest hits, then oldest), so one-off flood keys go before a busy or blocked client.
    if (hits.size > maxKeys) {
      const order = [...hits.entries()].sort(
        (a, b) => a[1].length - b[1].length || lastOf(a[1]) - lastOf(b[1]),
      );
      for (const [k] of order.slice(0, hits.size - maxKeys)) hits.delete(k);
    }
  }

  return function limited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > maxKeys) evict(now);
    return recent.length > limit;
  };
}

/** A global call budget (for example Gemini requests a minute) shared by every client. The limit is read on each call. */
export function createBudget(getLimit: () => number, windowMs: number) {
  let stamps: number[] = [];
  return {
    /** Returns true and spends one unit if the budget allows it. */
    take(): boolean {
      const now = Date.now();
      stamps = stamps.filter((t) => now - t < windowMs);
      if (stamps.length >= getLimit()) return false;
      stamps.push(now);
      return true;
    },
    reset() {
      stamps = [];
    },
  };
}

const IP_RE = /^[0-9a-fA-F:.[\]%_-]{1,64}$/;

/** Validates and bounds an IP address string to prevent memory bloat and injection in key lookups. */
function sanitizeIp(ip: string | undefined | null): string {
  if (!ip) return "local";
  const trimmed = ip.trim();
  if (trimmed.length > 64) return "invalid";
  return IP_RE.test(trimmed) ? trimmed : "invalid";
}

/**
 * The client address as seen by the nearest trusted proxy: the LAST X-Forwarded-For entry.
 * Earlier entries are supplied by the caller and can be spoofed, so they are ignored.
 * The app is meant to run behind one proxy (Cloud Run, Vercel); see docs/deploy.md.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const last = xff
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  const raw = last || req.headers.get("x-real-ip")?.trim();
  return sanitizeIp(raw);
}
