/**
 * Fixed-window rate limiter for auth endpoints.
 *
 * NOTE: in-process, so the budget is per server instance. That is fine for a
 * single Vercel region under light load, and wrong the moment we scale out —
 * move to Redis (Upstash) before this is used in anger.
 */
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Keeps the map from growing without bound in a long-lived process. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000).unref?.();
