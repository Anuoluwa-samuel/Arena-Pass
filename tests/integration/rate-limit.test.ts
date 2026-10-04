import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { enforceRateLimit, sweepRateLimitBuckets } from "@/server/http/rate-limit"

let ctx: Awaited<ReturnType<typeof createTestDb>>
beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  await ctx.client.close()
})

let seq = 0
const rule = () => ({ name: `test.bucket${seq++}`, limit: 3, windowMs: 60_000 })

describe("database rate limiter", () => {
  it("allows up to the limit, then refuses", async () => {
    const r = rule()
    for (let i = 0; i < r.limit; i++) await enforceRateLimit(r, "1.2.3.4")
    await expect(enforceRateLimit(r, "1.2.3.4")).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })

  it("counts each identifier separately", async () => {
    const r = rule()
    for (let i = 0; i < r.limit; i++) await enforceRateLimit(r, "1.2.3.4")
    await expect(enforceRateLimit(r, "5.6.7.8")).resolves.toBeUndefined()
  })

  it("keeps an exact count under a parallel burst", async () => {
    const r = rule()
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => enforceRateLimit(r, "burst")))
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(r.limit)
    const row = await ctx.db.query.rateLimitBuckets.findFirst({ where: eq(schema.rateLimitBuckets.key, `${r.name}:burst`) })
    expect(row?.count).toBe(10)
  })

  it("starts a fresh window once the old one has closed", async () => {
    const r = rule()
    for (let i = 0; i < r.limit; i++) await enforceRateLimit(r, "x")
    await ctx.db
      .update(schema.rateLimitBuckets)
      .set({ resetAt: new Date(Date.now() - 1000) })
      .where(eq(schema.rateLimitBuckets.key, `${r.name}:x`))
    await expect(enforceRateLimit(r, "x")).resolves.toBeUndefined()
    const row = await ctx.db.query.rateLimitBuckets.findFirst({ where: eq(schema.rateLimitBuckets.key, `${r.name}:x`) })
    expect(row?.count).toBe(1)
  })

  it("sweeps closed windows and leaves open ones", async () => {
    const closed = rule()
    const open = rule()
    await enforceRateLimit(closed, "s")
    await enforceRateLimit(open, "s")
    await ctx.db
      .update(schema.rateLimitBuckets)
      .set({ resetAt: new Date(Date.now() - 1000) })
      .where(eq(schema.rateLimitBuckets.key, `${closed.name}:s`))
    expect(await sweepRateLimitBuckets()).toBeGreaterThanOrEqual(1)
    const rows = await ctx.db.query.rateLimitBuckets.findMany()
    expect(rows.map((x) => x.key)).toContain(`${open.name}:s`)
    expect(rows.map((x) => x.key)).not.toContain(`${closed.name}:s`)
  })
})
