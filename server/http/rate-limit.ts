import { lt, sql } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { AppError } from "./errors"

/**
 * Fixed-window rate limiter backed by the database. An in-process counter is
 * no defence on a serverless host: each warm instance keeps its own count and
 * a cold start forgets it, so the effective limit grows with traffic. One
 * upsert per hit keeps the count shared and atomic across instances.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
}

class DatabaseStore implements RateLimitStore {
  async hit(key: string, windowMs: number) {
    const database = await db()
    const now = new Date()
    const resetAt = new Date(now.getTime() + windowMs)
    const t = schema.rateLimitBuckets
    // A lapsed window restarts at 1 in the same statement, so two requests
    // racing on an expired bucket can't both see a fresh count.
    const [row] = await database
      .insert(t)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({
        target: t.key,
        set: {
          count: sql`case when ${t.resetAt} <= ${now} then 1 else ${t.count} + 1 end`,
          resetAt: sql`case when ${t.resetAt} <= ${now} then ${resetAt} else ${t.resetAt} end`,
        },
      })
      .returning({ count: t.count, resetAt: t.resetAt })
    return { count: row.count, resetAt: row.resetAt.getTime() }
  }
}

const store: RateLimitStore = new DatabaseStore()

/** Housekeeping: drop buckets whose window has closed. */
export async function sweepRateLimitBuckets() {
  const database = await db()
  const removed = await database
    .delete(schema.rateLimitBuckets)
    .where(lt(schema.rateLimitBuckets.resetAt, new Date()))
    .returning({ key: schema.rateLimitBuckets.key })
  return removed.length
}

export interface RateLimitRule {
  /** Logical bucket name, e.g. "auth.login". */
  name: string
  limit: number
  windowMs: number
}

export const RATE_LIMITS = {
  login: { name: "auth.login", limit: 10, windowMs: 15 * 60_000 },
  signup: { name: "auth.signup", limit: 5, windowMs: 60 * 60_000 },
  passwordResetRequest: { name: "auth.password_reset.request", limit: 5, windowMs: 15 * 60_000 },
  // Six digits is a small space: without a tight bucket, guessing is feasible.
  twoFactor: { name: "auth.two_factor", limit: 8, windowMs: 15 * 60_000 },
  passwordResetSubmit: { name: "auth.password_reset.submit", limit: 10, windowMs: 15 * 60_000 },
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
