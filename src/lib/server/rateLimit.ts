/**
 * Tiny in-memory sliding-window rate limiter for public endpoints (review submissions, helpful votes).
 * Per server instance only: good enough for one Node process; move to Redis/Upstash when we scale out.
 */
const hits = new Map<string, number[]>()

export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return true
}

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export const clientIp = (headers: Headers) => (headers.get('x-forwarded-for') ?? headers.get('x-real-ip') ?? '').split(',')[0].trim() || 'local'
