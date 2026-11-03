// Minimal in-memory fixed-window limiter. Docs runs as a single container, so process
// memory is enough. A null key (no trusted client IP header) is never limited.
export function createRateLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: {
  max: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function prune(t: number) {
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    // Still full of live entries: drop the oldest to stay bounded.
    while (hits.size >= maxKeys) {
      const first = hits.keys().next().value;
      if (first === undefined) break;
      hits.delete(first);
    }
  }

  return {
    check(key: string | null): boolean {
      if (!key) return true;
      const t = now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        if (!entry && hits.size >= maxKeys) prune(t);
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    retryAfterSeconds(key: string): number {
      const entry = hits.get(key);
      return entry ? Math.max(1, Math.ceil((entry.resetAt - now()) / 1000)) : 1;
    },
    size: () => hits.size,
  };
}
