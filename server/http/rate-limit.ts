import { AppError } from "./errors"

/**
 * Sliding-window rate limiter. The default store is in-process memory, which
 * is correct for a single instance and a reasonable first line of defence
 * behind a load balancer; swap `store` for a Redis-backed implementation
 * (same interface) when running multiple instances.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, number[]>()
  private lastSweep = Date.now()

  async hit(key: string, windowMs: number) {
    const now = Date.now()
    const cutoff = now - windowMs
    const times = (this.buckets.get(key) ?? []).filter((t) => t > cutoff)
    times.push(now)
    this.buckets.set(key, times)
    if (now - this.lastSweep > 60_000) this.sweep(cutoff)
    return { count: times.length, resetAt: times[0] + windowMs }
  }

  private sweep(cutoff: number) {
    this.lastSweep = Date.now()
    for (const [k, v] of this.buckets) {
      const kept = v.filter((t) => t > cutoff)
      if (kept.length === 0) this.buckets.delete(k)
      else this.buckets.set(k, kept)
    }
  }
}

const globalStore = globalThis as unknown as { __arenaPassRateLimit?: RateLimitStore }
const store: RateLimitStore = (globalStore.__arenaPassRateLimit ??= new MemoryStore())

export interface RateLimitRule {
  /** Logical bucket name, e.g. "auth.login". */
  name: string
  limit: number
  windowMs: number
}

export const RATE_LIMITS = {
  login: { name: "auth.login", limit: 10, windowMs: 15 * 60_000 },
  signup: { name: "auth.signup", limit: 5, windowMs: 60 * 60_000 },
  booking: { name: "booking.create", limit: 20, windowMs: 10 * 60_000 },
  validate: { name: "ticket.validate", limit: 120, windowMs: 60_000 },
  publicRead: { name: "public.read", limit: 300, windowMs: 60_000 },
  upload: { name: "media.upload", limit: 30, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>

export async function enforceRateLimit(rule: RateLimitRule, identifier: string) {
  const { count, resetAt } = await store.hit(`${rule.name}:${identifier}`, rule.windowMs)
  if (count > rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    throw new AppError("RATE_LIMITED", "Too many requests. Please slow down and try again shortly.", {
      details: { retryAfter },
    })
  }
}
